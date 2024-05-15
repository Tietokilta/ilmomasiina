import { and, eq } from 'drizzle-orm';
import { FastifyReply, FastifyRequest } from 'fastify';
import { BadRequest } from 'http-errors';

import type { SignupPathParams, SignupUpdateBody, SignupUpdateResponse } from '@tietokilta/ilmomasiina-models';
import { AuditEvent } from '@tietokilta/ilmomasiina-models';
import { db } from '../../drizzle/db';
import { SIGNUP_IS_ACTIVE } from '../../drizzle/helpers';
import { answerTable, signupTable } from '../../drizzle/schema';
import sendSignupConfirmationMail from '../../mail/signupConfirmation';
import { signupsAllowed } from './createNewSignup';
import { NoSuchSignup, SignupsClosed } from './errors';

/** Requires editTokenVerification */
export default async function updateSignup(
  request: FastifyRequest<{ Params: SignupPathParams, Body: SignupUpdateBody }>,
  reply: FastifyReply,
): Promise<SignupUpdateResponse> {
  const updatedSignup = await db.transaction(async (db) => {
    const signup = await db.query.signupTable.findFirst({
      where: and(SIGNUP_IS_ACTIVE, eq(signupTable.id, request.params.id)),
      columns: {
        id: true,
        quotaId: true,
        confirmedAt: true,
        firstName: true,
        lastName: true,
        email: true,
        language: true,
      },
      with: {
        quota: {
          with: {
            event: {
              with: {
                questions: {
                  columns: {
                    id: true,
                    question: true,
                    type: true,
                    options: true,
                    required: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!signup) {
      throw new NoSuchSignup('Signup expired or already deleted');
    }
    const { quota } = signup;
    const { event } = quota;
    if (!signupsAllowed(event)) {
      throw new SignupsClosed('Signups closed for this event.');
    }

    /** Is this signup already confirmed (i.e. is this the first update for this signup) */
    const notConfirmedYet = !signup.confirmedAt;
    const { questions } = event;

    // Check that required common fields are present (if first time confirming)
    let nameFields = {};
    if (notConfirmedYet && event.nameQuestion) {
      const { firstName, lastName } = request.body;
      if (!firstName) throw new BadRequest('Missing first name');
      if (!lastName) throw new BadRequest('Missing last name');
      nameFields = { firstName, lastName };
    }

    let emailField = {};
    if (notConfirmedYet && event.emailQuestion) {
      const { email } = request.body;
      if (!email) throw new BadRequest('Missing email');
      emailField = { email };
    }

    // Update signup language if provided
    let languageField = {};
    if (request.body.language) {
      languageField = { language: request.body.language };
    }

    // Check that all questions are answered with a valid answer
    const newAnswers = questions.map((question) => {
      // Fetch the answer to this question from the request body
      let answer = request.body.answers
        ?.find((a) => a.questionId === question.id)
        ?.answer;

      if (!answer || !answer.length) {
        // Disallow empty answers to required questions
        if (question.required) {
          throw new BadRequest(`Missing answer for question ${question.question}`);
        }
        // Normalize empty answers to "" or [], depending on question type
        answer = question.type === 'checkbox' ? [] : '';
      } else if (question.type === 'checkbox') {
        // Ensure checkbox answers are arrays
        if (!Array.isArray(answer)) {
          throw new BadRequest(`Invalid answer to question ${question.question}`);
        }
        // Check that all checkbox answers are valid
        answer.forEach((option) => {
          if (!question.options!.includes(option)) {
            throw new BadRequest(`Invalid answer to question ${question.question}`);
          }
        });
      } else {
        // Don't allow arrays for non-checkbox questions
        if (typeof answer !== 'string') {
          throw new BadRequest(`Invalid answer to question ${question.question}`);
        }
        switch (question.type) {
          case 'text':
          case 'textarea':
            break;
          case 'number':
            // Check that a numeric answer is valid
            if (!Number.isFinite(parseFloat(answer))) {
              throw new BadRequest(`Invalid answer to question ${question.question}`);
            }
            break;
          case 'select': {
            // Check that the select answer is valid
            if (!question.options?.includes(answer)) {
              throw new BadRequest(`Invalid answer to question ${question.question}`);
            }
            break;
          }
          default:
            throw new Error('Invalid question type');
        }
      }

      return {
        questionId: question.id,
        answer,
        signupId: signup.id,
      };
    });

    // Update fields for the signup (name and email only editable on first confirmation)
    const updatedFields = {
      ...nameFields,
      ...emailField,
      ...languageField,
      namePublic: Boolean(request.body.namePublic),
      confirmedAt: new Date(),
    };

    await db.update(signupTable).set(updatedFields).where(eq(signupTable.id, signup.id)).execute();

    // Update the Answers for the Signup
    await db.delete(answerTable).where(eq(answerTable.signupId, signup.id)).execute();
    await db.insert(answerTable).values(newAnswers).execute();

    await request.logEvent(AuditEvent.EDIT_SIGNUP, {
      signup,
      event: quota.event,
      transaction: db,
    });

    return signup;
  });

  // Send the confirmation email
  sendSignupConfirmationMail(updatedSignup);

  // Return data
  reply.status(200);
  return {
    id: updatedSignup.id,
  };
}
