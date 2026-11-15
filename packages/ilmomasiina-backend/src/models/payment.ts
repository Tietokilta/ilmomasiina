import { getDb } from "../db";
import { paymentTable } from "../db/schema";
import type { Signup } from "./signup";

export { ACTIVE_PAYMENT_STATUSES } from "../db/schema";

export type Payment = typeof paymentTable.$inferSelect;
export type PaymentInsert = typeof paymentTable.$inferInsert;

/** Fetches the statuses of all payments of a signup, for `effectivePaymentStatus()`. */
export const getPaymentStatuses = (signupId: Signup["id"]) =>
  getDb().query.payment.findMany({ where: { signupId }, columns: { status: true } });
