import moment from "moment";
import { DatabaseError as PgDatabaseError } from "pg";
import { DatabaseError, Transaction } from "sequelize";
import Stripe from "stripe";

import { PaymentStatus, SignupID } from "@tietokilta/ilmomasiina-models";
import config, { completePaymentUrl } from "../../config";
import { sendPaymentConfirmationMail } from "../../mail/signupConfirmation";
import { Payment } from "../../models/payment";
import { Signup } from "../../models/signup";
import { generateToken } from "../signups/editTokens";
import { OnlinePaymentsDisabled, PaymentInProgress, PaymentRateLimited, SignupAlreadyPaid } from "./errors";

/** Pre-initialized Stripe client, or null if not configured. */
const stripeClient: Stripe | null = config.stripeSecretKey
  ? new Stripe(config.stripeSecretKey, {
      apiVersion: "2025-12-15.clover",
      typescript: true,
    })
  : null;

/** Get the Stripe client. Throws if not configured. */
export function getStripe(): Stripe {
  if (!stripeClient) {
    throw new OnlinePaymentsDisabled("Online payments are not enabled on this server");
  }
  return stripeClient;
}

/** Create a Stripe Checkout Session for a Payment. */
export async function createCheckoutSession(signup: Signup, payment: Payment): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe();

  // TODO: This should come from the Payment to allow idempotent retries.
  const language = signup.language ?? config.defaultLanguage;
  const editToken = generateToken(signup.id);
  const returnUrl = completePaymentUrl({ id: signup.id, editToken, lang: language });

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = payment.products.map((product) => ({
    price_data: {
      currency: payment.currency.toLowerCase(),
      product_data: {
        name: product.name,
      },
      unit_amount: product.unitPrice,
    },
    quantity: product.amount,
  }));

  try {
    return await stripe.checkout.sessions.create({
      mode: "payment",
      ui_mode: "hosted",
      line_items: lineItems,
      allow_promotion_codes: true,
      // TODO: This should come from the Payment to allow idempotent retries.
      customer_email: signup.email ?? undefined,
      success_url: returnUrl,
      cancel_url: returnUrl,
      expires_at: moment(payment.expiresAt).unix(),
      branding_settings: config.stripeBranding,
      metadata: {
        signupId: payment.signupId,
        paymentId: String(payment.id),
      },
    });
  } catch (err) {
    if (err instanceof Stripe.errors.StripeRateLimitError) {
      throw new PaymentRateLimited("Rate limit exceeded");
    }
    throw err;
  }
}

/** Updates the Payment for a given Stripe Checkout Session ID and status and performs side effects. */
export async function checkoutSessionStatusUpdated(
  sessionId: Stripe.Checkout.Session["id"],
  status: Stripe.Checkout.Session.Status | null,
): Promise<void> {
  // Be defensive; the sessionId comes directly from an API, so don't mess up the DB just
  // in case the TypeScript fails we end up with an undefined sessionId somehow.
  if (!sessionId) throw new Error("Invalid Stripe session ID");

  switch (status) {
    case "complete": {
      // Payment completed but we haven't processed the webhook yet.
      // Use WHERE to ensure we only perform side effects once.
      const [changed, updatedPayments] = await Payment.update(
        { status: PaymentStatus.PAID, completedAt: new Date() },
        {
          where: { stripeCheckoutSessionId: sessionId, status: PaymentStatus.PENDING },
          returning: true,
        },
      );
      if (changed) {
        // Side effects: send confirmation email
        await sendPaymentConfirmationMail(updatedPayments[0]);
      }
      break;
    }

    case "expired": {
      // Payment expired but we haven't processed the webhook yet.
      // Use WHERE to ensure we only perform side effects once.
      const [changed] = await Payment.update(
        { status: PaymentStatus.EXPIRED },
        { where: { stripeCheckoutSessionId: sessionId, status: PaymentStatus.PENDING } },
      );
      if (changed) {
        // TODO: Side effects: expire signup, etc?
      }
      break;
    }

    case "open":
      // Payment open, keep as is.
      break;

    case null:
      throw new Error("Stripe session has null status");
    default:
      throw new Error(`Unhandled Stripe session status: ${status satisfies never}`);
  }
}

/**
 * Refresh the status of an existing payment in PENDING state.
 * Checks the Stripe session status marks the payment as paid/expired as applicable.
 */
export async function refreshCheckoutSession(payment: Payment): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe();
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(payment.stripeCheckoutSessionId!);
  } catch (err) {
    if (err instanceof Stripe.errors.StripeRateLimitError) {
      throw new PaymentRateLimited("Rate limit exceeded");
    }
    throw err;
  }
  await checkoutSessionStatusUpdated(session.id, session.status);
  return session;
}

/**
 * Attempts to expire an existing payment for a signup update.
 *
 * For PENDING payments, expires the Stripe Checkout Session first, then marks as EXPIRED in database.
 * For CREATING payments, marks them as CREATION_FAILED (causing transition to PENDING to fail).
 *
 * Errors from concurrent state changes are ignored. This function is only best-effort; the actual
 * check for conflicting payments is done in updateExistingSignup() once a lock is held.
 */
export async function expirePaymentForSignupUpdate(payment: Payment): Promise<void> {
  const stripe = getStripe();
  switch (payment.status) {
    case PaymentStatus.PENDING:
      // Expire PENDING payments in Stripe first, then mark as EXPIRED in DB.
      try {
        await stripe.checkout.sessions.expire(payment.stripeCheckoutSessionId!);
      } catch (err) {
        if (
          err instanceof Stripe.errors.StripeInvalidRequestError ||
          err instanceof Stripe.errors.StripeRateLimitError
        ) {
          // The sessions is likely already complete or expired, just not up to date in our DB.
          // Ignore it now and fail later when we check for conflicting payments.
          console.error("Failed to expire checkout session for updating signup:", err);
          return;
        }
        throw err;
      }
      // We managed to expire the session, now mark the payment as EXPIRED.
      // Nothing else should be changing it to PAID, so this should always succeed.
      await Payment.update({ status: PaymentStatus.EXPIRED }, { where: { id: payment.id } });
      break;

    case PaymentStatus.CREATING:
      // Mark CREATING payments as CREATION_FAILED
      // This will cause the transition to PENDING to fail on the payment creation side.
      try {
        await Payment.update(
          { status: PaymentStatus.CREATION_FAILED },
          // This can fail if the payment creation wins the race.
          // Intentionally don't filter on current status so we can get a trigger error instead of a silent ignore.
          { where: { id: payment.id } },
        );
      } catch (error) {
        if (error instanceof DatabaseError && (error.parent as PgDatabaseError).code === "P0001") {
          // Also ignore now and fail later when we check for conflicting payments.
          console.error("Failed to expire CREATING payment for updating signup:", error);
          return;
        }
        throw error;
      }
      break;

    case PaymentStatus.PAID:
      // Nothing to do, fail later if necessary when checking for conflicting payments.
      break;

    case PaymentStatus.EXPIRED:
    case PaymentStatus.CREATION_FAILED:
    case PaymentStatus.REFUNDED:
      // These should not be returned by the "active" scope, but handle defensively
      throw new Error(`Invalid active payment status: ${payment.status}`);
    default:
      throw new Error(`Unknown payment status: ${payment.status satisfies never}`);
  }
}

/**
 * Attempts to expire any existing payments for a signup.
 *
 * For PENDING payments, expires the Stripe Checkout Session first, then marks as EXPIRED in database.
 * For CREATING payments, marks them as CREATION_FAILED (causing transition to PENDING to fail).
 *
 * Errors from concurrent state changes are ignored. This function is only best-effort; the actual
 * check for conflicting payments is done in updateExistingSignup() once a lock is held.
 */
export async function expireExistingPaymentsForSignupUpdate(signupId: SignupID): Promise<void> {
  // Find any active payments
  const activePayments = await Payment.scope("active").findAll({
    where: { signupId },
  });

  // There should only ever be one active payment, but handle all just in case.
  await Promise.all(
    activePayments.map(async (payment) => {
      await expirePaymentForSignupUpdate(payment);
      // Note: PAID payments are left as-is. The price comparison check in updateExistingSignup()
      // will determine if the update is allowed based on whether the price changes.
    }),
  );
}

/** Checks for any active payments on a signup. Expects to be called with a lock held on the signup. */
export async function checkForConflictingPaymentsForSignupUpdate(
  signup: Signup,
  transaction: Transaction,
  ignorePaid = false,
): Promise<void> {
  const conflictingPayment = await signup.getActivePayment({ transaction });
  // Since we hold the lock on the signup and startPayment() also attempts to do so,
  // we know there are no uncommitted payments about to be created that this couldn't see.

  if (conflictingPayment?.status === PaymentStatus.PAID) {
    // Admins can edit paid signups with ignorePaid=true.
    if (!ignorePaid) {
      // TODO: Allow cancelling after payment with manual refunds.
      throw new SignupAlreadyPaid("This signup has already been paid");
    }
  } else if (conflictingPayment) {
    throw new PaymentInProgress("Active payment exists for this signup");
  }
}
