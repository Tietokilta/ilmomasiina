import { and, gt, isNotNull, isNull, or } from "drizzle-orm";
import moment from "moment";

import { ManualPaymentStatus, PaymentStatus, SignupPaymentStatus } from "@tietokilta/ilmomasiina-models";
import config from "../config";
import type { Filter } from "../db";
import { signupTable } from "../db/schema";
import type { Payment } from "./payment";

export type Signup = typeof signupTable.$inferSelect;
export type SignupInsert = typeof signupTable.$inferInsert;

export const MAX_NAME_LENGTH = 255;
export const MAX_EMAIL_LENGTH = 255; // TODO

/** Gets whether this signup has been confirmed (i.e. filled in after creation). */
export function isConfirmed(signup: Pick<Signup, "confirmedAt">): boolean {
  return signup.confirmedAt != null;
}

/** Gets the time this signup must be confirmed by before it expires. */
export function confirmableUntil(signup: Pick<Signup, "createdAt">): Date {
  return new Date(signup.createdAt.getTime() + config.signupConfirmMins * 60 * 1000);
}

/** Gets the time this signup is editable until, regardless of signups closing. */
export function editableAtLeastUntil(signup: Pick<Signup, "createdAt">): Date {
  return config.signupConfirmAfterClose
    ? new Date(signup.createdAt.getTime() + config.signupConfirmMins * 60 * 1000)
    : signup.createdAt;
}

export function hasPrice(signup: Pick<Signup, "price">): boolean {
  return signup.price != null && signup.price > 0;
}

/** Computes the payment status of a signup from its payments. */
export function effectivePaymentStatus(
  signup: Pick<Signup, "price" | "manualPaymentStatus">,
  payments: Pick<Payment, "status">[],
): SignupPaymentStatus | null {
  // Find payments by status
  const paidPayment = payments.some((p) => p.status === PaymentStatus.PAID);
  const refundedPayment = payments.some((p) => p.status === PaymentStatus.REFUNDED);

  // If paid online or manually, it's paid
  if (paidPayment || signup.manualPaymentStatus === ManualPaymentStatus.PAID) return SignupPaymentStatus.PAID;
  // If refunded online or manually, it's refunded
  if (refundedPayment || signup.manualPaymentStatus === ManualPaymentStatus.REFUNDED)
    return SignupPaymentStatus.REFUNDED;
  // If no need to pay, don't check further
  if (!hasPrice(signup)) return null;
  // If the signup has a price but no payment, it's pending (regardless of if payments exist)
  return SignupPaymentStatus.PENDING;
}

const unconfirmedSince = () => moment().subtract(config.signupConfirmMins, "minutes").toDate();

/** SQL condition for signups that are not deleted and are confirmed or still confirmable. */
export function activeSignupCondition(
  table: Pick<typeof signupTable, "deletedAt" | "confirmedAt" | "createdAt"> = signupTable,
) {
  return and(
    // Not deleted
    isNull(table.deletedAt),
    // Is confirmed, or is new enough
    or(isNotNull(table.confirmedAt), gt(table.createdAt, unconfirmedSince())),
  )!;
}

/** Relational query filter matching `activeSignupCondition`. */
export function activeSignupFilter(): Filter<"signup"> {
  return { RAW: (table) => activeSignupCondition(table) };
}

/** Relational query filter for the signups admins see: active ones, plus all deleted ones. */
export function adminSignupFilter(): Filter<"signup"> {
  return {
    OR: [
      // Non-deleted active signups like above
      activeSignupFilter(),
      // All deleted signups - filter by payment status after query
      { deletedAt: { isNotNull: true } },
    ],
  };
}
