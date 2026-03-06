import moment from "moment-timezone";

import { SignupStatus } from "@tietokilta/ilmomasiina-models";
import config, { editSignupUrl } from "../config";
import i18n from "../i18n";
import { Event } from "../models/event";
import { Payment } from "../models/payment";
import { Signup } from "../models/signup";
import { generateToken } from "../routes/signups/editTokens";
import EmailService, { ConfirmationMailParams, PaymentMailParams, PromotedFromQueueMailParams } from ".";

/**
 * In test mode, we want to "send" emails synchronously so that we can verify the mock emails.
 *
 * In production, we want to send emails asynchronously ("fire and forget") so that we don't
 * block transactions or fail operations due to email sending issues.
 */
function sendSynchronouslyInTest<A extends any[]>(func: (...args: A) => Promise<void>): (...args: A) => Promise<void> {
  if (config.nodeEnv === "test" || config.nodeEnv === "bench") return func;

  return async (...args: A) => {
    func(...args).catch((err) => {
      console.error("Error sending email:", err);
    });
  };
}

/** Fetches information necessary for a "promoted from queue" email and sends it. */
export const sendPromotedFromQueueMail = sendSynchronouslyInTest(async (signup: Signup) => {
  if (!signup.email) return; // Nowhere to send email to

  const lang = signup.language ?? config.defaultLanguage;

  // eslint-disable-next-line no-param-reassign
  signup.payments = await signup.getPayments();
  const quota = await signup.getQuota({ attributes: [], include: [Event] });
  if (!quota || !quota.event) return; // Quota or event soft deleted
  const { event } = quota;

  const dateFormat = i18n.t("dateFormat.general", { lng: lang });
  const date = event.date && moment(event.date).tz(config.timezone).format(dateFormat);

  const editToken = generateToken(signup.id);
  const cancelLink = editSignupUrl({ id: signup.id, editToken, lang, frontend: event.preferredFrontend });

  const params: PromotedFromQueueMailParams = {
    event,
    date,
    paymentStatus: signup.effectivePaymentStatus,
    cancelLink,
  };

  await EmailService.sendPromotedFromQueueMail(signup.email, signup.language, params);
});

/** Fetches information necessary for a signup confirmation email and sends it. */
export const sendSignupConfirmationMail = sendSynchronouslyInTest(
  async (signup: Signup, type: ConfirmationMailParams["type"], admin: boolean) => {
    if (!signup.email) return;

    const lang = signup.language ?? config.defaultLanguage;

    // eslint-disable-next-line no-param-reassign
    signup.payments = await signup.getPayments();
    const answers = await signup.getAnswers();
    const quota = await signup.getQuota({ include: [Event] });
    if (!quota || !quota.event) return; // Quota or event soft deleted
    const { event } = quota;
    const questions = await event.getQuestions({ order: [["order", "ASC"]] });

    const localeQuestions = event.languages[lang]?.questions ?? questions;

    // Show name only if filled
    const fullName = `${signup.firstName ?? ""} ${signup.lastName ?? ""}`.trim();

    const questionFields = questions
      .map((question, index) => [index, question, answers.find((answer) => answer.questionId === question.id)] as const)
      .filter(([, , answer]) => answer)
      .map(([index, question, answer]) => ({
        label: localeQuestions[index]?.question || question.question,
        answer: Array.isArray(answer!.answer) ? answer!.answer.join(", ") : answer!.answer,
      }));

    const dateFormat = i18n.t("dateFormat.general", { lng: lang });
    const date = event.date && moment(event.date).tz(config.timezone).format(dateFormat);

    const editToken = generateToken(signup.id);
    const cancelLink = editSignupUrl({ id: signup.id, editToken, lang, frontend: event.preferredFrontend });

    const params: ConfirmationMailParams = {
      name: fullName,
      email: signup.email,
      quota: quota.title,
      answers: questionFields,
      queuePosition: signup.status === SignupStatus.IN_QUEUE ? signup.position : null,
      paymentStatus: signup.effectivePaymentStatus,
      type,
      admin,
      date,
      event,
      cancelLink,
    };

    await EmailService.sendConfirmationMail(signup.email, signup.language, params);
  },
);

/** Fetches information necessary for a payment confirmation email and sends it. */
export const sendPaymentConfirmationMail = sendSynchronouslyInTest(async (payment: Payment) => {
  const signup = await payment.getSignup();
  if (!signup.email) return;

  const lang = signup.language ?? config.defaultLanguage;

  const quota = await signup.getQuota({ attributes: [], include: [Event] });
  if (!quota || !quota.event) return; // Quota or event soft deleted
  const { event } = quota;

  const editToken = generateToken(signup.id);
  const cancelLink = editSignupUrl({ id: signup.id, editToken, lang, frontend: event.preferredFrontend });

  const priceFormatter = new Intl.NumberFormat(i18n.t("currencyFormat.locale", { lng: lang }), {
    style: "currency",
    currency: payment.currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const params: PaymentMailParams = {
    event,
    totalFormatted: priceFormatter.format(payment.amount / 100),
    currency: payment.currency,
    products: payment.products.map((product) => ({
      name: product.name,
      amount: product.amount,
      unitPriceFormatted: priceFormatter.format(product.unitPrice / 100),
    })),
    cancelLink,
  };

  await EmailService.sendPaymentConfirmationMail(signup.email, signup.language, params);
});
