import React from "react";

import { useTranslation } from "react-i18next";

import { SignupStatus } from "@tietokilta/ilmomasiina-models";
import { useSingleEventContext } from "../../../modules/singleEvent";
import QuotaProgress from "./QuotaProgress";

const QuotaStatus = () => {
  const { event, signupsByQuota } = useSingleEventContext();
  const { t } = useTranslation();
  return (
    <div className="ilmo--side-widget">
      <h3>{t("singleEvent.quotaCounts.title")}</h3>
      {signupsByQuota!.map((quota) => {
        switch (quota.type) {
          case SignupStatus.IN_QUOTA:
            return (
              <QuotaProgress
                key={quota.id}
                title={quota.title!}
                value={quota.signupCount}
                max={quota.size || Infinity}
              />
            );
          case SignupStatus.IN_OPEN_QUOTA:
            return (
              <QuotaProgress
                key={quota.id}
                title={t("singleEvent.quotaCounts.openQuota")}
                value={quota.signupCount}
                max={event!.openQuotaSize}
              />
            );
          case SignupStatus.IN_QUEUE:
            if (quota.signupCount > 0) {
              return <p key={quota.id}>{t("singleEvent.quotaCounts.queue", { count: quota.signupCount })}</p>;
            }
            return null;
          default:
            return null;
        }
      })}
    </div>
  );
};

export default QuotaStatus;
