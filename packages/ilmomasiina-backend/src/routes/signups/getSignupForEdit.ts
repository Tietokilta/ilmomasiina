import { and, eq } from 'drizzle-orm';
import { FastifyReply, FastifyRequest } from 'fastify';

import type { SignupForEditResponse, SignupPathParams } from '@tietokilta/ilmomasiina-models';
import { db } from '../../drizzle/db';
import { SIGNUP_IS_ACTIVE } from '../../drizzle/helpers';
import { signupTable } from '../../drizzle/schema';
import { StringifyApi } from '../utils';
import { NoSuchSignup } from './errors';

/** Requires editTokenVerification */
export default async function getSignupForEdit(
  request: FastifyRequest<{ Params: SignupPathParams }>,
  reply: FastifyReply,
): Promise<SignupForEditResponse> {
  const signup = await db.query.signupTable.findFirst({
    where: and(SIGNUP_IS_ACTIVE, eq(signupTable.id, request.params.id)),
    with: {
      answers: true,
      quota: {
        with: {
          event: {
            with: {
              questions: true,
            },
          },
        },
      },
    },
  });
  if (!signup) {
    // Event not found with id, probably deleted
    throw new NoSuchSignup('No signup found with given id');
  }

  const { quota, ...signupWithoutQuota } = signup;
  const { event, ...restOfQuota } = quota;
  const response = {
    signup: {
      ...signupWithoutQuota,
      confirmed: Boolean(signup.confirmedAt),
      status: signup.status,
      answers: signup.answers,
      quota: restOfQuota,
    },
    event,
  };

  reply.status(200);

  return response as unknown as StringifyApi<typeof response>;
}
