import debug from 'debug';
import {
  and, eq, inArray, isNotNull, isNull, lt, ne, or,
} from 'drizzle-orm';
import moment from 'moment';

import config from '../config';
import { db } from '../drizzle/db';
import {
  answerTable, eventTable, quotaTable, signupTable,
} from '../drizzle/schema';

const redactedName = 'Deleted';
const redactedEmail = 'deleted@gdpr.invalid';
const redactedAnswer = 'Deleted';

const debugLog = debug('app:cron:anonymize');

export default async function anonymizeOldSignups() {
  const redactOlderThan = moment().subtract(config.anonymizeAfterDays, 'days').toDate();

  const signups = await db.select({ id: signupTable.id }).from(signupTable)
    .innerJoin(quotaTable, eq(signupTable.quotaId, quotaTable.id))
    .innerJoin(eventTable, eq(quotaTable.eventId, eventTable.id))
    .where(and(
      or(
        ne(signupTable.firstName, redactedName),
        ne(signupTable.lastName, redactedName),
        ne(signupTable.email, redactedEmail),
      ),
      or(
        lt(eventTable.date, redactOlderThan),
        and(
          isNull(eventTable.date),
          lt(eventTable.registrationEndDate, redactOlderThan),
        ),
      ),
      isNotNull(signupTable.confirmedAt),
    ))
    .execute();
  if (signups.length === 0) {
    debugLog('No old signups to redact');
    return;
  }

  const ids = signups.map((s) => s.id);
  console.info(`Redacting older signups: ${ids.join(', ')}`);
  try {
    await db.update(signupTable).set({
      firstName: redactedName,
      lastName: redactedName,
      email: redactedEmail,
    }).where(inArray(signupTable.id, ids)).execute();
    await db.update(answerTable).set({
      answer: [redactedAnswer],
    }).where(inArray(answerTable.signupId, ids)).execute();
    debugLog('Signups anonymized');
  } catch (error) {
    console.error(error);
  }
}
