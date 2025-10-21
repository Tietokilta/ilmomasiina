import React, { useMemo } from "react";

import { Button, Col, Row } from "react-bootstrap";
import { UseFieldConfig } from "react-final-form";
import { useTranslation } from "react-i18next";
import { SortEnd } from "react-sortable-hoc";

import useShallowMemo from "@tietokilta/ilmomasiina-client/dist/utils/useShallowMemo";
import { QuotaLanguage } from "@tietokilta/ilmomasiina-models";
import FieldRow from "../../../components/FieldRow";
import { EditorQuota } from "../../../modules/editor/types";
import useEvent from "../../../utils/useEvent";
import useEditorErrors from "./errors";
import { useFieldValue } from "./hooks";
import LocalizedFieldRow from "./LocalizedFieldRow";
import Sortable from "./Sortable";
import useFieldArrayMap from "./useFieldArrayMap";
import useLocalizedFieldArrayMutators from "./useLocalizedFieldArrayMutators";

type QuotaRowProps = {
  name: string;
  index: number;
  isOnly: boolean;
  remove: (index: number) => void;
};

const numberConfig: UseFieldConfig<number | null> = {
  parse: (value) => (value ? Number(value) : null),
};

const QuotaRow = ({ name, index, isOnly, remove }: QuotaRowProps) => {
  const { t } = useTranslation();
  const formatError = useEditorErrors();

  const removeThis = useEvent(() => remove(index));

  return (
    <Row className="quota-body">
      <Col xs="12" sm="10">
        <LocalizedFieldRow
          name={`${name}.title`}
          defaultAsPlaceholder
          label={t("editor.quotas.quotaName")}
          help={[
            isOnly ? t("editor.quotas.quotaName.singleQuota") : "",
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
        <FieldRow
          name={`${name}.price`}
          label={t("editor.quotas.price")}
          help={t("editor.quotas.price.info")}
          type="number"
          min={0.00}
          step={0.01}
          placeholder="0.00"
          defaultValue={0.00}
          config={numberConfig}
          formatError={formatError}
        />
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
  const { map: mapFields, length } = useFieldArrayMap("quotas");
  const { push, move, remove } = useLocalizedFieldArrayMutators<EditorQuota, QuotaLanguage>("quotas");

  const addQuota = useEvent(() => {
    push(
      {
        key: `new-${Math.random()}`,
        title: "",
        size: null,
        price: 0,
        priceId: ""
      },
      {
        title: "",
      },
    );
  });

  const updateOrder = useEvent(({ newIndex, oldIndex }: SortEnd) => move(oldIndex, newIndex));

  const keys = useShallowMemo(quotas.map((item) => item.key));
  const quotaItems = useMemo(
    () =>
      mapFields((name, i) => <QuotaRow key={keys[i]} name={name} index={i} remove={remove} isOnly={length === 1} />),
    // This list only invalidates when the question positions or count change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [keys],
  );

  return (
    <>
      <Sortable collection="quotas" items={quotaItems} onSortEnd={updateOrder} useDragHandle />
      <div className="text-center mb-3">
        <Button type="button" variant="primary" onClick={addQuota}>
          {t("editor.quotas.addQuota")}
        </Button>
      </div>
    </>
  );
};

export default Quotas;
