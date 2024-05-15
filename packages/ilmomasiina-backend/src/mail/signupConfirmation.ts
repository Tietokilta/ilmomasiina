import { eq } from 'drizzle-orm';
import moment from 'moment-timezone';

import config from '../config';
import { db } from '../drizzle/db';
import {
  answerTable, eventTable, questionTable, quotaTable,
} from '../drizzle/schema';
import i18n from '../i18n';
import { generateToken } from '../routes/signups/editTokens';
import EmailService from '.';

export default async function sendSignupConfirmationMail(signup: { firstName: string | null, lastName: string | null, email: string | null, language: string | null, id: string, quotaId: string }) {
  if (signup.email === null) return;

  const lng = signup.language ?? undefined;

  const results = await db.select({ event: { title: eventTable.title, location: eventTable.location }, date: eventTable.date, quotaTitle: quotaTable.title }).from(quotaTable).where(eq(quotaTable.id, signup.quotaId)).innerJoin(eventTable, eq(quotaTable.eventId, eventTable.id))
    .execute();
  if (results.length === 0) return;
  const res = results[0];
  const questions = await db.select().from(answerTable).innerJoin(questionTable, eq(answerTable.questionId, questionTable.id)).where(eq(answerTable.signupId, signup.id))
    .execute();

  // Show name only if filled
  const fullName = `${signup.firstName ?? ''} ${signup.lastName ?? ''}`.trim();

  const questionFields = questions.map(({ answer, question }) => ({ label: question.question, answer: Array.isArray(answer.answer) ? answer.answer.join(', ') : answer.answer }));

  const edited = questions.some(({ answer }) => answer.createdAt.getTime() !== answer.updatedAt.getTime());

  const dateFormat = i18n.t('dateFormat.general', { lng });
  const date = res.date && moment(res.date).tz(config.timezone).format(dateFormat);

  const editToken = generateToken(signup.id);
  const cancelLink = config.editSignupUrl
    .replace(/\{id\}/g, signup.id)
    .replace(/\{editToken\}/g, editToken);

  const params = {
    name: fullName,
    email: signup.email,
    quota: res.quotaTitle,
    answers: questionFields,
    edited,
    date,
    event: res.event,
    cancelLink,
  };

  await EmailService.sendConfirmationMail(signup.email, signup.language, params);
}
