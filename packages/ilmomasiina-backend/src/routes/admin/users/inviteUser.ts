import { FastifyReply, FastifyRequest } from "fastify";
import { Conflict } from "http-errors";

import type { UserCreateSchema, UserInviteSchema, UserSchema } from "@tietokilta/ilmomasiina-models";
import { AuditEvent } from "@tietokilta/ilmomasiina-models";
import { AuditLogger } from "../../../auditlog";
import AdminPasswordAuth from "../../../authentication/adminPasswordAuth";
import { getDb, Tx } from "../../../db";
import { userTable } from "../../../db/schema";
import EmailService from "../../../mail";
import type { User } from "../../../models/user";
import generatePassword from "./generatePassword";

/**
 * Private helper function to create a new user and save it to the database
 *
 * @param params user parameters
 * @param auditLogger audit logger function from the originating request
 */
export async function createUser(params: UserCreateSchema, auditLogger: AuditLogger, transaction: Tx): Promise<User> {
  const existing = await transaction.query.user.findFirst({ where: { email: params.email } });

  if (existing) throw new Conflict("User with given email already exists");

  // Create new user with hashed password
  const [user] = await transaction
    .insert(userTable)
    .values({
      email: params.email,
      password: AdminPasswordAuth.createHash(params.password),
    })
    .returning();

  await auditLogger(AuditEvent.CREATE_USER, {
    extra: {
      id: user.id,
      email: user.email,
    },
    transaction,
  });

  return user;
}

/**
 * Creates a new user and sends an invitation mail to their email
 */
export default async function inviteUser(
  request: FastifyRequest<{ Body: UserInviteSchema }>,
  reply: FastifyReply,
): Promise<UserSchema> {
  // Generate secure password
  const password = generatePassword();

  const user = await getDb().transaction(async (transaction) =>
    createUser(
      {
        email: request.body.email,
        password,
      },
      request.logEvent,
      transaction,
    ),
  );

  // Send invitation mail
  await EmailService.sendNewUserMail(user.email, null, {
    email: user.email,
    password,
  });

  reply.status(201);
  return {
    id: user.id,
    email: user.email,
  };
}
