import { FastifyReply, FastifyRequest } from "fastify";
import { omit } from "lodash";

import type { AdminEventResponse, EventCreateBody } from "@tietokilta/ilmomasiina-models";
import { AuditEvent } from "@tietokilta/ilmomasiina-models";
import { getSequelize } from "../../../models";
import { convertSequelizeValidationErrors } from "../../../models/errors";
import { Event } from "../../../models/event";
import { Question } from "../../../models/question";
import { Quota } from "../../../models/quota";
import { basicEventInfoCached, eventDetailsForAdmin, eventDetailsForUserCached } from "../../events/getEventDetails";
import { eventsListForUserCached } from "../../events/getEventsList";
import { toDate } from "../../utils";

export default async function createEvent(
  request: FastifyRequest<{ Body: EventCreateBody }>,
  response: FastifyReply,
): Promise<AdminEventResponse> {
  try {
    // Create the event, quotas and questions - Sequelize will handle validation
    const event = await getSequelize().transaction(async (transaction) => {
      const toCreate = new Event({
        // Ensure event id is always generated
        ...omit(request.body, "id"),
        date: toDate(request.body.date),
        endDate: toDate(request.body.endDate),
        registrationStartDate: toDate(request.body.registrationStartDate),
        registrationEndDate: toDate(request.body.registrationEndDate),
      });
      // Remove options from question types that don't support them. This must be done before validateLanguages().
      const questionsToCreate = request.body.questions.map((question) => ({
        ...question,
        ...Question.normalizeOptions(question),
      }));
      // Validate and fixup data within languages. This also requires the
      toCreate.validateLanguages(questionsToCreate, request.body.quotas);

      const created = await toCreate.save({ transaction });
      await Question.bulkCreate(
        // add order and eventId to questions
        questionsToCreate.map((question, order) => ({
          ...question,
          eventId: created.id,
          order,
        })),
        // Ensure validation is run for each question
        { transaction, validate: true },
      );
      await Quota.bulkCreate(
        // add order and eventId to quotas
        request.body.quotas.map((question, order) => ({
          ...question,
          eventId: created.id,
          order,
        })),
        // Ensure validation is run for each quota
        { transaction, validate: true },
      );

      await request.logEvent(AuditEvent.CREATE_EVENT, {
        event: created,
        transaction,
      });

      return created;
    });

    eventsListForUserCached.invalidate();
    basicEventInfoCached.invalidate();
    eventDetailsForUserCached.invalidate();

    const eventDetails = await eventDetailsForAdmin(event.id);

    response.status(201);
    return eventDetails;
  } catch (error) {
    throw convertSequelizeValidationErrors(error);
  }
}
