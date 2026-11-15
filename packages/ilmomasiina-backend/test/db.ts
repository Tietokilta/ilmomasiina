import { and, asc, eq, inArray, isNull, ne, sql } from "drizzle-orm";

import { getDb } from "../src/db";
import {
  answerTable,
  auditLogTable,
  eventTable,
  paymentTable,
  questionTable,
  quotaTable,
  signupTable,
} from "../src/db/schema";
import type { Answer } from "../src/models/answer";
import type { Event } from "../src/models/event";
import type { Payment } from "../src/models/payment";
import { ACTIVE_PAYMENT_STATUSES } from "../src/models/payment";
import type { Signup } from "../src/models/signup";

// Helpers for reading and changing rows directly in tests.

type TestTable =
  typeof eventTable | typeof quotaTable | typeof questionTable | typeof signupTable | typeof paymentTable;

/** Re-reads `row` from the database and updates the given object in place. */
export async function reloadRow<T extends TestTable>(table: T, row: T["$inferSelect"]) {
  const rows = await getDb()
    .select()
    .from<TestTable>(table)
    .where(sql`${table.id} = ${row.id}`);
  if (!rows.length) throw new Error("row no longer exists");
  Object.assign(row, rows[0]);
}

/** Updates `row` in the database and in the given object. */
export async function updateRow<T extends TestTable>(
  table: T,
  row: T["$inferSelect"],
  values: Partial<T["$inferSelect"]>,
) {
  await getDb()
    .update<TestTable>(table)
    .set(values)
    .where(sql`${table.id} = ${row.id}`);
  await reloadRow(table, row);
}

/** Re-reads a signup into the given object, and sets its current answers as `answers`. */
export async function reloadSignupWithAnswers(signup: Signup & { answers?: Answer[] }) {
  await reloadRow(signupTable, signup);
  const answers = await getDb()
    .select()
    .from(answerTable)
    .where(and(eq(answerTable.signupId, signup.id), isNull(answerTable.deletedAt)));
  Object.assign(signup, { answers });
}

/** Finds the oldest payment of the signup, optionally ignoring one payment. */
export async function findPayment(signupId: Signup["id"], except?: Pick<Payment, "id">): Promise<Payment | null> {
  const payments = await getDb()
    .select()
    .from(paymentTable)
    .where(and(eq(paymentTable.signupId, signupId), except && ne(paymentTable.id, except.id)))
    .orderBy(asc(paymentTable.id))
    .limit(1);
  return payments.at(0) ?? null;
}

/** Finds the active payment of the signup, if any. */
export async function findActivePayment(signupId: Signup["id"]): Promise<Payment | null> {
  const payment = await getDb().query.payment.findFirst({
    where: { signupId, status: { in: ACTIVE_PAYMENT_STATUSES } },
  });
  return payment ?? null;
}

/** Finds all payments of the given signups, oldest first. */
export function findPayments(signupIds: Signup["id"][]): Promise<Payment[]> {
  return getDb()
    .select()
    .from(paymentTable)
    .where(inArray(paymentTable.signupId, signupIds))
    .orderBy(asc(paymentTable.createdAt), asc(paymentTable.id));
}

/** Finds a non-deleted event with its questions and quotas in order. */
export async function findEvent(id: Event["id"]) {
  const event = await getDb().query.event.findFirst({
    where: { id, deletedAt: { isNull: true } },
    with: { questions: { orderBy: { order: "asc" } }, quotas: { orderBy: { order: "asc" } } },
  });
  return event ?? null;
}

/** Counts non-deleted events, optionally only those with the given slug. */
export function countEvents(slug?: string) {
  return getDb().$count(
    eventTable,
    and(isNull(eventTable.deletedAt), slug === undefined ? undefined : eq(eventTable.slug, slug)),
  );
}

/** Returns all audit log entries, oldest first. */
export function findAuditLogs() {
  return getDb().select().from(auditLogTable).orderBy(asc(auditLogTable.createdAt), asc(auditLogTable.id));
}
