import React from "react";

import { useFormState } from "react-final-form";
import { Trans, useTranslation } from "react-i18next";

import { useEditSignupContext } from "@tietokilta/ilmomasiina-client";
import ConfirmButton from "../../../components/ConfirmButton";

const DELETE_CONFIRM_MS = 4000;

type Props = {
  processing: boolean;
  onDelete: () => void;
};

const DeleteSignup = ({ processing, onDelete }: Props) => {
  const event = useEditSignupContext().localizedEvent!;
  const { t } = useTranslation();

  const { submitting } = useFormState({ subscription: { submitting: true } });

  return (
    <div className="ilmo--delete-container">
      <h2>{t("editSignup.delete.action")}</h2>
      <p>
        <Trans t={t} i18nKey="editSignup.delete.info1">
          {"Are you sure you want to delete your sign up to "}
          <strong>{{ event: event.title }}</strong>?
        </Trans>
      </p>
      <p>
        {t("editSignup.delete.info2")} <strong>{t("editSignup.delete.info3")}</strong>
      </p>
      <ConfirmButton
        type="button"
        disabled={submitting || processing}
        onClick={onDelete}
        variant="danger"
        confirmDelay={DELETE_CONFIRM_MS}
        confirmLabel={t("editSignup.delete.action.confirm")}
      >
        {t("editSignup.delete.action")}
      </ConfirmButton>
    </div>
  );
};

export default DeleteSignup;
