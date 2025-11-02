import React, { useMemo } from "react";

import { Button, Col, Form, FormCheckProps, InputGroup, Row } from "react-bootstrap";
import { Field, FieldRenderProps } from "react-final-form";
import { useTranslation } from "react-i18next";
import { SortEnd } from "react-sortable-hoc";

import useShallowMemo from "@tietokilta/ilmomasiina-client/dist/utils/useShallowMemo";
import { QuestionLanguage, QuestionType, questionUpdate } from "@tietokilta/ilmomasiina-models";
import FieldRow from "../../../components/FieldRow";
import { EditorQuestion } from "../../../modules/editor/types";
import priceConfig from "../../../utils/priceConfig"
import useEvent from "../../../utils/useEvent";
import useEditorErrors from "./errors";
import { useFieldValue } from "./hooks";
import LocalizedField from "./LocalizedField";
import LocalizedFieldRow from "./LocalizedFieldRow";
import SelectBox from "./SelectBox";
import Sortable from "./Sortable";
import useFieldArrayMap from "./useFieldArrayMap";
import useLocalizedFieldArrayMutators from "./useLocalizedFieldArrayMutators";

export const maxOptionsPerQuestion = questionUpdate.properties.options.maxItems ?? Infinity;

type OptionProps = {
  name: string;
  parent: string;
  index: number;
  remove: (index: number) => void;
};

type CheckboxRenderProps = { input: FormCheckProps };

const renderCheck = ({ input, meta, ...props }: FieldRenderProps<boolean> & CheckboxRenderProps) => (
  <Form.Check {...input} {...props} />
);
const OptionRow = ({ name, parent, index, remove }: OptionProps) => {
  const { t } = useTranslation();
  const formatError = useEditorErrors();

  const removeThis = useEvent(() => remove(index));

  return (
    <>
      <LocalizedFieldRow
        name={name}
        type="text"
        label={t("editor.questions.questionOptions")}
        required
        formatError={formatError}
      >
        <InputGroup>
          <LocalizedField name={name} required maxLength={255} defaultAsPlaceholder />
          <InputGroup.Append>
            <Button variant="outline-danger" onClick={removeThis}>
              {t("editor.questions.questionOptions.delete")}
            </Button>
          </InputGroup.Append>
        </InputGroup>
      </LocalizedFieldRow>
      <FieldRow
        name={`${parent}.prices[${index}]`}
        label={t("editor.quotas.price")}
        help={t("editor.quotas.price.info")}
        type="text"
        placeholder="0.00€"
        defaultValue={0.00}
        config={priceConfig}
        formatError={formatError}
      />
    </>
  );
};

type QuestionProps = {
  name: string;
  index: number;
  remove: (index: number) => void;
};

const QuestionRow = ({ name, index, remove }: QuestionProps) => {
  const { t } = useTranslation();
  const formatError = useEditorErrors();

  const removeThis = useEvent(() => remove(index));

  const optionFields = useFieldArrayMap(`${name}.options`);
  const optionMutators = useLocalizedFieldArrayMutators<string>(`${name}.options`);
  const addOption = useEvent(() => optionMutators.push("", ""));

  const type = useFieldValue(`${name}.type`);

  return (
    <Row className="question-body px-0">
      <Col xs="12" sm="9" xl="10">
        <LocalizedFieldRow
          name={`${name}.question`}
          defaultAsPlaceholder
          type="text"
          label={t("editor.questions.questionText")}
          required
          maxLength={255}
          formatError={formatError}
        />
        <FieldRow
          name={`${name}.type`}
          label={t("editor.questions.questionType")}
          as={SelectBox}
          required
          options={[
            [QuestionType.TEXT, t("editor.questions.questionType.text")],
            [QuestionType.TEXT_AREA, t("editor.questions.questionType.textarea")],
            [QuestionType.NUMBER, t("editor.questions.questionType.number")],
            [QuestionType.SELECT, t("editor.questions.questionType.select")],
            [QuestionType.CHECKBOX, t("editor.questions.questionType.checkbox")],
          ]}
          formatError={formatError}
        />
        {(type === "select" || type === "checkbox") && (
          <>
            {optionFields.map((optName, i) => (
              <OptionRow key={optName} parent={name} name={optName} index={i} remove={optionMutators.remove} />
            ))}
            {optionFields.length! < maxOptionsPerQuestion && (
              <Row>
                <Col sm="3" />
                <Col sm="9">
                  <Button variant="secondary" type="button" onClick={addOption} className="mt-2 mt-sm-0">
                    {t("editor.questions.questionOptions.add")}
                  </Button>
                </Col>
              </Row>
            )}
          </>
        )}
      </Col>
      <Col xs="12" sm="3" xl="2" className="event-editor--question-buttons">
        <Field
          name={`${name}.required`}
          type="checkbox"
          id={`${name}.required`}
          label={t("editor.questions.questionRequired")}
          className="mb-3"
        >
          {renderCheck}
        </Field>
        <Field
          name={`${name}.public`}
          type="checkbox"
          id={`${name}.public`}
          label={t("editor.questions.questionPublic")}
          className="mb-3"
        >
          {renderCheck}
        </Field>
        <Button variant="danger" type="button" onClick={removeThis}>
          {t("editor.questions.deleteQuestion")}
        </Button>
      </Col>
    </Row>
  );
};

const Questions = () => {
  const { t } = useTranslation();
  const questions = useFieldValue<EditorQuestion[]>("questions");
  const { map: mapFields } = useFieldArrayMap("questions");
  const { push, move, remove } = useLocalizedFieldArrayMutators<EditorQuestion, QuestionLanguage>("questions");

  const addQuestion = useEvent(() => {
    push(
      {
        key: `new-${Math.random()}`,
        required: false,
        public: false,
        question: "",
        type: QuestionType.TEXT,
        options: [""],
        prices: [0]
      },
      {
        question: "",
        options: [""],
      },
    );
  });

  const updateOrder = useEvent(({ newIndex, oldIndex }: SortEnd) => move(oldIndex, newIndex));

  const keys = useShallowMemo(questions.map((item) => item.key));
  const questionItems = useMemo(
    () => mapFields((name, i) => <QuestionRow key={keys[i]} name={name} index={i} remove={remove} />),
    // This list only invalidates when the question positions or count change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [keys],
  );

  return (
    <>
      <Sortable collection="questions" items={questionItems} onSortEnd={updateOrder} useDragHandle />
      <div className="text-center mb-3">
        <Button type="button" variant="primary" onClick={addQuestion}>
          {t("editor.questions.addQuestion")}
        </Button>
      </div>
    </>
  );
};

export default Questions;
