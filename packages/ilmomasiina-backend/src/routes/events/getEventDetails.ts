import { FastifyReply, FastifyRequest } from "fastify";
import { NotFound } from "http-errors";
import { Op } from "sequelize";

import type {
  AdminEventPathParams,
  AdminEventResponse,
  EventID,
  EventSlug,
  UserEventPathParams,
  UserEventResponse,
} from "@tietokilta/ilmomasiina-models";
import {
  adminEventGetEventAttrs,
  eventGetAnswerAttrs,
  eventGetEventAttrs,
  eventGetQuestionAttrs,
  eventGetQuotaAttrs,
  eventGetSignupAttrs,
} from "@tietokilta/ilmomasiina-models/dist/attrs/event";
import { Answer } from "../../models/answer";
import { Event } from "../../models/event";
import { Question } from "../../models/question";
import { Quota } from "../../models/quota";
import { Signup } from "../../models/signup";
import createCache from "../../util/cache";
import { StringifyApi } from "../utils";

export const basicEventInfoCached = createCache({
  maxAgeMs: 5000,
  maxPendingAgeMs: 5000,
  async get(eventSlug: EventSlug) {
    // First query general event information
    const event = await Event.scope("user").findOne({
      where: { slug: eventSlug },
      attributes: eventGetEventAttrs,
      include: [
        {
          model: Question,
          attributes: eventGetQuestionAttrs,
        },
      ],
      order: [[Question, "order", "ASC"]],
    });

    if (!event) {
      // Event not found with id, probably deleted
      throw new NotFound("No event found with slug");
    }

    // Only return answers to public questions
    const publicQuestions = event.questions!.filter((question) => question.public).map((question) => question.id);

    return {
      event: {
        ...event.get({ plain: true }),
        questions: event.questions!.map((question) => question.get({ plain: true })),
      },
      publicQuestions,
    };
  },
});

export const eventDetailsForUserCached = createCache({
  maxAgeMs: 1000,
  maxPendingAgeMs: 1000,
  async get(eventSlug: EventSlug) {
    const { event, publicQuestions } = await basicEventInfoCached(eventSlug);

    // Query all quotas for the event
    const quotas = await Quota.findAll({
      where: { eventId: event.id },
      attributes: eventGetQuotaAttrs,
      include: [
        // Include all signups for the quota
        {
          model: Signup.scope("active"),
          attributes: eventGetSignupAttrs,
          required: false,
          include: [
            // ... and public answers of signups
            {
              model: Answer,
              attributes: eventGetAnswerAttrs,
              required: false,
              where: { questionId: { [Op.in]: publicQuestions } },
            },
          ],
        },
      ],
      // First sort by Quota order, then by signup creation date
      order: [
        ["order", "ASC"],
        [Signup, "createdAt", "ASC"],
      ],
    });

    return {
      event: {
        ...event,
        quotas: quotas.map((quota) => ({
          ...quota.get({ plain: true }),
          signups: event.signupsPublic // Hide all signups from non-admins if answers are not public
            ? // When signups are public:
              quota.signups!.map((signup) => ({
                ...signup.get({ plain: true }),
                // Hide name if necessary
                firstName: event.nameQuestion && signup.namePublic ? signup.firstName : null,
                lastName: event.nameQuestion && signup.namePublic ? signup.lastName : null,
                answers: signup.answers!,
                status: signup.status,
                confirmed: signup.confirmedAt !== null,
              }))
            : // When signups are not public:
              [],
          signupCount: quota.signups!.length,
        })),
      },
      registrationStartDate: event.registrationStartDate && new Date(event.registrationStartDate),
      registrationEndDate: event.registrationEndDate && new Date(event.registrationEndDate),
    };
  },
});

export async function eventDetailsForUser(eventSlug: EventSlug): Promise<UserEventResponse> {
  const { event, registrationStartDate, registrationEndDate } = await eventDetailsForUserCached(eventSlug);

  // Dynamic extra fields
  let registrationClosed = true;
  let millisTillOpening = null;

  if (registrationStartDate !== null && registrationEndDate !== null) {
    const startDate = new Date(registrationStartDate);
    const now = new Date();
    millisTillOpening = Math.max(0, startDate.getTime() - now.getTime());

    const endDate = new Date(registrationEndDate);
    registrationClosed = now > endDate;
  }

  const res = {
    ...event,
    millisTillOpening,
    registrationClosed,
  };
  return res as unknown as StringifyApi<typeof res>;
}

export async function eventDetailsForAdmin(eventID: EventID): Promise<AdminEventResponse> {
  // Admin queries include internal data such as confirmation email contents
  // Admin queries include emails and signup IDs
  // Admin queries also show past and draft events.

  const event = await Event.findOne({
    where: { id: eventID },
    attributes: adminEventGetEventAttrs,
    include: [
      // Include all questions (also non-public for the form)
      {
        model: Question,
        attributes: eventGetQuestionAttrs,
      },
    ],
    order: [[Question, "order", "ASC"]],
  });

  if (event === null) {
    // Event not found with id, probably deleted
    throw new NotFound("No event found with id");
  }

  const quotas = await Quota.findAll({
    where: { eventId: event.id },
    attributes: eventGetQuotaAttrs,
    // Include all signups for the quotas
    include: [
      {
        model: Signup.scope("active"),
        attributes: [...eventGetSignupAttrs, "id", "email"],
        required: false,
        // ... and answers of signups
        include: [
          {
            model: Answer,
            attributes: eventGetAnswerAttrs,
            required: false,
          },
        ],
      },
    ],
    // First sort by Quota order, then by signup creation date
    order: [
      ["order", "ASC"],
      [Signup, "createdAt", "ASC"],
    ],
  });

  // Admins get a simple result with many columns
  const res = {
    ...event.get({ plain: true }),
    questions: event.questions!.map((question) => question.get({ plain: true })),
    updatedAt: event.updatedAt,
    quotas: quotas.map((quota) => ({
      ...quota.get({ plain: true }),
      signups: quota.signups!.map((signup) => ({
        ...signup.get({ plain: true }),
        status: signup.status,
        answers: signup.answers!.map((answer) => answer.get({ plain: true })),
        confirmed: Boolean(signup.confirmedAt),
      })),
      signupCount: quota.signups!.length,
    })),
  };
  return res as unknown as StringifyApi<typeof res>;
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
