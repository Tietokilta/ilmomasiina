import { auditLogTable } from "../db/schema";

export type AuditLog = typeof auditLogTable.$inferSelect;
export type AuditLogInsert = typeof auditLogTable.$inferInsert;
