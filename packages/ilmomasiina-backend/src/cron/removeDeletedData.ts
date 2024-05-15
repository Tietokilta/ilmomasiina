import { lt } from 'drizzle-orm';
import moment from 'moment';

import config from '../config';
import { db } from '../drizzle/db';
import {
  answerTable, eventTable, questionTable, quotaTable, signupTable,
} from '../drizzle/schema';

export default async function removeDeletedData() {
  const ifRemovedBefore = moment().subtract(config.deletionGracePeriod, 'days').toDate();

  await db.delete(eventTable)
    .where(lt(eventTable.deletedAt, ifRemovedBefore))
    .execute();

  await db.delete(questionTable)
    .where(lt(questionTable.deletedAt, ifRemovedBefore))
    .execute();

  await db.delete(quotaTable)
    .where(lt(quotaTable.deletedAt, ifRemovedBefore))
    .execute();

  await db.delete(signupTable)
    .where(lt(signupTable.deletedAt, ifRemovedBefore))
    .execute();

  await db.delete(answerTable)
    .where(lt(answerTable.deletedAt, ifRemovedBefore))
    .execute();
}
