import moment from "moment-timezone";

import { SignupStatus } from "@tietokilta/ilmomasiina-models";
import config, { editSignupUrl } from "../config";
import i18n from "../i18n";
import { Signup } from "../models/signup";
import { generateToken } from "../routes/signups/editTokens";
import EmailService, { ConfirmationMailParams } from ".";

export default async function sendSignupConfirmationMail(
  signup: Signup,
  type: ConfirmationMailParams["type"],
  admin: boolean,
) {
  if (signup.email === null) return;

  const lng = signup.language ?? undefined;

  // TODO: convert to include
  const answers = await signup.getAnswers();
  const quota = await signup.getQuota();
  const event = await quota.getEvent();
  const questions = await event.getQuestions();

  // Show name only if filled
  const fullName = `${signup.firstName ?? ""} ${signup.lastName ?? ""}`.trim();

  const questionFields = questions
    .map((question) => <const>[question, answers.find((answer) => answer.questionId === question.id)])
    .filter(([, answer]) => answer)
    .map(([question, answer]) => ({
      label: question.question,
      answer: Array.isArray(answer!.answer) ? answer!.answer.join(", ") : answer!.answer,
    }));

  const dateFormat = i18n.t("dateFormat.general", { lng });
  const date = event.date && moment(event.date).tz(config.timezone).format(dateFormat);

  const editToken = generateToken(signup.id);
  const cancelLink =
    event.category === "Juhlavuosi"
      ? editSignupUrl({
          id: signup.id,
          editToken,
          lang: signup.language || config.defaultLanguage,
          base_url: "https://juhlavuosi.fi/{lang}/signups/{id}/{editToken}",
        })
      : editSignupUrl({
          id: signup.id,
          editToken,
          lang: signup.language || config.defaultLanguage,
        });

  const params = {
    name: fullName,
    email: signup.email,
    quota: quota.title,
    answers: questionFields,
    queuePosition: signup.status === SignupStatus.IN_QUEUE ? signup.position : null,
    type,
    admin,
    date,
    event,
    cancelLink,
  };

  await EmailService.sendConfirmationMail(signup.email, signup.language, params);
}
