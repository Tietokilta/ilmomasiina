import React from "react";

import { Form } from "react-bootstrap";
import { UseFieldConfig } from "react-final-form";
import { useTranslation } from "react-i18next";

import FieldRow from "../../../components/FieldRow";
import useEditorErrors from "./errors";
import { useFieldValue } from "./hooks";
import LanguageSelect from "./LanguageSelect";
import Quotas from "./Quotas";

const numberConfig: UseFieldConfig<number | null> = {
  parse: (value) => (value ? Number(value) : null),
};

const QuotasTab = () => {
  const useOpenQuota = useFieldValue<boolean>("useOpenQuota");
  const { t } = useTranslation();
  const formatError = useEditorErrors();
  return (
    <div>
      <LanguageSelect />
      <Quotas />
      <FieldRow
        name="useOpenQuota"
        label={t("editor.quotas.openQuota")}
        as={Form.Check}
        type="checkbox"
        checkAlign
        checkLabel={t("editor.quotas.openQuota.check")}
        help={t("editor.quotas.openQuota.info")}
        formatError={formatError}
      />
      {useOpenQuota && (
        <div>
          <FieldRow
            name="openQuotaSize"
            label={t("editor.quotas.openQuotaSize")}
            type="number"
            config={numberConfig}
            min="0"
            placeholder="0" // if this is left empty, it's set to null and disabled
            required
            formatError={formatError}
          />
          <FieldRow
            name="openQuotaPrice"
            label={t("editor.quotas.openQuotaPrice")}
            type="number"
            config={numberConfig}
            min="0.00"
            step="0.01"
            placeholder="0.00" // if this is left empty, it's set to null and disabled
            required
            formatError={formatError}
          />
        </div>
      )}
    </div>
  );
};

export default QuotasTab;
