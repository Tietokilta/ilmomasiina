import { FastifyReply, FastifyRequest } from "fastify";
import { pick } from "lodash";

import type { AdminEventResponse, EventCreateBody } from "@tietokilta/ilmomasiina-models";
import { AuditEvent } from "@tietokilta/ilmomasiina-models";
import { getDb } from "../../../db";
import { eventTable, questionTable, quotaTable } from "../../../db/schema";
import { convertEventDatabaseErrors } from "../../../models/errors";
import { EVENT_EDITABLE_COLUMNS, validateEvent, validateLanguages } from "../../../models/event";
import { normalizeOptions, QUESTION_EDITABLE_COLUMNS, validateQuestion } from "../../../models/question";
import { QUOTA_EDITABLE_COLUMNS } from "../../../models/quota";
import { basicEventInfoCached, eventDetailsForAdmin, eventDetailsForUserCached } from "../../events/getEventDetails";
import { eventsListForUserCached } from "../../events/getEventsList";
import { toDate } from "../../utils";

export default async function createEvent(
  request: FastifyRequest<{ Body: EventCreateBody }>,
  response: FastifyReply,
): Promise<AdminEventResponse> {
  // Only take the editable fields: IDs and timestamps are always generated, and the editor sends extra fields.
  const attrs = pick(request.body, EVENT_EDITABLE_COLUMNS);
  const quotas = request.body.quotas.map((quota) => pick(quota, QUOTA_EDITABLE_COLUMNS));
  const eventValues = {
    ...attrs,
    date: toDate(attrs.date),
    endDate: toDate(attrs.endDate),
    registrationStartDate: toDate(attrs.registrationStartDate),
    registrationEndDate: toDate(attrs.registrationEndDate),
  };
  // Remove options from question types that don't support them. This must be done before validateLanguages().
  const questions = request.body.questions.map((question) => ({
    ...pick(question, QUESTION_EDITABLE_COLUMNS),
    ...normalizeOptions(question),
  }));

  validateEvent(eventValues);
  questions.forEach(validateQuestion);
  // Validate and fixup data within languages.
  validateLanguages(eventValues.languages, questions, quotas);

  try {
    const event = await getDb().transaction(async (transaction) => {
      const [created] = await transaction.insert(eventTable).values(eventValues).returning();
      if (questions.length) {
        // add order and eventId to questions
        await transaction
          .insert(questionTable)
          .values(questions.map((question, order) => ({ ...question, eventId: created.id, order })));
      }
      if (quotas.length) {
        // add order and eventId to quotas
        await transaction
          .insert(quotaTable)
          .values(quotas.map((quota, order) => ({ ...quota, eventId: created.id, order })));
      }

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
    throw convertEventDatabaseErrors(error);
  }
}
