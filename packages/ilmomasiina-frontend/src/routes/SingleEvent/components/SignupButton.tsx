import React, { useCallback, useState } from "react";

import { Button } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { toast } from "react-toastify";

import { ApiError, beginSignup, errorDesc, useSingleEventContext } from "@tietokilta/ilmomasiina-client";
import { eventHasPaidQuotas } from "@tietokilta/ilmomasiina-client/dist/utils/paymentUtils";
import { SignupState, signupState } from "@tietokilta/ilmomasiina-client/dist/utils/signupState";
import type { QuotaID } from "@tietokilta/ilmomasiina-models";
import type { TKey } from "../../../i18n";
import paths from "../../../paths";
import { usePriceFormatter } from "../../../utils/priceFormat";
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
  const { localizedEvent: event, preview } = useSingleEventContext();
  const { registrationStartDate, registrationEndDate, quotas } = event!;
  const navigate = useNavigate();
  const eventState = signupState(registrationStartDate, registrationEndDate);
  const [submitting, setSubmitting] = useState(false);
  const isOnly = quotas.length === 1;
  const showPrices = eventHasPaidQuotas(event!);
  const { t } = useTranslation();
  const priceFormat = usePriceFormatter();

  const onClick = useCallback(
    async (quotaId: QuotaID) => {
      if (!isOpen) return;
      setSubmitting(true);
      const progressToast = toast.loading(t("singleEvent.signupInProgress"));
      try {
        const response = await beginSignup(quotaId);
        setSubmitting(false);
        navigate(paths.editSignup(response.id, response.editToken));
        toast.dismiss(progressToast);
      } catch (err) {
        setSubmitting(false);
        toast.update(progressToast, {
          render: t(errorDesc<TKey>(err as ApiError, "singleEvent.signupError")),
          type: "error",
          autoClose: 5000,
          closeButton: true,
          closeOnClick: true,
          isLoading: false,
        });
      }
    },
    [navigate, isOpen, t],
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
                : t("singleEvent.signupButton", { quota: quota.title })}
              {showPrices && ` (${priceFormat(quota.price)})`}
            </Button>
          ))
        )
      }
    </div>
  );
};

export default SignupButton;
