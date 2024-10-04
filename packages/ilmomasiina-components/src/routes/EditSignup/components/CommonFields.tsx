import React from "react";

import { Form } from "react-bootstrap";
import { useTranslation } from "react-i18next";

import FieldRow from "../../../components/FieldRow";
import { useEditSignupContext } from "../../../modules/editSignup";
import useFieldErrors from "./fieldError";

const CommonFields = () => {
  const { event, signup, editingClosedOnLoad } = useEditSignupContext();
  const isNew = !signup!.confirmed;
  const { t } = useTranslation();
  const formatError = useFieldErrors();
  return (
    <>
      {event!.nameQuestion && (
        <>
          <FieldRow
            name="firstName"
            maxLength={250}
            label={t("editSignup.fields.firstName")}
            placeholder={t("editSignup.fields.firstName.placeholder")}
            required
            readOnly={!isNew || editingClosedOnLoad}
            formatError={formatError}
          />
          <FieldRow
            name="lastName"
            maxLength={250}
            label={t("editSignup.fields.lastName")}
            placeholder={t("editSignup.fields.lastName.placeholder")}
            required
            readOnly={!isNew || editingClosedOnLoad}
            formatError={formatError}
          />
          <FieldRow
            name="namePublic"
            as={Form.Check}
            type="checkbox"
            disabled={editingClosedOnLoad}
            checkAlign
            checkLabel={<>{t("editSignup.namePublic")}</>}
          />
        </>
      )}
      {event!.emailQuestion && (
        <FieldRow
          name="email"
          maxLength={250}
          label={t("editSignup.fields.email")}
          placeholder={t("editSignup.fields.email.placeholder")}
          required
          readOnly={!isNew || editingClosedOnLoad}
          formatError={formatError}
        />
      )}
    </>
  );
};

export default CommonFields;
