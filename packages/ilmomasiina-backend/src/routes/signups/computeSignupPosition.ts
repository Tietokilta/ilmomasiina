import debug from "debug";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { chunk } from "lodash";

import { AuditEvent, SignupStatus } from "@tietokilta/ilmomasiina-models";
import { internalAuditLogger } from "../../auditlog";
import { getDb, MAX_LIST_PARAMS, Tx } from "../../db";
import { eventTable, quotaTable, signupStatusEnum, signupTable } from "../../db/schema";
import { sendPromotedFromQueueMail } from "../../mail/signups";
import type { Event } from "../../models/event";
import type { Quota } from "../../models/quota";
import { activeSignupCondition, Signup } from "../../models/signup";
import { WouldMoveSignupsToQueue } from "../admin/events/errors";

const perfLog = debug("app:perf:signups");

/** The fields of a signup that are loaded for and returned from a position refresh. */
export type PositionedSignup = Pick<
  Signup,
  | "id"
  | "quotaId"
  | "firstName"
  | "lastName"
  | "email"
  | "status"
  | "position"
  | "language"
  | "price"
  | "manualPaymentStatus"
>;

/** Internal, non-batched version. See below for explanation of what this does. */
async function refreshSignupPositionsInternal(
  eventRef: Pick<Event, "id">,
  transaction: Tx | undefined,
  moveSignupsToQueue: boolean,
  queuedCount: number,
): Promise<PositionedSignup[]> {
  // Wrap in transaction if not given
  if (!transaction) {
    return getDb().transaction(async (trans) =>
      refreshSignupPositionsInternal(eventRef, trans, moveSignupsToQueue, queuedCount),
    );
  }

  const startTime = performance.now();

  // Lock event to prevent simultaneous changes
  const [event] = await transaction
    .select({ id: eventTable.id, title: eventTable.title, openQuotaSize: eventTable.openQuotaSize })
    .from(eventTable)
    .where(and(eq(eventTable.id, eventRef.id), isNull(eventTable.deletedAt)))
    .for("update");
  // The row may be missing if the event was deleted meanwhile.
  if (!(event as typeof event | undefined)) {
    throw new Error("event missing from DB");
  }
  const signups = await transaction
    .select({
      id: signupTable.id,
      quotaId: signupTable.quotaId,
      firstName: signupTable.firstName,
      lastName: signupTable.lastName,
      email: signupTable.email,
      status: signupTable.status,
      position: signupTable.position,
      language: signupTable.language,
      price: signupTable.price,
      manualPaymentStatus: signupTable.manualPaymentStatus,
      quotaSize: quotaTable.size,
    })
    .from(signupTable)
    .innerJoin(quotaTable, and(eq(quotaTable.id, signupTable.quotaId), isNull(quotaTable.deletedAt)))
    .where(and(activeSignupCondition(), eq(quotaTable.eventId, event.id)))
    // Honor creation time, tie-break by random ID in case of same millisecond
    .orderBy(asc(signupTable.createdAt), asc(signupTable.id))
    .for("update");

  // Assign each signup to a quota or the queue.
  const quotaSignups = new Map<Quota["id"], number>();
  let inOpenQuota = 0;
  let inQueue = 0;
  let movedToQueue = 0;

  const result = signups.map(({ quotaSize, ...signup }) => {
    let status: SignupStatus;
    let position: number;

    let inChosenQuota = quotaSignups.get(signup.quotaId) ?? 0;
    const chosenQuotaSize = quotaSize ?? Infinity;

    // Assign the selected or open quotas if free. Never worsen a signup's status.
    if (inChosenQuota < chosenQuotaSize) {
      inChosenQuota += 1;
      quotaSignups.set(signup.quotaId, inChosenQuota);
      status = SignupStatus.IN_QUOTA;
      position = inChosenQuota;
    } else if (inOpenQuota < event.openQuotaSize) {
      inOpenQuota += 1;
      status = SignupStatus.IN_OPEN_QUOTA;
      position = inOpenQuota;
    } else {
      inQueue += 1;
      status = SignupStatus.IN_QUEUE;
      position = inQueue;
      if (signup.status !== SignupStatus.IN_QUEUE) {
        movedToQueue += 1;
      }
    }

    return { signup, status, position };
  });

  if (movedToQueue > 0 && !moveSignupsToQueue) {
    throw new WouldMoveSignupsToQueue(movedToQueue);
  }

  // If a signup was just promoted from the queue, send an email about it asynchronously.
  const promoted = result.filter(
    ({ signup, status }) => signup.status === SignupStatus.IN_QUEUE && status !== SignupStatus.IN_QUEUE,
  );
  await Promise.all(promoted.map(({ signup }) => sendPromotedFromQueueMail(signup)));
  for (const { signup } of promoted) {
    // eslint-disable-next-line no-await-in-loop -- queries in a transaction share a connection and run in sequence
    await internalAuditLogger(AuditEvent.PROMOTE_SIGNUP, {
      signup,
      event,
      transaction,
    });
  }

  // Store changes in database, if any, with a single query. Drizzle has no builder for a VALUES list,
  // so that part is raw SQL. Its values are cast to the column types, so that the primary key index is used.
  const changed = result.filter(
    ({ signup, status, position }) => signup.status !== status || signup.position !== position,
  );
  const statusType = sql.identifier(signupStatusEnum.enumName);
  for (const batch of chunk(changed, MAX_LIST_PARAMS / 3)) {
    const rows = batch.map(
      ({ signup, status, position }) => sql`(${signup.id}::bpchar, ${status}::${statusType}, ${position}::integer)`,
    );
    // eslint-disable-next-line no-await-in-loop -- queries in a transaction share a connection and run in sequence
    await transaction
      .update(signupTable)
      .set({ status: sql`v.status`, position: sql`v.position` })
      .from(sql`(VALUES ${sql.join(rows, sql`, `)}) AS v(id, status, position)`)
      .where(eq(signupTable.id, sql`v.id`));
  }

  const duration = performance.now() - startTime;
  perfLog(
    `Computed ${result.length} signup positions in ${event.id} in ${duration.toFixed(2)}ms (batch of ${queuedCount})`,
  );

  return result.map(({ signup, status, position }) => ({ ...signup, status, position }));
}

const refreshQueues = new Map<
  Event["id"],
  {
    ongoing?: Promise<unknown>;
    queued?: Promise<PositionedSignup[]>;
    queuedCount?: number;
  }
>();

/**
 * Updates the status and position attributes on all signups in the given event. Also sends "promoted from queue"
 * emails to affected users. Returns the new statuses for all signups.
 *
 * By default, recomputations can move signups into the queue. This ensures that we don't cause random errors for
 * ordinary users. `moveSignupsToQueue = false` is passed if a warning can be shown (i.e. in admin-side editors).
 *
 * This action is batched due to database locking - if a call is already ongoing, the next call will be delayed and
 * performed only once for all calls performed during a previous operation.
 */
export async function refreshSignupPositions(
  eventRef: Pick<Event, "id">,
  transaction?: Tx,
  moveSignupsToQueue = true,
): Promise<PositionedSignup[]> {
  // If a transaction is passed, we need to do the refresh within that transaction.
  // It may need to wait for other transactions, but let's handle that on the DB level.
  if (transaction) {
    return refreshSignupPositionsInternal(eventRef, transaction, moveSignupsToQueue, 1);
  }

  let queue = refreshQueues.get(eventRef.id);
  if (!queue) {
    queue = {};
    refreshQueues.set(eventRef.id, queue);
  }

  // If a another refresh is already ongoing and another is queued, reuse the last queued one,
  // since it will be executed after this moment anyway.
  if (queue.queued) {
    queue.queuedCount! += 1;
    return queue.queued;
  }

  // Otherwise, if another refresh is already ongoing, queue a new one after it completes.
  if (queue.ongoing) {
    const queued = queue.ongoing
      .catch(() => {
        // ignore errors, we always want to run after the ongoing refresh finishes
      })
      .then(async () => {
        const count = queue.queuedCount!;
        queue.ongoing = queue.queued;
        queue.queued = undefined;
        queue.queuedCount = 0;
        try {
          return await refreshSignupPositionsInternal(eventRef, transaction, moveSignupsToQueue, count);
        } finally {
          if (queue.ongoing === queued) queue.ongoing = undefined;
        }
      });
    queue.queued = queued;
    queue.queuedCount = 1;
    return queued;
  }

  // Otherwise, immediately perform a refresh.
  const promise = refreshSignupPositionsInternal(eventRef, transaction, moveSignupsToQueue, 1);
  queue.ongoing = promise;
  try {
    return await promise;
  } finally {
    if (queue.ongoing === promise) queue.ongoing = undefined;
  }
}

/**
 * Like `refreshSignupPositions`, but returns the status for the given signup.
 */
export async function refreshSignupPositionsAndGet(event: Pick<Event, "id">, signupId: Signup["id"]) {
  const result = await refreshSignupPositions(event);
  const signup = result.find(({ id }) => id === signupId);
  if (!signup) throw new Error("failed to compute status");
  const { status, position } = signup;
  return { status, position };
}
