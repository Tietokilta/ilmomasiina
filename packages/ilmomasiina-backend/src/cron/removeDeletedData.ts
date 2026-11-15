import { lt } from "drizzle-orm";
import moment from "moment";

import config from "../config";
import { getDb } from "../db";
import { answerTable, eventTable, questionTable, quotaTable, signupTable } from "../db/schema";

export default async function removeDeletedData() {
  const ifRemovedBefore = moment().subtract(config.deletionGracePeriod, "days").toDate();
  const db = getDb();

  await db.delete(eventTable).where(lt(eventTable.deletedAt, ifRemovedBefore));
  await db.delete(questionTable).where(lt(questionTable.deletedAt, ifRemovedBefore));
  await db.delete(quotaTable).where(lt(quotaTable.deletedAt, ifRemovedBefore));

  // TODO: This will fail for signups that have payments.
  await db.delete(signupTable).where(lt(signupTable.deletedAt, ifRemovedBefore));

  // Deletes answers that have been replaced by new ones.
  // Answers to deleted signups are already CASCADEd above.
  await db.delete(answerTable).where(lt(answerTable.deletedAt, ifRemovedBefore));
}
