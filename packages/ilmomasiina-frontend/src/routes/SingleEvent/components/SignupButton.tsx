import React, { useCallback, useState } from "react";

import { Button } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import { toast } from "react-toastify";

import { ApiError, beginSignup, errorDesc, useSingleEventContext } from "@tietokilta/ilmomasiina-client";
import { SignupState, signupState } from "@tietokilta/ilmomasiina-client/dist/utils/signupState";
import type { QuotaID } from "@tietokilta/ilmomasiina-models";
import type { TKey } from "../../../i18n";
import paths from "../../../paths";
import { useSignupStateText } from "../../../utils/signupStateText";

// Show the countdown one minute before opening the signup.
const COUNTDOWN_DURATION = 60 * 1000;

type SignupButtonProps = {
  isOpen: boolean;
  isClosed: boolean;
  seconds: number;
  total: number;
};

const SignupButton = ({ isOpen, isClosed, seconds, total }: SignupButtonProps) => {
  const { registrationStartDate, registrationEndDate, quotas } = useSingleEventContext().localizedEvent!;
  const { preview } = useSingleEventContext();
  const history = useHistory();
  const eventState = signupState(registrationStartDate, registrationEndDate);
  const [submitting, setSubmitting] = useState(false);
  const isOnly = quotas.length === 1;
  const { t } = useTranslation();

  const onClick = useCallback(
    async (quotaId: QuotaID) => {
      if (!isOpen) return;
      setSubmitting(true);
      const progressToast = toast.loading(t("singleEvent.signupInProgress"));
      try {
        const response = await beginSignup(quotaId);
        setSubmitting(false);
        history.push(paths.editSignup(response.id, response.editToken));
        toast.dismiss(progressToast);
      } catch (err) {
        setSubmitting(false);
        toast.update(progressToast, {
          render: t(errorDesc<TKey>(err as ApiError, "singleEvent.signupError")),
          type: toast.TYPE.ERROR,
          autoClose: 5000,
          closeButton: true,
          closeOnClick: true,
          isLoading: false,
        });
      }
    },
    [history, isOpen, t],
  );

  const statusText = useSignupStateText(eventState);

  return (
    <div className="ilmo--side-widget">
      <h3>{t("singleEvent.signupButtons.title")}</h3>
      <p>
        {statusText.shortLabel}
        {total < COUNTDOWN_DURATION && !isOpen && !isClosed && (
          <span style={{ color: "green" }}>{` (${seconds} s)`}</span>
        )}
      </p>
      {
        // eslint-disable-next-line no-nested-ternary
        eventState.state === SignupState.disabled ? null : preview ? (
          <Button onClick={() => preview.setPreviewingForm(true)}>{t("singleEvent.signupButton.preview")}</Button>
        ) : (
          quotas.map((quota) => (
            <Button
              key={quota.id}
              type="button"
              variant="secondary"
              disabled={!isOpen || submitting}
              className="ilmo--signup-button"
              onClick={() => onClick(quota.id)}
            >
              {isOnly
                ? t("singleEvent.signupButton.singleQuota")
                : t("singleEvent.signupButton", { quota: quota.title, price: quota.price })}
            </Button>
          ))
        )
      }
    </div>
  );
};

export default SignupButton;
