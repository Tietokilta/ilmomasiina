import React from "react";

import filter from "lodash-es/filter";
import find from "lodash-es/find";
import { useTranslation } from "react-i18next";

import { useSingleEventContext } from "@tietokilta/ilmomasiina-client";
import { SignupWithQuota, stringifyAnswer } from "@tietokilta/ilmomasiina-client/dist/utils/signupUtils";
import { useActionDateTimeFormatter, useMillisecondsDateTimeFormatter } from "../../../utils/dateFormat";

type Props = {
  index: number;
  showQuota: boolean;
  signup: Omit<SignupWithQuota, "id">;
};

const SignupListRow = ({ showQuota, signup, index }: Props) => {
  const { firstName, lastName, namePublic, answers, quota, createdAt, confirmed } = signup;

  const { questions, nameQuestion } = useSingleEventContext().localizedEvent!;
  const { t } = useTranslation();
  const actionDateFormat = useActionDateTimeFormatter();
  const msDateFormat = useMillisecondsDateTimeFormatter();

  let fullName;
  if (!confirmed) {
    fullName = t("singleEvent.signups.unconfirmed");
  } else if (!namePublic) {
    fullName = t("singleEvent.signups.nameHidden");
  } else {
    fullName = `${firstName || ""} ${lastName || ""}`;
  }

  return (
    <tr className={!confirmed ? "ilmo--unconfirmed" : ""}>
      <td>{`${index}.`}</td>
      {nameQuestion && <td className={!confirmed || !namePublic ? "ilmo--hidden-name" : ""}>{fullName}</td>}
      {filter(questions, "public").map((question) => (
        <td key={question.id}>{stringifyAnswer(find(answers, { questionId: question.id })?.answer || "")}</td>
      ))}
      {showQuota && <td>{quota.title || ""}</td>}
      <td>
        {actionDateFormat.format(new Date(createdAt))}
        <span className="ilmo--hover-only">.{msDateFormat.format(new Date(createdAt))}</span>
      </td>
    </tr>
  );
};

export default SignupListRow;
