import React from "react";

import filter from "lodash-es/filter";
import { Table } from "react-bootstrap";
import { useTranslation } from "react-i18next";

import { SignupStatus } from "@tietokilta/ilmomasiina-models";
import { useSingleEventContext } from "../../../modules/singleEvent";
import { QuotaSignups } from "../../../utils/signupUtils";
import SignupListRow from "./SignupListRow";

type Props = {
  isSingleQuota: boolean;
  quota: QuotaSignups;
};

const SignupList = ({ isSingleQuota, quota }: Props) => {
  const { signups } = quota;
  const { questions, nameQuestion } = useSingleEventContext().event!;
  const showQuotas = !isSingleQuota && quota.type !== SignupStatus.IN_QUOTA;
  const { t } = useTranslation();
  return (
    <div className="ilmo--quota-signups">
      <h3>{quota.type !== SignupStatus.IN_QUOTA ? t(`singleEvent.signups.quotaTitle.${quota.type}`) : quota.title}</h3>
      {!signups?.length ? (
        <p>{t("singleEvent.signups.emptyQuota")}</p>
      ) : (
        <div className="table-responsive">
          <Table size="sm">
            <thead className="thead-light">
              <tr>
                <th key="position">{t("singleEvent.signups.position")}</th>
                {nameQuestion && (
                  <th key="attendee" style={{ minWidth: 90 }}>
                    {t("singleEvent.signups.name")}
                  </th>
                )}
                {filter(questions, "public").map((question) => (
                  <th key={question.id}>{question.question}</th>
                ))}
                {showQuotas && <th key="quota">{t("singleEvent.signups.quota")}</th>}
                <th key="datetime" style={{ minWidth: 130 }}>
                  {t("singleEvent.signups.signupTime")}
                </th>
              </tr>
            </thead>
            <tbody>
              {signups.map((signup, i) => (
                <SignupListRow
                  index={i + 1}
                  signup={signup}
                  showQuota={showQuotas}
                  // eslint-disable-next-line react/no-array-index-key
                  key={i}
                />
              ))}
            </tbody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default SignupList;
