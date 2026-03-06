import { useMemo } from "react";

import find from "lodash-es/find";
import orderBy from "lodash-es/orderBy";
import { useTranslation } from "react-i18next";

import { getSignupsAsList, stringifyAnswer } from "@tietokilta/ilmomasiina-client/dist/utils/signupUtils";
import type { AdminEventResponse, AdminSignupSchema, QuestionID } from "@tietokilta/ilmomasiina-models";
import { PaymentMode, SignupStatus } from "@tietokilta/ilmomasiina-models";
import type { AdminQuotaSignups, AdminSignupWithQuota } from "../../../modules/editor/types";

export function getAnswersFromSignup(event: AdminEventResponse, signup: AdminSignupSchema) {
  const answers: Record<QuestionID, string | string[]> = {};

  for (const question of event.questions) {
    const answer = find(signup.answers, { questionId: question.id });
    answers[question.id] = answer?.answer || "";
  }

  return answers;
}

/** Formats all signups to an event into a single list. */
export function getSignupsForAdminList(event: AdminEventResponse): AdminSignupWithQuota[] {
  const signupsArray = getSignupsAsList(event);
  return orderBy(signupsArray, [
    // Deleted signups go last
    (signup) => (signup.deletedAt ? 1 : 0),
    (signup) => [SignupStatus.IN_QUOTA, SignupStatus.IN_OPEN_QUOTA, SignupStatus.IN_QUEUE, null].indexOf(signup.status),
    "createdAt",
  ]);
}

/** Gathers all signups of an event into quotas (including those in the open quota) and the queue. */
export function getSignupsByQuotaForAdminList(event: AdminEventResponse): AdminQuotaSignups[] {
  const quotas = event.quotas.map(
    (quota): AdminQuotaSignups => ({
      ...quota,
      type: SignupStatus.IN_QUOTA,
      signups: quota.signups
        .filter((signup) => signup.status !== SignupStatus.IN_QUEUE)
        .map((signup) => ({ ...signup, quota })),
    }),
  );

  const queueSignups = getSignupsAsList(event).filter((signup) => signup.status === SignupStatus.IN_QUEUE);
  const queue: AdminQuotaSignups[] = queueSignups.length
    ? [
        {
          type: SignupStatus.IN_QUEUE,
          id: null,
          title: null,
          size: null,
          signups: queueSignups,
          signupCount: queueSignups.length,
        },
      ]
    : [];

  return [...quotas, ...queue];
}

/** Returns a formatter for seconds-accurate datetimes like "31.12.2024 23:59:59". */
function getCsvDateTimeFormatter() {
  return new Intl.DateTimeFormat("fi-FI", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
    timeZone: TIMEZONE,
  });
}

/** Converts an array of signup rows from `getSignupsForAdminList` to a an array of CSV cells. */
export function useConvertSignupsToCSV(
  event: AdminEventResponse | null,
  signups: AdminSignupWithQuota[] | null,
): string[][] {
  const { t } = useTranslation();
  return useMemo(() => {
    if (!event || !signups) return [];
    const dateFormat = getCsvDateTimeFormatter();
    return [
      // Headers
      [
        ...(event.nameQuestion ? [t("editor.signups.column.firstName"), t("editor.signups.column.lastName")] : []),
        ...(event.emailQuestion ? [t("editor.signups.column.email")] : []),
        t("editor.signups.column.quota"),
        ...event.questions.map(({ question }) => question),
        t("editor.signups.column.time"),
        ...(event.payments !== PaymentMode.DISABLED
          ? [
              t("editor.signups.column.price"),
              t("editor.signups.column.currency"),
              t("editor.signups.column.paymentStatus"),
            ]
          : []),
      ],
      // Data rows
      ...signups.map((signup) => {
        const answerMap = getAnswersFromSignup(event, signup);
        const signupStatus =
          signup.status && signup.status !== SignupStatus.IN_QUOTA
            ? ` (${t(`editor.signups.column.status.${signup.status}`)})`
            : "";
        return [
          ...(event.nameQuestion ? [signup.firstName || "", signup.lastName || ""] : []),
          ...(event.emailQuestion ? [signup.email || ""] : []),
          `${signup.quota.title}${signupStatus}`,
          ...event.questions.map((question) => stringifyAnswer(answerMap[question.id])),
          dateFormat.format(new Date(signup.createdAt)),
          ...(event.payments !== PaymentMode.DISABLED
            ? [
                signup.price != null ? (signup.price / 100).toFixed(2) : "",
                signup.currency || "",
                signup.paymentStatus ? t(`editor.signups.column.paymentStatus.${signup.paymentStatus}`) : "",
              ]
            : []),
        ];
      }),
    ];
  }, [event, signups, t]);
}
