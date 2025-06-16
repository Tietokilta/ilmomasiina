import debug from "debug";
import moment from "moment-timezone";
import { Op, Transaction, WhereOptions } from "sequelize";

import { AuditEvent, EventID, SignupCreateBody, SignupStatus } from "@tietokilta/ilmomasiina-models";
import { AuditLogger, internalAuditLogger } from "../../auditlog";
import config from "../../config";
import i18n from "../../i18n";
import EmailService from "../../mail";
import { getSequelize } from "../../models";
import { Event } from "../../models/event";
import { Quota } from "../../models/quota";
import { Signup } from "../../models/signup";
import { WouldMoveSignupsToQueue } from "../admin/events/errors";
import { NoSuchQuota, SignupsClosed } from "./errors";

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

/** Checks whether signups can still be created. */
export const signupsAllowed = (event: Event) => {
  if (event.registrationStartDate === null || event.registrationEndDate === null) {
    return false;
  }

  const now = new Date();
  return now >= event.registrationStartDate && now <= event.registrationEndDate;
};

/** Checks whether a signup is still editable. */
export const signupEditable = (event: Event, signup: Signup) =>
  signupsAllowed(event) || new Date() <= signup.editableAtLeastUntil;

/** Step 1: acquire a lock and fetch the event. */
async function lockAndFetchEvent(eventId: EventID, transaction: Transaction) {
  const startTime = performance.now();

  // Lock to prevent simultaneous transactions from committing an earlier signup
  // that would bump others to the queue.
  perfLog(`Acquiring lock on event ${eventId}`);

  let lock;
  if (getSequelize().getDialect() === "postgres") {
    // On Postgres, use pg_advisory_xact_lock to only affect necessary queries.
    await getSequelize().query(`SELECT pg_advisory_xact_lock(hashtext(:lockId))`, {
      replacements: { lockId: `ilmo-csp-${eventId}` },
      transaction,
    });
    // Still lock the event for SHARE to prevent it from changing.
    lock = Transaction.LOCK.SHARE;
  } else {
    // On MySQL, there are only session-level advisory locks, which are a pain with transactions;
    // use a lock on the event row - this will have a performance impact, but we're phasing
    // out MySQL support anyway.
    lock = Transaction.LOCK.UPDATE;
  }

  const event = await Event.findByPk(eventId, {
    attributes: ["id", "title", "registrationStartDate", "registrationEndDate", "openQuotaSize"],
    transaction,
    lock,
  });

  if (!event) {
    throw new Error("event missing from DB");
  }

  const duration = performance.now() - startTime;
  perfLog(`Acquired lock on ${eventId} in ${duration.toFixed(2)}ms`);
  return event;
}

/** Step 2: insert new signups. */
async function insertSignups(event: Event, signups: QueuedInsert[], transaction: Transaction): Promise<void> {
  const startTime = performance.now();

  // Fetch each quota we're inserting in.
  const quotaIds = new Set(signups.map((signup) => signup.body.quotaId));
  const quotas = await Quota.findAll({
    attributes: ["id"],
    where: { eventId: event.id, id: { [Op.in]: Array.from(quotaIds) } },
    transaction,
  });
  const quotasFound = new Set(quotas.map((quota) => quota.id));

  for (const request of signups) {
    try {
      // Do some validation.
      if (!quotasFound.has(request.body.quotaId)) {
        throw new NoSuchQuota("Quota doesn't exist.");
      }
      if (!signupsAllowed(event)) {
        throw new SignupsClosed("Signups closed for this event.");
      }

      // Insert the signup. Do this in a loop because we're within one transaction.
      // eslint-disable-next-line no-await-in-loop
      const signup = await Signup.create({ quotaId: request.body.quotaId }, { transaction });

      // Create an audit log event.
      // eslint-disable-next-line no-await-in-loop
      await request.auditLogger(AuditEvent.CREATE_SIGNUP, { signup, event, transaction });

      request.resolve(signup);
    } catch (error) {
      request.reject(error);
    }
  }

  const duration = performance.now() - startTime;
  perfLog(`Inserted ${signups.length} signups in ${event.id} in ${duration.toFixed(2)}ms`);
}

/** Step 3: fetch all signups and update positions. */
async function refreshPositions(event: Event, transaction: Transaction, moveSignupsToQueue: boolean) {
  const startTime = performance.now();

  // Fetch signups and quotas.
  const signups = await Signup.scope("active").findAll({
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

  // If a signup was just promoted from the queue, log it and return it to send an email later.
  const promoted = result.filter(({ signup, status }) => signup.status === "in-queue" && status !== "in-queue");
  if (promoted.length) {
    await Promise.all(
      promoted.map(({ signup }) => internalAuditLogger(AuditEvent.PROMOTE_SIGNUP, { signup, event, transaction })),
    );
  }

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

  return { event, signups: result.map(({ signup }) => signup), promoted };
}

type Insert = {
  body: SignupCreateBody;
  requestId?: string;
  auditLogger: AuditLogger;
};

type QueuedInsert = Insert & {
  resolve: (signup: Signup) => void;
  reject: (error: unknown) => void;
};

class RefreshQueue {
  /** The refresh that has started a transaction. Only used as an opaque object. */
  private ongoing?: Promise<unknown>;
  /** The next refresh that has not started fetching signups. */
  private queued?: {
    /** A promise that will resolve once the refresh finishes. May be equal to `ongoing` while waiting for the lock. */
    promise: Promise<Signup[]>;
    /** Any signups to be inserted on this cycle. */
    inserts: QueuedInsert[];
    /** The number of requests that will be satisfied by the queued refresh. */
    requests: number;
  };

  constructor(readonly eventId: EventID) {}

  /**
   * Updates the status and position attributes on all signups in the given event. Also sends "promoted from queue"
   * emails to affected users. Returns the new statuses for all signups.
   *
   * This action is batched due to database locking - multiple calls may be satisfied by the same transaction.
   */
  refresh(): Promise<Signup[]> {
    return this.internalRefresh().refresh;
  }

  /**
   * Inserts a signup, then calls `refresh()`. Returns the new signup with up-to-date status/position information.
   *
   * This action is batched due to database locking - multiple calls may be satisfied by the same transaction.
   */
  createSignupAndRefresh(insert: Insert): Promise<Signup> {
    return this.internalRefresh(insert).insert!;
  }

  private internalRefresh(insert?: Insert) {
    // If a refresh is already queued and has not started work, it can satisfy this request.
    if (this.queued) {
      perfLog(`[${insert?.requestId}] Reusing queued signup position refresh for ${this.eventId}`);
      this.queued.requests += 1;
    } else {
      // We need to start a new refresh.
      let refreshPromise: Promise<Signup[]>;

      const performRefresh = async (): Promise<Signup[]> => {
        try {
          const result = await getSequelize().transaction(async (transaction) => {
            const event = await lockAndFetchEvent(this.eventId, transaction);

            // We're starting to do actual work, so this refresh can no longer be joined.
            if (this.queued!.promise !== refreshPromise)
              throw new Error("No longer the queued refresh - should never occur");
            const { inserts, requests } = this.queued!;
            this.queued = undefined;

            perfLog(
              `Inserting ${inserts.length} signups and refreshing positions for ${this.eventId}, batch of ${requests}`,
            );
            await insertSignups(event, inserts, transaction);
            return refreshPositions(event, transaction, true);
          });

          // If a signup was just promoted from the queue, send an email about it asynchronously.
          for (const signup of result.promoted) sendPromotedFromQueueMail(signup.signup, result.event.id);

          return result.signups;
        } finally {
          // No longer ongoing.
          if (this.ongoing === refreshPromise) this.ongoing = undefined;
          // In case the refresh fails before clearing queued, also clear it now.
          if (this.queued?.promise === refreshPromise) this.queued = undefined;
        }
      };

      if (this.ongoing) {
        // If a refresh is currently ongoing but not queued, it will have already started actual work
        // and can't be used for this request. Wait for it to finish.
        perfLog(`[${insert?.requestId}] Queueing signup position refresh for ${this.eventId}`);
        refreshPromise = this.ongoing
          .catch(() => {
            // Ignore errors, we always want to run after the ongoing refresh finishes.
            // Can't use finally(), as it does not allow changing the return value.
          })
          .then(() => {
            // This is now the ongoing refresh, as the previous one has finished.
            this.ongoing = this.queued!.promise;
            return performRefresh();
          });
        this.queued = { promise: refreshPromise, inserts: [], requests: 1 };
      } else {
        // If no refresh is ongoing, we can immediately start the request.
        perfLog(`[${insert?.requestId}] Immediate signup position refresh for ${this.eventId}`);
        refreshPromise = performRefresh();
        this.ongoing = refreshPromise;
        this.queued = { promise: refreshPromise, inserts: [], requests: 1 };
      }
    }

    // If an insert is requested, add it to the queued refresh task.
    if (insert) {
      const insertPromise = new Promise<Signup>((resolve, reject) => {
        this.queued!.inserts.push({ ...insert, resolve, reject });
      });
      return {
        refresh: this.queued.promise,
        // Depend on both promises to access the refresh results and ensure any errors
        // that rollback the transaction also reject the returned insert promise.
        insert: Promise.all([this.queued.promise, insertPromise]).then(
          ([refreshed, created]) => refreshed.find((signup) => signup.id === created.id) ?? created,
        ),
      };
    }
    return { refresh: this.queued.promise, insert: undefined };
  }
}

const refreshQueues = new Map<Event["id"], RefreshQueue>();

export function signupRefresher(eventId: EventID): RefreshQueue {
  if (!refreshQueues.has(eventId)) {
    refreshQueues.set(eventId, new RefreshQueue(eventId));
  }
  return refreshQueues.get(eventId)!;
}

/** Like `signupPositionComputer(eventRef.id).refresh()`, but assumes an existing transaction and performs no batching.
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
  const { signups } = await refreshPositions(event, transaction, moveSignupsToQueue);
  return signups;
}
