import React, { useMemo } from "react";

import { Button, Col, Row } from "react-bootstrap";
import { UseFieldConfig } from "react-final-form";
import { useTranslation } from "react-i18next";

import useShallowMemo from "@tietokilta/ilmomasiina-client/dist/utils/useShallowMemo";
import { PaymentMode, QuotaLanguage } from "@tietokilta/ilmomasiina-models";
import FieldRow from "../../../components/FieldRow";
import { EditorQuota } from "../../../modules/editor/types";
import useEvent from "../../../utils/useEvent";
import useEditorErrors from "./errors";
import { useFieldValue } from "./hooks";
import LocalizedFieldRow from "./LocalizedFieldRow";
import PriceField, { priceFieldConfig } from "./PriceField";
import Sortable from "./Sortable";
import useFieldArrayMap from "./useFieldArrayMap";
import useLocalizedFieldArrayMutators from "./useLocalizedFieldArrayMutators";

type QuotaRowProps = {
  name: string;
  index: number;
};

const numberConfig: UseFieldConfig<number | null> = {
  parse: (value) => (value ? Number(value) : null),
};

const QuotaRow = ({ name, index }: QuotaRowProps) => {
  const { t } = useTranslation();
  const formatError = useEditorErrors();
  const hasPayments = useFieldValue<PaymentMode>("payments") !== PaymentMode.DISABLED;

  const { length } = useFieldArrayMap("quotas");
  const { remove } = useLocalizedFieldArrayMutators<EditorQuota, QuotaLanguage>("quotas");
  const removeThis = useEvent(() => remove(index));

  return (
    <Row className="quota-body">
      <Col xs="12" sm="10">
        <LocalizedFieldRow
          name={`${name}.title`}
          defaultAsPlaceholder
          label={t("editor.quotas.quotaName")}
          help={[
            length === 1 ? t("editor.quotas.quotaName.singleQuota") : "",
            index === 0 ? t("editor.quotas.quotaName.reorder") : "",
          ]
            .filter(Boolean)
            .join(" ")}
          type="text"
          required
          maxLength={255}
          formatError={formatError}
        />
        <FieldRow
          name={`${name}.size`}
          label={t("editor.quotas.quotaSize")}
          help={t("editor.quotas.quotaSize.info")}
          type="number"
          min={1}
          placeholder={t("editor.quotas.quotaSize.unlimited")}
          config={numberConfig}
          formatError={formatError}
        />
        {hasPayments && (
          <FieldRow
            name={`${name}.price`}
            label={t("editor.quotas.price")}
            as={PriceField}
            config={priceFieldConfig}
            help={t("editor.quotas.price.info")}
            formatError={formatError}
          />
        )}
      </Col>
      {index > 0 && (
        <Col xs="12" sm="2" className="no-focus">
          <Button type="button" variant="danger" onClick={removeThis}>
            {t("editor.quotas.deleteQuota")}
          </Button>
        </Col>
      )}
    </Row>
  );
};

const Quotas = () => {
  const { t } = useTranslation();
  const quotas = useFieldValue<EditorQuota[]>("quotas");
  const { map: mapFields } = useFieldArrayMap("quotas");
  const { push, move } = useLocalizedFieldArrayMutators<EditorQuota, QuotaLanguage>("quotas");

  const addQuota = useEvent(() => {
    push(
      {
        key: `new-${Math.random()}`,
        title: "",
        size: null,
        price: 0,
      },
      {
        title: "",
      },
    );
  });

  const keys = useShallowMemo(quotas.map((item) => item.key));
  // Generate objects to be passed to Sortable.
  const quotaItems = useMemo(
    () => mapFields((name, i) => ({ name, id: keys[i] })),
    // Actual quota data isn't included, so this list only invalidates when the question positions or count change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [keys],
  );

  return (
    <>
      <Sortable items={quotaItems} component={QuotaRow} move={move} />
      <div className="text-center mb-3">
        <Button type="button" variant="primary" onClick={addQuota}>
          {t("editor.quotas.addQuota")}
        </Button>
      </div>
    </>
  );
};

export default Quotas;
