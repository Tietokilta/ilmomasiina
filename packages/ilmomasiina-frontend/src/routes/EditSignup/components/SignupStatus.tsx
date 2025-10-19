import React from "react";

import { useTranslation } from "react-i18next";

import { useEditSignupContext } from "@tietokilta/ilmomasiina-client";
import { SignupStatus as SignupStatusEnum } from "@tietokilta/ilmomasiina-models";

const SignupStatus = () => {
  const { localizedEvent: event, localizedSignup: signup } = useEditSignupContext();
  const { status, position, quota } = signup!;
  const { openQuotaSize } = event!;
  const { t } = useTranslation();

  if (!status) return null;

  if (status === SignupStatusEnum.IN_QUOTA) {
    return (
      <p>
        {t("editSignup.position.quota", {
          quota: quota.title,
          position: `${position}${quota.size ? ` / ${quota.size}` : ""}`,
        })}
      </p>
    );
  }

  if (status === SignupStatusEnum.IN_OPEN_QUOTA) {
    return <p>{t("editSignup.position.openQuota", { position: `${position} / ${openQuotaSize}.` })}</p>;
  }

  return <p>{t("editSignup.position.queue", { position })}</p>;
};

export default SignupStatus;
