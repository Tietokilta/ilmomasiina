import { and, eq } from 'drizzle-orm';
import { FastifyReply, FastifyRequest } from 'fastify';

import type { SignupCreateBody, SignupCreateResponse } from '@tietokilta/ilmomasiina-models';
import { db } from '../../drizzle/db';
import { EVENT_USER_VISIBLE } from '../../drizzle/helpers';
import { eventTable, quotaTable, signupTable } from '../../drizzle/schema';
import { refreshSignupPositions } from './computeSignupPosition';
import { generateToken } from './editTokens';
import { NoSuchQuota, SignupsClosed } from './errors';

export const signupsAllowed = (event: { registrationStartDate: Date | null, registrationEndDate: Date | null }) => {
  if (event.registrationStartDate === null || event.registrationEndDate === null) {
    return false;
  }

  const now = new Date();
  return now >= event.registrationStartDate && now <= event.registrationEndDate;
};

export default async function createSignup(
  request: FastifyRequest<{ Body: SignupCreateBody }>,
  response: FastifyReply,
): Promise<SignupCreateResponse> {
  // Find the given quota and event.
  const res = await db.select().from(quotaTable).innerJoin(eventTable, eq(quotaTable.eventId, eventTable.id)).where(
    and(eq(quotaTable.id, request.body.quotaId), EVENT_USER_VISIBLE),
  )
    .execute()
    .then((rows) => rows.at(0));
  // Do some validation.
  if (!res || !res.event) {
    throw new NoSuchQuota('Quota doesn\'t exist.');
  }
  const { quota, event } = res;

  if (!signupsAllowed(event)) {
    throw new SignupsClosed('Signups closed for this event.');
  }

  // Create the signup.
  const newSignup = await db.insert(signupTable).values({ quotaId: quota.id }).returning({ id: signupTable.id }).execute()
    .then((rows) => rows[0]);
  await refreshSignupPositions(event);

  const editToken = generateToken(newSignup.id);

  response.status(201);
  return {
    id: newSignup.id,
    editToken,
  };
}
