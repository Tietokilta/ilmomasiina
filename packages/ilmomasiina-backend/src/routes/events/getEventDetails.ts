import { FastifyReply, FastifyRequest } from 'fastify';
import { NotFound } from 'http-errors';
import { Op, Order } from 'sequelize';

import type {
  AdminEventPathParams, AdminEventResponse, EventID, EventSlug, UserEventPathParams, UserEventResponse,
} from '@tietokilta/ilmomasiina-models';
import {
  adminEventGetEventAttrs,
  eventGetAnswerAttrs,
  eventGetEventAttrs,
  eventGetQuestionAttrs,
  eventGetQuotaAttrs,
  eventGetSignupAttrs,
} from '@tietokilta/ilmomasiina-models/dist/attrs/event';
import { Answer } from '../../models/answer';
import { Event } from '../../models/event';
import { Question } from '../../models/question';
import { Quota } from '../../models/quota';
import { Signup } from '../../models/signup';
import { stringifyDates } from '../utils';

const answerOrdering: Order = [
  ['order', 'ASC'],
  [Signup, 'createdAt', 'ASC'],
];

export async function eventDetailsForUser(
  eventSlug: EventSlug,
): Promise<UserEventResponse> {
  // First query general event information
  const event = await Event.scope('user').findOne({
    where: { slug: eventSlug },
    attributes: [...eventGetEventAttrs],
    include: [
      {
        model: Question,
        attributes: [...eventGetQuestionAttrs],
      },
    ],
  });

  if (!event) {
    // Event not found with id, probably deleted
    throw new NotFound('No event found with id');
  }

  // Only return answers to public questions
  const publicQuestions = event.questions!
    .filter((question) => question.public)
    .map((question) => question.id);

  // Query all quotas for the event
  const quotas = await Quota.findAll({
    where: { eventId: event.id },
    attributes: [...eventGetQuotaAttrs],
    include: [
      // Include all signups for the quota
      {
        model: Signup.scope('active'),
        attributes: [...eventGetSignupAttrs, 'confirmedAt'],
        required: false,
        include: [
          // ... and public answers of signups
          {
            model: Answer,
            attributes: [...eventGetAnswerAttrs],
            required: false,
            where: { questionId: { [Op.in]: publicQuestions } },
          },
        ],
      },
    ],
    order: answerOrdering,
  });

  const questions = event.questions!.map((question) => ({
    ...question.get({ plain: true }),
    // Split answer options into array
    // TODO: Splitting by semicolon might cause problems - requires better solution
    options: question.options ? question.options.split(';') : null,
  }));

  // Dynamic extra fields
  let registrationClosed = true;
  let millisTillOpening = null;

  if (event.registrationStartDate !== null && event.registrationEndDate !== null) {
    const startDate = new Date(event.registrationStartDate);
    const now = new Date();
    millisTillOpening = Math.max(0, startDate.getTime() - now.getTime());

    const endDate = new Date(event.registrationEndDate);
    registrationClosed = now > endDate;
  }

  return {
    ...stringifyDates(event.get({ plain: true })),
    questions,

    quotas: quotas!.map((quota) => ({
      ...quota.get({ plain: true }),
      signups: event.signupsPublic // Hide all signups from non-admins if answers are not public
      // When signups are public:
        ? quota.signups!.map((signup) => ({
          ...stringifyDates(signup.get({ plain: true })),
          // Hide name if necessary
          firstName: event.nameQuestion && signup.namePublic ? signup.firstName : null,
          lastName: event.nameQuestion && signup.namePublic ? signup.lastName : null,
          answers: signup.answers!,
          status: signup.status,
          confirmed: signup.confirmedAt !== null,
        }))
      // When signups are not public:
        : [],
      signupCount: quota.signups!.length,
    })),

    millisTillOpening,
    registrationClosed,
  };
}

export async function eventDetailsForAdmin(
  eventID: EventID,
): Promise<AdminEventResponse> {
  // Admin queries include internal data such as confirmation email contents
  // Admin queries include emails and signup IDs
  // Admin queries also show past and draft events.

  const event = await Event.findOne({
    where: { id: eventID },
    attributes: [...adminEventGetEventAttrs],
    include: [
      // First include all questions (also non-public for the form)
      {
        model: Question,
        attributes: [...eventGetQuestionAttrs],
      },
      // Include quotas..
      {
        model: Quota,
        attributes: [...eventGetQuotaAttrs],
        // ... and signups of quotas
        include: [
          {
            model: Signup.scope('active'),
            attributes: [...eventGetSignupAttrs, 'confirmedAt', 'id', 'email'],
            required: false,
            // ... and answers of signups
            include: [
              {
                model: Answer,
                attributes: [...eventGetAnswerAttrs],
                required: false,
              },
            ],
          },
        ],
      },
    ],
    order: [
      [Question, 'order', 'ASC'],
      [Quota, 'order', 'ASC'],
      [Quota, Signup, 'createdAt', 'ASC'],
    ],
  });
  if (event === null) {
    // Event not found with id, probably deleted
    throw new NotFound('No event found with id');
  }

  // Admins get a simple result with many columns
  return stringifyDates({
    ...event.get({ plain: true }),
    questions: event.questions!.map((question) => ({
      ...question.get({ plain: true }),
      // Split answer options into array
      // TODO: Splitting by semicolon might cause problems - requires better solution
      options: question.options ? question.options.split(';') : null,
    })),
    updatedAt: event.updatedAt,
    quotas: event.quotas!.map((quota) => ({
      ...quota.get({ plain: true }),
      signups: quota.signups!.map((signup) => ({
        ...signup.get({ plain: true }),
        status: signup.status,
        answers: signup.answers!.map((answer) => answer.get({ plain: true })),
        confirmed: Boolean(signup.confirmedAt),
      })),
      signupCount: quota.signups!.length,
    })),
  });
}

export async function getEventDetailsForUser(
  request: FastifyRequest<{ Params: UserEventPathParams }>,
  reply: FastifyReply,
): Promise<UserEventResponse> {
  const res = await eventDetailsForUser(request.params.slug);
  reply.status(200);
  return res;
}

export async function getEventDetailsForAdmin(
  request: FastifyRequest<{ Params: AdminEventPathParams }>,
  reply: FastifyReply,
): Promise<AdminEventResponse> {
  const res = await eventDetailsForAdmin(request.params.id);
  reply.status(200);
  return res;
}
