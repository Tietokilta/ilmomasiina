import { and, asc, eq } from 'drizzle-orm';
import moment from 'moment-timezone';

import { AuditEvent, SignupStatus } from '@tietokilta/ilmomasiina-models';
import { internalAuditLogger } from '../../auditlog';
import config from '../../config';
import { db } from '../../drizzle/db';
import { quotaTable, signupTable } from '../../drizzle/schema';
import i18n from '../../i18n';
import EmailService from '../../mail';
import { WouldMoveSignupsToQueue } from '../admin/events/errors';

async function sendPromotedFromQueueMail(signup: { email: string | null, language: string | null }, event: { id: string, location: string | null, title: string, date: Date | null }) {
  if (signup.email === null) return;

  const lng = signup.language ?? undefined;
  const dateFormat = i18n.t('dateFormat.general', { lng });
  const params = {
    event,
    date: event.date && moment(event.date).tz(config.timezone).format(dateFormat),
  };
  await EmailService.sendPromotedFromQueueMail(signup.email, signup.language, params);
}

/**
 * Updates the status and position attributes on all signups in the given event. Also sends "promoted from queue"
 * emails to affected users. Returns the new statuses for all signups.
 *
 * By default, recomputations can move signups into the queue. This ensures that we don't cause random errors for
 * ordinary users. `moveSignupsToQueue = false` is passed if a warning can be shown (i.e. in admin-side editors).
 */
export async function refreshSignupPositions(
  event: { id: string, openQuotaSize: number | null, title: string, date: Date | null, location: string | null },
  moveSignupsToQueue: boolean = true,
) {
  return db.transaction(async (tx) => {
    const signups = await tx.select()
      .from(signupTable)
      .innerJoin(quotaTable, eq(signupTable.quotaId, quotaTable.id))
      .where(and(eq(quotaTable.eventId, event.id)))
      .orderBy(asc(signupTable.createdAt), asc(signupTable.id))
      .execute();

    const quotaSignups = new Map<string, number>();
    let inOpenQuota = 0;
    let inQueue = 0;
    let movedToQueue = 0;

    const result = signups.map((signup) => {
      let status: SignupStatus;
      let position: number;

      let inChosenQuota = quotaSignups.get(signup.quota.id) ?? 0;
      const chosenQuotaSize = signup.quota?.size ?? Infinity;

      if (inChosenQuota < chosenQuotaSize) {
        inChosenQuota += 1;
        quotaSignups.set(signup.quota.id, inChosenQuota);
        status = 'in-quota';
        position = inChosenQuota;
      } else if (inOpenQuota < (event.openQuotaSize ?? 0)) {
        inOpenQuota += 1;
        status = 'in-open';
        position = inOpenQuota;
      } else {
        inQueue += 1;
        status = 'in-queue';
        position = inQueue;
        if (signup.signup.status !== 'in-queue') {
          movedToQueue += 1;
        }
      }

      return { signup, status, position };
    });

    if (movedToQueue > 0 && !moveSignupsToQueue) {
      throw new WouldMoveSignupsToQueue(movedToQueue);
    }

    await Promise.all(result.map(async ({ signup, status }) => {
      if (signup.signup.status === 'in-queue' && status !== 'in-queue') {
        await sendPromotedFromQueueMail(signup.signup, event);
        await internalAuditLogger(AuditEvent.PROMOTE_SIGNUP, { signup: signup.signup, event });
      }
    }));

    return Promise.all(result.map(async ({ signup: s, status, position }) => {
      if (s.signup.status !== status || s.signup.position !== position) {
        return db.update(signupTable)
          .set({ status, position })
          .where(eq(signupTable.id, s.signup.id)).returning({ id: signupTable.id, status: signupTable.status, position: signupTable.position })
          .execute()
          .then((res) => res[0]);
      }
      return { id: s.signup.id, status: s.signup.status, position: s.signup.position };
    }));
  }, { accessMode: 'read write', isolationLevel: 'serializable' });
}

/**
 * Like `refreshSignupPositions`, but returns the status for the given signup.
 */
export async function refreshSignupPositionsAndGet(event: Parameters<typeof refreshSignupPositions>[0], signupId: string) {
  const result = await refreshSignupPositions(event);
  const signup = result.find(({ id }) => id === signupId);
  if (!signup) throw new Error('failed to compute status');
  const { status, position } = signup;
  return { status, position };
}
