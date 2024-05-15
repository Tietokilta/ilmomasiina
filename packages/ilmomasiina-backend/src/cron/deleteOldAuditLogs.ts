import { lt } from 'drizzle-orm';
import moment from 'moment';

import config from '../config';
import { db } from '../drizzle/db';
import { auditlogTable } from '../drizzle/schema';

export default async function deleteOldAuditLogs() {
  await db.delete(auditlogTable)
    .where(
      lt(auditlogTable.createdAt, moment().subtract(config.anonymizeAfterDays, 'days').toDate()),
    )
    .execute();
}
