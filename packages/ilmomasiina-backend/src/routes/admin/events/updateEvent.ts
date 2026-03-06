import { FastifyReply, FastifyRequest } from "fastify";
import { NotFound } from "http-errors";
import { Op, Transaction } from "sequelize";

import type {
  AdminEventPathParams,
  AdminEventResponse,
  EditConflictError,
  EventUpdateBody,
  WouldMoveSignupsToQueueError,
} from "@tietokilta/ilmomasiina-models";
import { AuditEvent } from "@tietokilta/ilmomasiina-models";
import { getSequelize } from "../../../models";
import { convertSequelizeValidationErrors } from "../../../models/errors";
import { Event } from "../../../models/event";
import { Question } from "../../../models/question";
import { Quota } from "../../../models/quota";
import { basicEventInfoCached, eventDetailsForAdmin, eventDetailsForUserCached } from "../../events/getEventDetails";
import { eventsListForUserCached } from "../../events/getEventsList";
import { refreshSignupPositions } from "../../signups/computeSignupPosition";
import { toDate } from "../../utils";
import { EditConflict } from "./errors";

export default async function updateEvent(
  request: FastifyRequest<{
    Params: AdminEventPathParams;
    Body: EventUpdateBody;
  }>,
  response: FastifyReply,
): Promise<AdminEventResponse | EditConflictError | WouldMoveSignupsToQueueError> {
  try {
    await getSequelize().transaction(async (transaction) => {
      // Get the event with all relevant information for the update
      const event = await Event.findByPk(request.params.id, {
        transaction,
        lock: Transaction.LOCK.UPDATE,
      });
      if (event === null) {
        throw new NotFound("No event found with id");
      }
      // Postgres doesn't support FOR UPDATE with LEFT JOIN
      event.quotas = await Quota.findAll({
        where: { eventId: event.id },
        attributes: ["id"],
        transaction,
        lock: Transaction.LOCK.UPDATE,
      });
      event.questions = await Question.findAll({
        where: { eventId: event.id },
        attributes: ["id"],
        transaction,
        lock: Transaction.LOCK.UPDATE,
      });

      // Find existing questions and quotas for requested IDs, and add order fields
      const updatedQuestions = request.body.questions?.map((question, order) => ({
        ...question,
        ...Question.normalizeOptions(question),
        order,
        existing: question.id ? event.questions!.find((old) => question.id === old.id) : undefined,
      }));
      const updatedQuotas = request.body.quotas?.map((quota, order) => ({
        ...quota,
        order,
        existing: quota.id ? event.quotas!.find((old) => quota.id === old.id) : undefined,
      }));

      // Find questions and quotas that were requested by ID but don't exist
      const deletedQuestions =
        updatedQuestions?.filter((question) => !question.existing && question.id).map((question) => question.id!) ?? [];
      const deletedQuotas =
        updatedQuotas?.filter((quota) => !quota.existing && quota.id).map((quota) => quota.id!) ?? [];

      // Check for edit conflicts
      const expectedUpdatedAt = new Date(request.body.updatedAt ?? "");
      if (
        event.updatedAt.getTime() !== expectedUpdatedAt.getTime() ||
        deletedQuestions.length ||
        deletedQuotas.length
      ) {
        throw new EditConflict(event.updatedAt, deletedQuotas, deletedQuestions);
      }

      // Update the Event
      const wasPublic = !event.draft;
      await event.set({
        ...request.body,
        registrationEndDate: toDate(request.body.registrationEndDate),
        registrationStartDate: toDate(request.body.registrationStartDate),
        date: toDate(request.body.date),
        endDate: toDate(request.body.endDate),
      });
      // Validate and fixup data within languages. This uses event.languages and is thus done after set()
      event.validateLanguages(updatedQuestions ?? event.questions!, updatedQuotas ?? event.quotas!);

      await event.save({ transaction });

      if (updatedQuestions !== undefined) {
        const reuseQuestionIds = updatedQuestions
          .map((question) => question.id)
          .filter((questionId) => questionId) as Question["id"][];

        // Remove previous Questions not present in request
        await Question.destroy({
          where: {
            eventId: event.id,
            id: { [Op.notIn]: reuseQuestionIds },
          },
          transaction,
        });

        // Update or create the new Questions
        await Promise.all(
          updatedQuestions.map(async (question) => {
            // Update if an id was provided
            if (question.existing) {
              await question.existing.update(question, { transaction });
            } else {
              await Question.create({ ...question, eventId: event.id }, { transaction });
            }
          }),
        );
      }

      if (updatedQuotas !== undefined) {
        const reuseQuotaIds = updatedQuotas.map((quota) => quota.id).filter((quotaId) => quotaId) as Quota["id"][];

        // Remove previous Quotas not present in request
        await Quota.destroy({
          where: {
            eventId: event.id,
            id: { [Op.notIn]: reuseQuotaIds },
          },
          transaction,
        });

        // Update or create the new Quotas
        await Promise.all(
          updatedQuotas.map(async (quota) => {
            // Update if an id was provided
            if (quota.existing) {
              await quota.existing.update(quota, { transaction });
            } else {
              await Quota.create({ ...quota, eventId: event.id }, { transaction });
            }
          }),
        );
      }

      // Refresh positions, but don't move signups to queue unless explicitly allowed
      await refreshSignupPositions(event, transaction, request.body.moveSignupsToQueue);

      const isPublic = !event.draft;
      let action: AuditEvent;
      if (isPublic === wasPublic) action = AuditEvent.EDIT_EVENT;
      else action = isPublic ? AuditEvent.PUBLISH_EVENT : AuditEvent.UNPUBLISH_EVENT;

      await request.logEvent(action, { event, transaction });
    });
  } catch (error) {
    throw convertSequelizeValidationErrors(error);
  }

  eventsListForUserCached.invalidate();
  basicEventInfoCached.invalidate();
  eventDetailsForUserCached.invalidate();

  const updatedEvent = await eventDetailsForAdmin(request.params.id);

  response.status(200);
  return updatedEvent;
}
