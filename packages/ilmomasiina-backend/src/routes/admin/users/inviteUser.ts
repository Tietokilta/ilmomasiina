import { eq } from 'drizzle-orm';
import { FastifyReply, FastifyRequest } from 'fastify';
import { Conflict } from 'http-errors';

import type { UserCreateSchema, UserInviteSchema, UserSchema } from '@tietokilta/ilmomasiina-models';
import { AuditEvent } from '@tietokilta/ilmomasiina-models';
import { AuditLogger } from '../../../auditlog';
import AdminPasswordAuth from '../../../authentication/adminPasswordAuth';
import { db, Transaction } from '../../../drizzle/db';
import { userTable } from '../../../drizzle/schema';
import EmailService from '../../../mail';
import generatePassword from './generatePassword';

/**
 * Private helper function to create a new user and save it to the database
 *
 * @param params user parameters
 * @param auditLogger audit logger function from the originating request
 */
export async function createUser(
  params: UserCreateSchema,
  auditLogger: AuditLogger,
  tx: Transaction,
): Promise<UserSchema> {
  const existing = await tx.select({ id: userTable.id }).from(userTable).where(eq(userTable.email, params.email)).execute()
    .then((rows) => rows[0]);

  if (existing) throw new Conflict('User with given email already exists');

  // Create new user with hashed password
  const res = await tx.insert(userTable).values({
    ...params,
    password: AdminPasswordAuth.createHash(params.password),
  }).returning({ id: userTable.id, email: userTable.email }).execute()
    .then((rows) => rows[0]);

  await auditLogger(AuditEvent.CREATE_USER, {
    extra: res,
    transaction: tx,
  });

  return res;
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

  const user = await db.transaction(async (transaction) => createUser(
    {
      email: request.body.email,
      password,
    },
    request.logEvent,
    transaction,
  ));

  // Send invitation mail
  await EmailService.sendNewUserMail(user.email, null, {
    email: user.email,
    password,
  });

  reply.status(201);
  return user;
}
