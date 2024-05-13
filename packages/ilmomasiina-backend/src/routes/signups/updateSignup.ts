import { FastifyReply, FastifyRequest } from 'fastify';
import { BadRequest } from 'http-errors';
import { Transaction } from 'sequelize';

import type { SignupPathParams, SignupUpdateBody, SignupUpdateResponse } from '@tietokilta/ilmomasiina-models';
import { AuditEvent } from '@tietokilta/ilmomasiina-models';
import sendSignupConfirmationMail from '../../mail/signupConfirmation';
import { getSequelize } from '../../models';
import { Answer } from '../../models/answer';
import { Event } from '../../models/event';
import { Question } from '../../models/question';
import { Signup } from '../../models/signup';
import { signupsAllowed } from './createNewSignup';
import { NoSuchSignup, SignupsClosed } from './errors';

/** Requires editTokenVerification */
export default async function updateSignup(
  request: FastifyRequest<{ Params: SignupPathParams, Body: SignupUpdateBody }>,
  reply: FastifyReply,
): Promise<SignupUpdateResponse> {
  const updatedSignup = await getSequelize().transaction(async (transaction) => {
    // Retrieve event data and lock the row for editing
    const signup = await Signup.scope('active').findByPk(request.params.id, {
      attributes: ['id', 'quotaId', 'confirmedAt', 'firstName', 'lastName', 'email', 'telegram', 'language'],
      transaction,
      lock: Transaction.LOCK.UPDATE,
    });
    if (signup === null) {
      throw new NoSuchSignup('Signup expired or already deleted');
    }

    const quota = await signup.getQuota({
      include: [
        {
          model: Event,
          include: [
            {
              model: Question,
            },
          ],
        },
      ],
      transaction,
    });
    const event = quota.event!;
    if (!signupsAllowed(event)) {
      throw new SignupsClosed('Signups closed for this event.');
    }

    /** Is this signup already confirmed (i.e. is this the first update for this signup) */
    const notConfirmedYet = !signup.confirmedAt;
    const questions = event.questions!;

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

    let telegramField = {};
    if (notConfirmedYet && event.telegramQuestion) {
      const { telegram } = request.body;
      if (!telegram) throw new BadRequest('Missing telegram question');
      telegramField = { telegram };
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
            if (!question.options!.includes(answer)) {
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

    // Update fields for the signup (name, email and telegram only editable on first confirmation)
    const updatedFields = {
      ...nameFields,
      ...emailField,
      ...languageField,
      ...telegramField,
      namePublic: Boolean(request.body.namePublic),
      confirmedAt: new Date(),
    };

    await signup.update(updatedFields, { transaction });

    // Update the Answers for the Signup
    await Answer.destroy({
      where: {
        signupId: signup.id,
      },
      transaction,
    });
    await Answer.bulkCreate(newAnswers, { transaction });

    await request.logEvent(AuditEvent.EDIT_SIGNUP, {
      signup,
      event: quota.event,
      transaction,
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
