import { FastifyReply, FastifyRequest } from "fastify";

import type { UserListResponse } from "@tietokilta/ilmomasiina-models";
import { getDb } from "../../../db";

export default async function listUsers(request: FastifyRequest, reply: FastifyReply): Promise<UserListResponse> {
  const users = await getDb().query.user.findMany({ columns: { id: true, email: true } });

  // Just to make sure password hashes are never exposed...
  const res = users.map((u) => ({ id: u.id, email: u.email }));

  reply.status(200);
  return res;
}
