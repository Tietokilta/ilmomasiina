import { lt } from "drizzle-orm";
import moment from "moment";

import config from "../config";
import { getDb } from "../db";
import { auditLogTable } from "../db/schema";

export default async function deleteOldAuditLogs() {
  await getDb()
    .delete(auditLogTable)
    .where(lt(auditLogTable.createdAt, moment().subtract(config.anonymizeAfterDays, "days").toDate()));
}
