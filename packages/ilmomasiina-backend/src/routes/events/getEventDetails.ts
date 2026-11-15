import { FastifyReply, FastifyRequest } from "fastify";
import { NotFound } from "http-errors";
import moment from "moment";

import {
  AdminEventPathParams,
  AdminEventResponse,
  AdminSignupSchema,
  EventID,
  EventSlug,
  SignupPaymentStatus,
  UserEventPathParams,
  UserEventResponse,
} from "@tietokilta/ilmomasiina-models";
import { getDb } from "../../db";
import type { Answer } from "../../models/answer";
import {
  adminEventGetEventColumns,
  adminEventGetSignupColumns,
  eventGetAnswerColumns,
  eventGetEventColumns,
  eventGetQuestionColumns,
  eventGetQuotaColumns,
  eventGetSignupColumns,
} from "../../models/attrs";
import { effectiveEndDate, userEventFilter } from "../../models/event";
import type { Payment } from "../../models/payment";
import {
  activeSignupFilter,
  adminSignupFilter,
  effectivePaymentStatus,
  isConfirmed,
  Signup,
} from "../../models/signup";
import createCache from "../../util/cache";
import type { StringifyApi } from "../utils";

export const basicEventInfoCached = createCache({
  maxAgeMs: 5000,
  maxPendingAgeMs: 5000,
  logName: "basicEventInfoCached",
  async get(eventSlug: EventSlug) {
    // First query general event information
    const event = await getDb().query.event.findFirst({
      where: { AND: [userEventFilter(), { slug: eventSlug }] },
      columns: eventGetEventColumns,
      with: { questions: { columns: eventGetQuestionColumns, orderBy: { order: "asc" } } },
    });

    if (!event) {
      // Event not found with id, probably deleted
      throw new NotFound("No event found with slug");
    }

    // Only return answers to public questions
    const publicQuestions = event.questions.filter((question) => question.public).map((question) => question.id);

    return {
      event: { ...event, effectiveEndDate: effectiveEndDate(event) },
      publicQuestions,
    };
  },
});

export const eventDetailsForUserCached = createCache({
  maxAgeMs: 1000,
  maxPendingAgeMs: 1000,
  logName: "eventDetailsForUserCached",
  async get(eventSlug: EventSlug) {
    const { event, publicQuestions } = await basicEventInfoCached(eventSlug);

    // If event ended or registration closed than a week ago, don't return signups or quotas
    const effectiveEnd = event.effectiveEndDate;
    const isOld = effectiveEnd != null && effectiveEnd < moment().subtract(7, "days").valueOf();

    // Query all quotas for the event
    const quotas = isOld
      ? []
      : await getDb().query.quota.findMany({
          where: { eventId: event.id, deletedAt: { isNull: true } },
          columns: eventGetQuotaColumns,
          // First sort by Quota order, then by signup creation date
          orderBy: { order: "asc" },
          with: {
            // Include all signups for the quota
            signups: {
              where: activeSignupFilter(),
              columns: eventGetSignupColumns,
              orderBy: { createdAt: "asc" },
              with: {
                // ... and public answers of signups
                answers: {
                  columns: eventGetAnswerColumns,
                  where: { questionId: { in: publicQuestions } },
                },
              },
            },
          },
        });

    return {
      event: {
        ...event,
        quotas: quotas.map((quota) => ({
          ...quota,
          signups: event.signupsPublic // Hide all signups from non-admins if answers are not public
            ? // When signups are public:
              quota.signups.map((signup) => ({
                ...signup,
                // Hide name if necessary
                firstName: event.nameQuestion && signup.namePublic ? signup.firstName : null,
                lastName: event.nameQuestion && signup.namePublic ? signup.lastName : null,
                confirmed: isConfirmed(signup),
              }))
            : // When signups are not public:
              [],
          signupCount: quota.signups.length,
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

/** A signup with the data needed to show it to admins. */
type SignupForAdmin = Pick<Signup, keyof typeof adminEventGetSignupColumns> & {
  answers: Pick<Answer, "questionId" | "answer">[];
  payments: Pick<Payment, "status">[];
};

/** Converts a signup with answers and payments included to JSON for the admin API. */
export function formatSignupForAdmin({ payments, ...signup }: SignupForAdmin): AdminSignupSchema {
  const result = {
    ...signup,
    confirmed: isConfirmed(signup),
    paymentStatus: effectivePaymentStatus(signup, payments),
  };
  return result as unknown as StringifyApi<typeof result>;
}

export async function eventDetailsForAdmin(eventID: EventID): Promise<AdminEventResponse> {
  // Admin queries include internal data such as confirmation email contents
  // Admin queries include emails and signup IDs
  // Admin queries also show past and draft events.

  const event = await getDb().query.event.findFirst({
    where: { id: eventID, deletedAt: { isNull: true } },
    columns: adminEventGetEventColumns,
    // Include all questions (also non-public for the form)
    with: { questions: { columns: eventGetQuestionColumns, orderBy: { order: "asc" } } },
  });

  if (!event) {
    // Event not found with id, probably deleted
    throw new NotFound("No event found with id");
  }

  const quotas = await getDb().query.quota.findMany({
    where: { eventId: event.id, deletedAt: { isNull: true } },
    columns: eventGetQuotaColumns,
    // First sort by Quota order, then by signup creation date
    orderBy: { order: "asc" },
    with: {
      // Include all signups for the quotas
      signups: {
        where: adminSignupFilter(),
        columns: adminEventGetSignupColumns,
        orderBy: { createdAt: "asc" },
        // ... and answers and payments of signups
        with: {
          answers: { columns: eventGetAnswerColumns },
          payments: { columns: { status: true } },
        },
      },
    },
  });
  // Admins get a simple result with many columns
  // Filter out deleted signups that don't have PAID/REFUNDED status
  const res = {
    ...event,
    quotas: quotas.map((quota) => {
      const filteredSignups = quota.signups.filter((signup) => {
        // Include all non-deleted signups
        if (!signup.deletedAt) return true;
        // Only include deleted signups with PAID/REFUNDED status
        const status = effectivePaymentStatus(signup, signup.payments);
        return status === SignupPaymentStatus.PAID || status === SignupPaymentStatus.REFUNDED;
      });
      return {
        ...quota,
        signups: filteredSignups.map(formatSignupForAdmin),
        signupCount: filteredSignups.filter((s) => !s.deletedAt).length,
      };
    }),
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
