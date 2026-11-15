import debug from "debug";
import { and, eq, inArray, isNotNull, isNull, lt, ne, or } from "drizzle-orm";
import { chunk } from "lodash";
import moment from "moment";

import config from "../config";
import { getDb, MAX_LIST_PARAMS } from "../db";
import { answerTable, eventTable, quotaTable, signupTable } from "../db/schema";

const redactedName = "Deleted";
const redactedEmail = "deleted@gdpr.invalid";
const redactedAnswer = "Deleted";

const debugLog = debug("app:cron:anonymize");

export default async function anonymizeOldSignups() {
  const redactOlderThan = moment().subtract(config.anonymizeAfterDays, "days").toDate();
  const db = getDb();

  const signups = await db
    .select({ id: signupTable.id })
    .from(signupTable)
    .innerJoin(quotaTable, and(eq(quotaTable.id, signupTable.quotaId), isNull(quotaTable.deletedAt)))
    .innerJoin(eventTable, and(eq(eventTable.id, quotaTable.eventId), isNull(eventTable.deletedAt)))
    .where(
      and(
        // Only anonymize if name and email aren't anonymized already
        or(
          ne(signupTable.firstName, redactedName),
          ne(signupTable.lastName, redactedName),
          ne(signupTable.email, redactedEmail),
        ),
        or(
          // Only anonymize if the event was long enough ago
          lt(eventTable.date, redactOlderThan),
          // Or the event has no date and the signup closed long enough ago
          and(isNull(eventTable.date), lt(eventTable.registrationEndDate, redactOlderThan)),
        ),
        // Don't touch unconfirmed signups
        isNotNull(signupTable.confirmedAt),
      ),
    );
  if (signups.length === 0) {
    debugLog("No old signups to redact");
    return;
  }

  const ids = signups.map((signup) => signup.id);

  console.info(`Redacting older signups: ${ids.join(", ")}`);
  try {
    for (const batch of chunk(ids, MAX_LIST_PARAMS)) {
      // eslint-disable-next-line no-await-in-loop -- batches are run in sequence to limit load
      await db
        .update(signupTable)
        .set({
          firstName: redactedName,
          lastName: redactedName,
          email: redactedEmail,
        })
        .where(inArray(signupTable.id, batch));
      // eslint-disable-next-line no-await-in-loop -- batches are run in sequence to limit load
      await db.update(answerTable).set({ answer: redactedAnswer }).where(inArray(answerTable.signupId, batch));
    }
    debugLog("Signups anonymized");
  } catch (error) {
    console.error(error);
  }
}
