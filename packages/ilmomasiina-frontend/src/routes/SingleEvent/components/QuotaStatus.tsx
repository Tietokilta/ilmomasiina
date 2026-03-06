import React from "react";

import { useTranslation } from "react-i18next";

import { useSingleEventContext } from "@tietokilta/ilmomasiina-client";
import { SignupStatus } from "@tietokilta/ilmomasiina-models";
import QuotaProgress from "./QuotaProgress";

const QuotaStatus = () => {
  const { localizedEvent, signupsByQuota } = useSingleEventContext();
  const { t } = useTranslation();

  if (!signupsByQuota?.length) return null;
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
                max={localizedEvent!.openQuotaSize}
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
