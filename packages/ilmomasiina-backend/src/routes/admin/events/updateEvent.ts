import {
  and, eq, notInArray,
} from 'drizzle-orm';
import { FastifyReply, FastifyRequest } from 'fastify';
import { NotFound } from 'http-errors';

import type {
  AdminEventPathParams, AdminEventResponse, EditConflictError, EventUpdateBody, WouldMoveSignupsToQueueError,
} from '@tietokilta/ilmomasiina-models';
import { AuditEvent } from '@tietokilta/ilmomasiina-models';
import { db } from '../../../drizzle/db';
import { eventTable, questionTable, quotaTable } from '../../../drizzle/schema';
import { eventDetailsForAdmin } from '../../events/getEventDetails';
import { refreshSignupPositions } from '../../signups/computeSignupPosition';
import { toDate } from '../../utils';
import { EditConflict } from './errors';

export default async function updateEvent(
  request: FastifyRequest<{ Params: AdminEventPathParams, Body: EventUpdateBody }>,
  response: FastifyReply,
): Promise<AdminEventResponse | EditConflictError | WouldMoveSignupsToQueueError> {
  const { updatedAt, ...body } = request.body;
  await db.transaction(async (db) => {
    const event = await db.select()
      .from(eventTable)
      .where(eq(eventTable.id, request.params.id))
      .execute()
      .then((rows) => (rows.length > 0 ? rows[0] : null));

    if (!event) {
      throw new NotFound('No event found with id');
    }

    const quotas = await db.select()
      .from(quotaTable)
      .where(eq(quotaTable.eventId, event.id))
      .execute();

    const questions = await db.select()
      .from(questionTable)
      .where(eq(questionTable.eventId, event.id))
      .execute();

    const updatedQuestions = body.questions?.map((question) => ({
      ...question,
      existing: question.id ? questions.find((old) => question.id === old.id) : undefined,
    }));

    const updatedQuotas = body.quotas?.map((quota) => ({
      ...quota,
      existing: quota.id ? quotas.find((old) => quota.id === old.id) : undefined,
    }));

    const deletedQuestions = updatedQuestions
      ?.filter((question): question is typeof question & { id: string } => !question.existing && !!question.id)
      .map((question) => question.id)
      ?? [];

    const deletedQuotas = updatedQuotas
      ?.filter((quota): quota is typeof quota & { id: string } => !quota.existing && !!quota.id)
      .map((quota) => quota.id)
      ?? [];

    const expectedUpdatedAt = new Date(updatedAt ?? '');
    if (
      event.updatedAt.getTime() !== expectedUpdatedAt.getTime()
      || deletedQuestions.length
      || deletedQuotas.length
    ) {
      throw new EditConflict(event.updatedAt, deletedQuotas, deletedQuestions);
    }

    const wasPublic = !event.draft;
    await db.update(eventTable)
      .set({
        ...body,
        registrationEndDate: toDate(body.registrationEndDate),
        registrationStartDate: toDate(body.registrationStartDate),
        date: toDate(body.date),
        endDate: toDate(body.endDate),
      })
      .where(eq(eventTable.id, event.id))
      .execute();

    if (updatedQuestions !== undefined) {
      const reuseQuestionIds = updatedQuestions
        .map((question) => question.id)
        .filter((questionId): questionId is string => !!questionId);

      await db.delete(questionTable)
        .where(and(eq(questionTable.eventId, event.id), notInArray(questionTable.id, reuseQuestionIds)))
        .execute();

      await Promise.all(updatedQuestions.map(async (question, order) => {
        const questionAttribs = {
          ...question,
          order,
        };
        if (question.existing) {
          await db.update(questionTable)
            .set(questionAttribs)
            .where(eq(questionTable.id, question.existing.id))
            .execute();
        } else {
          await db.insert(questionTable)
            .values({ ...questionAttribs, eventId: event.id })
            .execute();
        }
      }));
    }

    if (updatedQuotas !== undefined) {
      const reuseQuotaIds = updatedQuotas
        .map((quota) => quota.id)
        .filter((quotaId): quotaId is string => !!quotaId);

      await db.delete(quotaTable)
        .where(and(eq(quotaTable.eventId, event.id), notInArray(quotaTable.id, reuseQuotaIds)))
        .execute();

      await Promise.all(updatedQuotas.map(async (quota, order) => {
        const quotaAttribs = {
          ...quota,
          order,
        };
        if (quota.existing) {
          await db.update(quotaTable)
            .set(quotaAttribs)
            .where(eq(quotaTable.id, quota.existing.id))
            .execute();
        } else {
          await db.insert(quotaTable)
            .values({ ...quotaAttribs, eventId: event.id })
            .execute();
        }
      }));
    }

    await refreshSignupPositions(event, body.moveSignupsToQueue);

    const isPublic = !event.draft;
    let action: AuditEvent;
    if (isPublic === wasPublic) action = AuditEvent.EDIT_EVENT;
    else action = isPublic ? AuditEvent.PUBLISH_EVENT : AuditEvent.UNPUBLISH_EVENT;

    await request.logEvent(action, { event });
  }, { isolationLevel: 'serializable' });

  const updatedEvent = await eventDetailsForAdmin(request.params.id);

  response.status(200);
  return updatedEvent;
}
