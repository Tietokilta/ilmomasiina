import { FastifyReply, FastifyRequest } from 'fastify';

import type { UserListResponse } from '@tietokilta/ilmomasiina-models';
import { db } from '../../../drizzle/db';
import { userTable } from '../../../drizzle/schema';

export default async function listUsers(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<UserListResponse> {
  const users = await db.select({ id: userTable.id, email: userTable.email }).from(userTable).execute();

  reply.status(200);
  return users;
}
