import { FastifyReply, FastifyRequest } from "fastify";
import moment from "moment";
import { DatabaseError as PgDatabaseError } from "pg";
import { DatabaseError, Transaction, UniqueConstraintError } from "sequelize";
import Stripe from "stripe";

import {
  PaymentMode,
  PaymentStatus,
  SignupID,
  SignupPathParams,
  SignupStatus,
  StartPaymentResponse,
} from "@tietokilta/ilmomasiina-models";
import config from "../../config";
import { getSequelize } from "../../models";
import { Event } from "../../models/event";
import { Payment } from "../../models/payment";
import { Quota } from "../../models/quota";
import { Signup } from "../../models/signup";
import { NoSuchSignup } from "../signups/errors";
import {
  OnlinePaymentsDisabled,
  PaymentInProgress,
  PaymentNotRequired,
  SignupAlreadyPaid,
  SignupInQueue,
  SignupNotConfirmed,
} from "./errors";
import { createCheckoutSession, getStripe, refreshCheckoutSession } from "./stripe";

function validateSignupStatusForPayment(signup: Signup) {
  if (!signup.confirmedAt) {
    throw new SignupNotConfirmed("Signup must be confirmed before payment");
  }
  if (!signup.hasPrice) {
    throw new PaymentNotRequired("This signup does not require payment");
  }
  if (signup.status !== SignupStatus.IN_QUOTA && signup.status !== SignupStatus.IN_OPEN_QUOTA) {
    throw new SignupInQueue("Cannot pay while in queue");
  }
}

/** Create a new Payment and Stripe checkout session from the given signup. */
async function createPayment(signupId: SignupID, event: Event): Promise<string> {
  const expiresAt = moment().add(config.stripeCheckoutExpiryMins, "minutes");
  // Stripe requires at least 30 minutes expiry; add some buffer for making the request.
  if (config.stripeCheckoutExpiryMins === 30) expiresAt.add(30, "seconds");

  // Create payment record in CREATING state with fresh signup data.
  let payment: Payment;
  let signup: Signup;
  try {
    [payment, signup] = await getSequelize().transaction(async (transaction) => {
      // Re-fetch signup with FOR UPDATE lock
      // This waits if a signup update is in progress (holding the lock)
      const freshSignup = await Signup.scope("active").findByPk(signupId, {
        transaction,
        lock: Transaction.LOCK.UPDATE,
      });
      if (!freshSignup) {
        throw new NoSuchSignup("Signup not found");
      }

      // Revalidate signup state now that we have the lock, to avoid race conditions
      validateSignupStatusForPayment(freshSignup);

      // Create Payment with fresh data
      const newPayment = await Payment.create(
        {
          signupId,
          amount: freshSignup.price!,
          currency: freshSignup.currency!,
          products: freshSignup.products!,
          expiresAt: expiresAt.toDate(),
        },
        { transaction },
      );
      return [newPayment, freshSignup];
    });
  } catch (error) {
    // Unique constraint violation means another request already created a payment.
    if (error instanceof UniqueConstraintError) {
      throw new PaymentInProgress("Payment creation already in progress");
    }
    throw error;
  }

  // Create checkout session in Stripe (outside transaction - no locks held).
  let session: Stripe.Checkout.Session;
  try {
    session = await createCheckoutSession(signup, payment, event.preferredFrontend);
  } catch (error) {
    // Mark as failed - user can retry by starting a new payment
    await Payment.update({ status: PaymentStatus.CREATION_FAILED }, { where: { id: payment.id } });
    throw error;
  }

  // Transition to PENDING.
  try {
    await Payment.update(
      { status: PaymentStatus.PENDING, stripeCheckoutSessionId: session.id },
      // This can fail if a concurrent signup update has marked it CREATION_FAILED.
      // Intentionally don't filter on current status so we can get a trigger error instead of a silent ignore.
      { where: { id: payment.id } },
    );
  } catch (error) {
    if (error instanceof DatabaseError && (error.parent as PgDatabaseError).code === "P0001") {
      throw new PaymentInProgress("Payment creation failed due to concurrent update");
    }
    throw error;
  }

  return session.url!;
}

/**
 * Handle an existing payment in PENDING state.
 * Checks the Stripe session status and either returns the URL (pending) or marks the payment as paid/expired.
 * If expired, creates a new payment.
 */
async function handlePendingPayment(signupId: SignupID, payment: Payment, event: Event): Promise<string> {
  const session = await refreshCheckoutSession(payment);

  switch (session.status!) {
    case "complete":
      throw new SignupAlreadyPaid("This signup has already been paid");
    case "expired":
      // Try to create a new payment. Throws 409 in case requests race.
      return createPayment(signupId, event);
    case "open":
      // Session still valid, return its URL
      return session.url!;
    case null:
      throw new Error("Stripe session has null status");
    default:
      throw new Error(`Unhandled Stripe session status: ${session.status! satisfies never}`);
  }
}

/** Get or create a payment for the signup. Returns payment URL. */
async function getOrCreatePayment(signupId: SignupID): Promise<string> {
  // Load the signup with its active payment and event
  const signup = await Signup.scope("active").findByPk(signupId, {
    include: [
      {
        model: Payment.scope("active"),
        as: "activePayment",
        required: false,
      },
      {
        model: Quota,
        include: [
          {
            model: Event,
            attributes: ["payments", "preferredFrontend"],
          },
        ],
      },
    ],
  });
  if (!signup || !signup.quota || !signup.quota.event) {
    throw new NoSuchSignup("Signup not found");
  }
  const { event } = signup.quota;

  // Validate signup state to avoid taking the lock unnecessarily - will be revalidated by createPayment() when locked
  if (signup.quota.event.payments !== PaymentMode.ONLINE) {
    throw new OnlinePaymentsDisabled("Online payments are not enabled for this event");
  }
  validateSignupStatusForPayment(signup);

  if (!signup.activePayment) {
    // No active payment - create a new one. Throws 409 in case requests race.
    return createPayment(signupId, event);
  }

  const payment = signup.activePayment;
  switch (payment.status) {
    case PaymentStatus.PAID:
      throw new SignupAlreadyPaid("This signup has already been paid");

    case PaymentStatus.PENDING:
      return handlePendingPayment(signupId, payment, event);

    case PaymentStatus.CREATING:
      // Another request is creating this payment - race condition.
      // TODO: We could retry here with an idempotency key if the payment is new enough, though
      //  this should only occur in races (user error) and server crashes.
      throw new PaymentInProgress("Payment creation already in progress");

    case PaymentStatus.CREATION_FAILED:
    case PaymentStatus.EXPIRED:
    case PaymentStatus.REFUNDED:
      // These should not be returned by the "active" scope, but handle defensively
      throw new Error(`Invalid active payment status: ${payment.status}`);
    default:
      throw new Error(`Unknown payment status: ${payment.status satisfies never}`);
  }
}

/** Requires editTokenVerification */
export default async function startPayment(
  request: FastifyRequest<{ Params: SignupPathParams }>,
  reply: FastifyReply,
): Promise<StartPaymentResponse> {
  // Fail fast if payments are globally disabled.
  getStripe();
  const paymentUrl = await getOrCreatePayment(request.params.id);
  reply.status(200);
  return { paymentUrl };
}
