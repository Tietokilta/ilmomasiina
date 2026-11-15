import { and, desc, eq, inArray, like, or, SQL } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";

import type { AuditLogResponse, AuditLoqQuery } from "@tietokilta/ilmomasiina-models";
import { AUDIT_LOG_DEFAULT_LIMIT } from "@tietokilta/ilmomasiina-models";
import { getDb } from "../../../db";
import { auditLogTable } from "../../../db/schema";
import { StringifyApi } from "../../utils";

const MAX_LOGS = 100;

export default async function getAuditLogItems(
  request: FastifyRequest<{ Querystring: AuditLoqQuery }>,
  response: FastifyReply,
): Promise<AuditLogResponse> {
  const { query } = request;
  const conditions: (SQL | undefined)[] = [];
  if (query.user) {
    conditions.push(like(auditLogTable.user, `%${query.user}%`));
  }
  if (query.ip) {
    conditions.push(like(auditLogTable.ipAddress, `%${query.ip}%`));
  }
  if (query.action) {
    conditions.push(inArray(auditLogTable.action, query.action));
  }
  if (query.event) {
    conditions.push(or(eq(auditLogTable.eventId, query.event), like(auditLogTable.eventName, `%${query.event}%`)));
  }
  if (query.signup) {
    conditions.push(or(eq(auditLogTable.signupId, query.signup), like(auditLogTable.signupName, `%${query.signup}%`)));
  }
  const where = and(...conditions);

  const db = getDb();
  const [rows, count] = await Promise.all([
    db
      .select()
      .from(auditLogTable)
      .where(where)
      .orderBy(desc(auditLogTable.createdAt))
      .offset(query.offset ?? 0)
      .limit(Math.min(MAX_LOGS, query.limit ?? AUDIT_LOG_DEFAULT_LIMIT)),
    db.$count(auditLogTable, where),
  ]);

  response.status(200);
  const res = { rows, count };
  return res as unknown as StringifyApi<typeof res>;
}
