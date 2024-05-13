import moment from 'moment-timezone';

import config from '../config';
import i18n from '../i18n';
import { Signup } from '../models/signup';
import { generateToken } from '../routes/signups/editTokens';
import EmailService from '.';

export default async function sendSignupConfirmationMail(signup: Signup) {
  if (signup.email === null) return;

  const lng = signup.language ?? undefined;

  // TODO: convert to include
  const answers = await signup.getAnswers();
  const quota = await signup.getQuota();
  const event = await quota.getEvent();
  const questions = await event.getQuestions();

  // Show name only if filled
  const fullName = `${signup.firstName ?? ''} ${signup.lastName ?? ''}`.trim();

  const questionFields = questions
    .map((question) => <const>[
      question,
      answers.find((answer) => answer.questionId === question.id),
    ])
    .filter(([, answer]) => answer)
    .map(([question, answer]) => ({
      label: question.question,
      answer: Array.isArray(answer!.answer) ? answer!.answer.join(', ') : answer!.answer,
    }));

  const edited = answers.some((answer) => answer.createdAt.getTime() !== answer.updatedAt.getTime());

  const dateFormat = i18n.t('dateFormat.general', { lng });
  const date = event.date && moment(event.date).tz(config.timezone).format(dateFormat);

  const editToken = generateToken(signup.id);
  const cancelLink = config.editSignupUrl
    .replace(/\{id\}/g, signup.id)
    .replace(/\{editToken\}/g, editToken);

  const params = {
    name: fullName,
    email: signup.email,
    telegram: signup.telegram,
    quota: quota.title,
    answers: questionFields,
    edited,
    date,
    event,
    cancelLink,
  };

  await EmailService.sendConfirmationMail(signup.email, signup.language, params);
}
