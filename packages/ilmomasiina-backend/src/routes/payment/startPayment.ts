import { and, eq } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import moment from "moment";
import { Stripe } from "stripe";

import {
  AuditEvent,
  PaymentMode,
  PaymentStatus,
  SignupID,
  SignupPathParams,
  SignupStatus,
  StartPaymentResponse,
} from "@tietokilta/ilmomasiina-models";
import type { AuditLogger } from "../../auditlog";
import config from "../../config";
import { getDb } from "../../db";
import { paymentTable, signupTable } from "../../db/schema";
import { databaseErrorCode, RAISE_EXCEPTION, UNIQUE_VIOLATION } from "../../models/errors";
import type { Event } from "../../models/event";
import type { Payment } from "../../models/payment";
import { activeSignupCondition, activeSignupFilter, hasPrice, Signup } from "../../models/signup";
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

/** The fields of an event needed for creating a payment. */
type PaymentEvent = Pick<Event, "id" | "title" | "preferredFrontend">;

function validateSignupStatusForPayment(signup: Pick<Signup, "confirmedAt" | "price" | "status">) {
  if (!signup.confirmedAt) {
    throw new SignupNotConfirmed("Signup must be confirmed before payment");
  }
  if (!hasPrice(signup)) {
    throw new PaymentNotRequired("This signup does not require payment");
  }
  if (signup.status !== SignupStatus.IN_QUOTA && signup.status !== SignupStatus.IN_OPEN_QUOTA) {
    throw new SignupInQueue("Cannot pay while in queue");
  }
}

/** Create a new Payment and Stripe checkout session from the given signup. */
async function createPayment(signupId: SignupID, event: PaymentEvent, auditLogger: AuditLogger): Promise<string> {
  const expiresAt = moment().add(config.stripeCheckoutExpiryMins, "minutes");
  // Stripe requires at least 30 minutes expiry; add some buffer for making the request.
  if (config.stripeCheckoutExpiryMins === 30) expiresAt.add(30, "seconds");

  // Create payment record in CREATING state with fresh signup data.
  let payment: Payment;
  let signup: Signup;
  try {
    [payment, signup] = await getDb().transaction(async (transaction) => {
      // Re-fetch signup with FOR UPDATE lock
      // This waits if a signup update is in progress (holding the lock)
      const [freshSignup] = await transaction
        .select()
        .from(signupTable)
        .where(and(eq(signupTable.id, signupId), activeSignupCondition()))
        .for("update");
      if (!(freshSignup as Signup | undefined)) {
        throw new NoSuchSignup("Signup not found");
      }

      // Revalidate signup state now that we have the lock, to avoid race conditions
      validateSignupStatusForPayment(freshSignup);

      // Create Payment with fresh data
      const [newPayment] = await transaction
        .insert(paymentTable)
        .values({
          signupId,
          amount: freshSignup.price!,
          currency: freshSignup.currency!,
          products: freshSignup.products!,
          expiresAt: expiresAt.toDate(),
        })
        .returning();
      return [newPayment, freshSignup] as const;
    });
  } catch (error) {
    // Unique constraint violation means another request already created a payment.
    if (databaseErrorCode(error) === UNIQUE_VIOLATION) {
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
    await getDb()
      .update(paymentTable)
      .set({ status: PaymentStatus.CREATION_FAILED })
      .where(eq(paymentTable.id, payment.id));
    throw error;
  }

  // Transition to PENDING and log audit event in same transaction.
  try {
    await getDb().transaction(async (transaction) => {
      // This can fail if a concurrent signup update has marked it CREATION_FAILED.
      // Intentionally don't filter on current status so we can get a trigger error instead of a silent ignore.
      await transaction
        .update(paymentTable)
        .set({ status: PaymentStatus.PENDING, stripeCheckoutSessionId: session.id })
        .where(eq(paymentTable.id, payment.id));
      await auditLogger(AuditEvent.START_PAYMENT, { signup, event, transaction });
    });
  } catch (error) {
    if (databaseErrorCode(error) === RAISE_EXCEPTION) {
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
async function handlePendingPayment(
  signupId: SignupID,
  payment: Payment,
  event: PaymentEvent,
  auditLogger: AuditLogger,
): Promise<string> {
  const session = await refreshCheckoutSession(payment, auditLogger);

  switch (session.status) {
    case "complete":
      throw new SignupAlreadyPaid("This signup has already been paid");
    case "expired":
      // Try to create a new payment. Throws 409 in case requests race.
      return createPayment(signupId, event, auditLogger);
    case "open":
      // Session still valid, return its URL
      return session.url!;
    case null:
      throw new Error("Stripe session has null status");
    default:
      throw new Error(`Unhandled Stripe session status: ${session.status satisfies never}`);
  }
}

/** Get or create a payment for the signup. Returns payment URL. */
async function getOrCreatePayment(signupId: SignupID, auditLogger: AuditLogger): Promise<string> {
  // Load the signup with its active payment and event
  const signup = await getDb().query.signup.findFirst({
    where: { AND: [activeSignupFilter(), { id: signupId }] },
    with: {
      activePayment: true,
      quota: {
        columns: { id: true },
        with: { event: { columns: { id: true, title: true, payments: true, preferredFrontend: true } } },
      },
    },
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
    return createPayment(signupId, event, auditLogger);
  }

  const payment = signup.activePayment;
  switch (payment.status) {
    case PaymentStatus.PAID:
      throw new SignupAlreadyPaid("This signup has already been paid");

    case PaymentStatus.PENDING:
      return handlePendingPayment(signupId, payment, event, auditLogger);

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
  const paymentUrl = await getOrCreatePayment(request.params.id, request.logEvent);
  reply.status(200);
  return { paymentUrl };
}
