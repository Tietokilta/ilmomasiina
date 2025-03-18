import { useMemo } from "react";

import find from "lodash-es/find";
import orderBy from "lodash-es/orderBy";
import { useTranslation } from "react-i18next";

import { timezone } from "@tietokilta/ilmomasiina-components";
import {
  AnySignupSchema,
  getSignupsAsList,
  QuotaSignups,
  SignupWithQuota,
  stringifyAnswer,
} from "@tietokilta/ilmomasiina-components/dist/utils/signupUtils";
import type { AdminEventResponse, AdminQuotaWithSignups, QuestionID, SignupID } from "@tietokilta/ilmomasiina-models";
import { SignupStatus } from "@tietokilta/ilmomasiina-models";

function getAnswersFromSignup(event: AdminEventResponse, signup: AnySignupSchema) {
  const answers: Record<QuestionID, string | string[]> = {};

  event.questions.forEach((question) => {
    const answer = find(signup.answers, { questionId: question.id });
    answers[question.id] = answer?.answer || "";
  });

  return answers;
}

export type FormattedSignup = {
  id?: SignupID;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  answers: Record<QuestionID, string | string[]>;
  quota: AdminQuotaWithSignups;
  status: SignupStatus | null;
  createdAt: Date;
  confirmed: boolean;
};

function formatSignupForAdminList(
  event: AdminEventResponse,
  signup: SignupWithQuota<AdminEventResponse>,
): FormattedSignup {
  return {
    ...signup,
    createdAt: new Date(signup.createdAt),
    answers: getAnswersFromSignup(event, signup),
  };
}

/** Formats all signups to an event into a single list. */
export function getSignupsForAdminList(event: AdminEventResponse): FormattedSignup[] {
  const signupsArray = getSignupsAsList(event);
  const formatted = signupsArray.map((signup) => formatSignupForAdminList(event, signup));
  return orderBy(formatted, [
    (signup) => [SignupStatus.IN_QUOTA, SignupStatus.IN_OPEN_QUOTA, SignupStatus.IN_QUEUE, null].indexOf(signup.status),
    "createdAt",
  ]);
}

/** Gathers all signups of an event into quotas (including those in the open quota) and the queue. */
export function getSignupsByQuotaForAdminList(event: AdminEventResponse): QuotaSignups<FormattedSignup>[] {
  const quotas = event.quotas.map(
    (quota): QuotaSignups<FormattedSignup> => ({
      ...quota,
      type: SignupStatus.IN_QUOTA,
      signups: quota.signups
        .filter((signup) => signup.status !== SignupStatus.IN_QUEUE)
        .map((signup) => formatSignupForAdminList(event, { ...signup, quota })),
    }),
  );

  const queueSignups = getSignupsAsList(event)
    .filter((signup) => signup.status === SignupStatus.IN_QUEUE)
    .map((signup) => formatSignupForAdminList(event, signup));
  const queue: QuotaSignups<FormattedSignup>[] = queueSignups.length
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
    timeZone: timezone(),
  });
}

/** Converts an array of signup rows from `getSignupsForAdminList` to a an array of CSV cells. */
export function useConvertSignupsToCSV(
  event: AdminEventResponse | null,
  signups: FormattedSignup[] | null,
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
      ],
      // Data rows
      ...signups.map((signup) => {
        const signupStatus =
          signup.status && signup.status !== SignupStatus.IN_QUOTA
            ? ` (${t(`editor.signups.column.status.${signup.status}`)})`
            : "";
        return [
          ...(event.nameQuestion ? [signup.firstName || "", signup.lastName || ""] : []),
          ...(event.emailQuestion ? [signup.email || ""] : []),
          `${signup.quota.title}${signupStatus}`,
          ...event.questions.map((question) => stringifyAnswer(signup.answers[question.id])),
          dateFormat.format(signup.createdAt),
        ];
      }),
    ];
  }, [event, signups, t]);
}
