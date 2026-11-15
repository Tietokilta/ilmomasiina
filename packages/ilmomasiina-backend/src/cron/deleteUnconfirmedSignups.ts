import debug from "debug";
import { and, eq, inArray, isNull, lt } from "drizzle-orm";
import { chunk } from "lodash";
import moment from "moment";

import config from "../config";
import { getDb, MAX_LIST_PARAMS } from "../db";
import { eventTable, quotaTable, signupTable } from "../db/schema";
import { refreshSignupPositions } from "../routes/signups/computeSignupPosition";

const debugLog = debug("app:cron:unconfirmed");

export default async function deleteUnconfirmedSignups() {
  const db = getDb();
  // Also already-deleted signups
  const signups = await db
    .select({ id: signupTable.id, eventId: eventTable.id })
    .from(signupTable)
    .leftJoin(quotaTable, and(eq(quotaTable.id, signupTable.quotaId), isNull(quotaTable.deletedAt)))
    .leftJoin(eventTable, and(eq(eventTable.id, quotaTable.eventId), isNull(eventTable.deletedAt)))
    .where(
      and(
        // Is not confirmed, and is too old
        isNull(signupTable.confirmedAt),
        lt(signupTable.createdAt, moment().subtract(config.signupConfirmMins, "minutes").toDate()),
      ),
    );

  if (signups.length === 0) {
    debugLog("No unconfirmed signups to delete");
    return;
  }

  const signupIds = signups.map((signup) => signup.id);
  // Signups in deleted events or quotas have no positions to refresh.
  const eventIds = new Set(signups.flatMap((signup) => (signup.eventId ? [signup.eventId] : [])));

  console.info(`Deleting unconfirmed signups: ${signupIds.join(", ")}`);
  try {
    // These cannot have payments, so we can just hard delete them.
    // If they do, this will error due to foreign key constraints.
    for (const batch of chunk(signupIds, MAX_LIST_PARAMS)) {
      // eslint-disable-next-line no-await-in-loop -- batches are run in sequence to limit load
      await db.delete(signupTable).where(inArray(signupTable.id, batch));
    }
    for (const id of eventIds) {
      // eslint-disable-next-line no-await-in-loop -- avoid doing many simultaneous transactions with this loop
      await refreshSignupPositions({ id });
    }
    debugLog("Unconfirmed signups deleted");
  } catch (error) {
    console.error(error);
  }
}
