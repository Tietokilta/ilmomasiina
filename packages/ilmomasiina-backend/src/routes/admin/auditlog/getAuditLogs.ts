import {
  count,
  desc, eq, inArray, like, or,
} from 'drizzle-orm';
import { FastifyReply, FastifyRequest } from 'fastify';

import { auditLoqQuery } from '@tietokilta/ilmomasiina-models';
import { AuditLogResponse, AuditLoqQuery } from '@tietokilta/ilmomasiina-models/src';
import { db } from '../../../drizzle/db';
import { auditlogTable } from '../../../drizzle/schema';
import { StringifyApi } from '../../utils';

const MAX_LOGS = 100;

export default async function getAuditLogItems(
  request: FastifyRequest<{ Querystring: AuditLoqQuery }>,
  response: FastifyReply,
): Promise<AuditLogResponse> {
  const where = [];

  if (request.query.user) {
    where.push(like(auditlogTable.user, `%${request.query.user}%`));
  }

  if (request.query.ip) {
    where.push(like(auditlogTable.ipAddress, `%${request.query.ip}%`));
  }

  if (request.query.action) {
    where.push(inArray(auditlogTable.action, request.query.action));
  }

  if (request.query.event) {
    where.push(or(
      eq(auditlogTable.eventId, request.query.event),
      like(auditlogTable.eventName, `%${request.query.event}%`),
    ));
  }

  if (request.query.signup) {
    where.push(or(
      eq(auditlogTable.signupId, request.query.signup),
      like(auditlogTable.signupName, `%${request.query.signup}%`),
    ));
  }

  const offset = request.query.offset || auditLoqQuery.properties.offset.default;
  const limit = Math.min(MAX_LOGS, request.query.limit || auditLoqQuery.properties.limit.default);

  const logs = await db.select()
    .from(auditlogTable)
    .where(where.length > 0 ? where.reduce((acc, cond) => or(acc, cond)) : undefined)
    .orderBy(desc(auditlogTable.createdAt))
    .offset(offset)
    .limit(limit)
    .execute();

  const logsCount = await db.select({ count: count() })
    .from(auditlogTable)
    .where(where.length > 0 ? where.reduce((acc, cond) => or(acc, cond)) : undefined)
    .execute()
    .then((r) => r[0].count);

  response.status(200);
  const res = {
    rows: logs.map((r) => ({
      ...r,
      createdAt: r.createdAt,
    })),
    count: logsCount,
  };
  return res as unknown as StringifyApi<typeof res>;
}
