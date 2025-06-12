import debug from "debug";
import moment from "moment-timezone";
import { Transaction, WhereOptions } from "sequelize";

import { AuditEvent, EventID, SignupStatus } from "@tietokilta/ilmomasiina-models";
import { internalAuditLogger } from "../../auditlog";
import config from "../../config";
import i18n from "../../i18n";
import EmailService from "../../mail";
import { getSequelize } from "../../models";
import { Event } from "../../models/event";
import { Quota } from "../../models/quota";
import { Signup } from "../../models/signup";
import { WouldMoveSignupsToQueue } from "../admin/events/errors";

const perfLog = debug("app:perf:signups");

async function sendPromotedFromQueueMail(signup: Signup, eventId: Event["id"]) {
  if (signup.email === null) return;

  // Re-fetch event for all attributes
  const event = await Event.findByPk(eventId);
  if (event === null) throw new Error("event missing when sending queue email");

  const lng = signup.language ?? undefined;
  const dateFormat = i18n.t("dateFormat.general", { lng });
  const params = {
    event,
    date: event.date && moment(event.date).tz(config.timezone).format(dateFormat),
  };
  await EmailService.sendPromotedFromQueueMail(signup.email, signup.language, params);
}

/** Step 1: acquire a lock and fetch the event. */
async function lockAndFetchEvent(eventId: EventID, transaction: Transaction) {
  const startTime = performance.now();

  // Lock to prevent simultaneous transactions from committing an earlier signup
  // that would bump others to the queue.
  perfLog(`Acquiring lock on event ${eventId} for signup position refresh`);

  let lock;
  if (getSequelize().getDialect() === "postgres") {
    // On Postgres, use pg_advisory_xact_lock to only affect necessary queries.
    await getSequelize().query(`SELECT pg_advisory_xact_lock(hashtext(:lockId))`, {
      replacements: { lockId: `ilmo-csp-${eventId}` },
      transaction,
    });
  } else {
    // On MySQL, there are only session-level advisory locks, which are a pain with transactions;
    // use a lock on the event row - this will have a performance impact, but we're phasing
    // out MySQL support anyway.
    lock = Transaction.LOCK.UPDATE;
  }

  const event = await Event.findByPk(eventId, {
    attributes: ["id", "title", "openQuotaSize"],
    transaction,
    lock,
  });

  if (!event) {
    throw new Error("event missing from DB");
  }

  const duration = performance.now() - startTime;
  perfLog(`Acquired lock for signup position refresh on ${eventId} in ${duration.toFixed(2)}ms`);
  return event;
}

/** Step 2: fetch signups and update positions. */
async function refreshPositions(
  event: Event,
  transaction: Transaction,
  moveSignupsToQueue: boolean,
): Promise<Signup[]> {
  const startTime = performance.now();

  // Fetch signups and quotas.
  const signups = await Signup.scope("active").findAll({
    attributes: ["id", "quotaId", "firstName", "lastName", "email", "status", "position", "language"],
    include: [
      {
        model: Quota,
        required: true,
        attributes: ["id", "size"],
      },
    ],
    where: {
      "$quota.eventId$": event.id,
    } as WhereOptions,
    // Honor creation time, tie-break by random ID in case of same millisecond
    order: [
      ["createdAt", "ASC"],
      ["id", "ASC"],
    ],
    transaction,
  });

  // Assign each signup to a quota or the queue.
  const quotaSignups = new Map<Quota["id"], number>();
  let inOpenQuota = 0;
  let inQueue = 0;
  let movedToQueue = 0;

  const result = signups.map((signup: Signup) => {
    let status: SignupStatus;
    let position: number;

    let inChosenQuota = quotaSignups.get(signup.quotaId) ?? 0;
    const chosenQuotaSize = signup.quota!.size ?? Infinity;

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
  await Promise.all(
    result.map(async ({ signup, status }) => {
      if (signup.status === "in-queue" && status !== "in-queue") {
        sendPromotedFromQueueMail(signup, event.id);

        await internalAuditLogger(AuditEvent.PROMOTE_SIGNUP, {
          signup,
          event,
          transaction,
        });
      }
    }),
  );

  // Store changes in database, if any.
  await Promise.all(
    result.map(async ({ signup, status, position }) => {
      if (signup.status !== status || signup.position !== position) {
        await signup.update({ status, position }, { transaction });
      }
    }),
  );

  const duration = performance.now() - startTime;
  perfLog(`Computed ${result.length} signup positions in ${event.id} in ${duration.toFixed(2)}ms`);

  return result.map(({ signup }) => signup);
}

class RefreshQueue {
  /** The refresh that has started a transaction. */
  private ongoing?: Promise<unknown>;
  /** The next refresh that has not started fetching signups. May be equal to `ongoing` while waiting for the lock. */
  private queued?: Promise<Signup[]>;
  /** The number of requests that will be satisfied by the queued refresh. */
  private queuedCount = 0;

  constructor(readonly eventId: EventID) {}

  refresh() {
    // If a refresh is already queued and has not started fetching signups, it will satisfy this request.
    if (this.queued) {
      this.queuedCount += 1;
      perfLog(`Reusing queued signup position refresh for ${this.eventId}`);
      return this.queued;
    }

    // We need to start a new refresh.
    let promise: Promise<Signup[]>;

    const performRefresh = async () => {
      try {
        return await getSequelize().transaction(async (transaction) => {
          const event = await lockAndFetchEvent(this.eventId, transaction);
          // We're starting to fetch signups, so this refresh can no longer be joined.
          perfLog(`Refreshing signup positions for ${this.eventId}, batch of ${this.queuedCount}`);
          this.queued = undefined;
          this.queuedCount = 0;
          return refreshPositions(event, transaction, true);
        });
      } finally {
        // No longer ongoing.
        if (this.ongoing === promise) this.ongoing = undefined;
        // In case the refresh fails before startRefresh(), also clear the queue.
        if (this.queued === promise) {
          this.queued = undefined;
          this.queuedCount = 0;
        }
      }
    };

    if (this.ongoing) {
      // If a refresh is currently ongoing but not queued, it will have already started fetching signups
      // and can't be used for this request. Wait for it to finish.
      perfLog(`Queueing signup position refresh for ${this.eventId}`);
      promise = this.ongoing
        .catch(() => {
          // Ignore errors, we always want to run after the ongoing refresh finishes.
          // Can't use finally(), as it does not allow changing the return value.
        })
        .then(() => {
          // This is now the ongoing refresh, as the previous one has finished.
          this.ongoing = this.queued;
          return performRefresh();
        });
    } else {
      // If no refresh is ongoing, we can immediately start the request.
      perfLog(`Immediate signup position refresh for ${this.eventId}`);
      promise = performRefresh();
      this.ongoing = promise;
    }
    this.queued = promise;
    this.queuedCount = 1;
    return promise;
  }
}

const refreshQueues = new Map<Event["id"], RefreshQueue>();

/**
 * Updates the status and position attributes on all signups in the given event. Also sends "promoted from queue"
 * emails to affected users. Returns the new statuses for all signups.
 *
 * This action is batched due to database locking - multiple calls may be satisfied by the same transaction.
 */
export async function refreshSignupPositions(eventRef: Event): Promise<Signup[]> {
  if (!refreshQueues.has(eventRef.id)) {
    refreshQueues.set(eventRef.id, new RefreshQueue(eventRef.id));
  }
  const queue = refreshQueues.get(eventRef.id)!;
  return queue.refresh();
}

/**
 * Like `refreshSignupPositions`, but returns the status for the given signup.
 */
export async function refreshSignupPositionsAndGet(eventRef: Event, signupId: Signup["id"]) {
  const result = await refreshSignupPositions(eventRef);
  const signup = result.find(({ id }) => id === signupId);
  if (!signup) throw new Error("failed to compute status");
  const { status, position } = signup;
  return { status, position };
}

/** Like `refreshSignupPositions`, but assumes an existing transaction and performs no batching.
 *
 * By default, recomputations can move signups into the queue. This ensures that we don't cause random errors for
 * ordinary users. `moveSignupsToQueue = false` is passed if a warning can be shown (i.e. in admin-side editors).
 */
export async function refreshSignupPositionsInTransaction(
  eventRef: Event,
  transaction: Transaction,
  moveSignupsToQueue: boolean = true,
): Promise<Signup[]> {
  const event = await lockAndFetchEvent(eventRef.id, transaction);
  return refreshPositions(event, transaction, moveSignupsToQueue);
}
