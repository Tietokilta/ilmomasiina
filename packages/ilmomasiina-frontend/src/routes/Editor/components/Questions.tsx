import React, { useMemo } from "react";

import { Button, Col, Form, FormCheckProps, InputGroup, Row } from "react-bootstrap";
import { Field, FieldRenderProps, useForm } from "react-final-form";
import { useTranslation } from "react-i18next";

import useShallowMemo from "@tietokilta/ilmomasiina-client/dist/utils/useShallowMemo";
import { MAX_OPTIONS_PER_QUESTION, PaymentMode, QuestionLanguage, QuestionType } from "@tietokilta/ilmomasiina-models";
import FieldRow from "../../../components/FieldRow";
import { EditorQuestion } from "../../../modules/editor/types";
import useEvent from "../../../utils/useEvent";
import useEditorErrors from "./errors";
import { useFieldValue } from "./hooks";
import LocalizedField from "./LocalizedField";
import LocalizedFieldRow from "./LocalizedFieldRow";
import PriceField, { priceFieldConfig } from "./PriceField";
import SelectBox from "./SelectBox";
import Sortable from "./Sortable";
import useFieldArrayMap from "./useFieldArrayMap";
import useLocalizedFieldArrayMutators from "./useLocalizedFieldArrayMutators";

type CheckboxRenderProps = {
  // <Field> provides us `string`, Form.Check wants "checkbox" | "radio".
  input: Omit<FormCheckProps, "type">;
};

const renderCheck = ({ input, meta, ...props }: FieldRenderProps<boolean, HTMLInputElement> & CheckboxRenderProps) => (
  <Form.Check {...input} type="checkbox" {...props} />
);

type OptionProps = {
  name: string;
  parent: string;
  index: number;
  remove: (index: number) => void;
  hasPrices: boolean;
};

const OptionRow = ({ name, parent, index, remove, hasPrices }: OptionProps) => {
  const { t } = useTranslation();
  const formatError = useEditorErrors();
  const hasPayments = useFieldValue<PaymentMode>("payments") !== PaymentMode.DISABLED;

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
          <Button variant="outline-danger" onClick={removeThis}>
            {t("editor.questions.questionOptions.delete")}
          </Button>
        </InputGroup>
      </LocalizedFieldRow>
      {hasPayments && hasPrices && (
        <FieldRow
          name={`${parent}.prices[${index}]`}
          label={t("editor.questions.questionOptions.price")}
          as={PriceField}
          config={priceFieldConfig}
          help={t("editor.questions.questionOptions.price.info")}
          formatError={formatError}
        />
      )}
    </>
  );
};

type QuestionProps = {
  name: string;
  index: number;
};

const QuestionRow = ({ name, index }: QuestionProps) => {
  const { t } = useTranslation();
  const formatError = useEditorErrors();

  const { remove } = useLocalizedFieldArrayMutators<EditorQuestion, QuestionLanguage>("questions");
  const removeThis = useEvent(() => remove(index));

  const optionFields = useFieldArrayMap(`${name}.options`);
  const optionMutators = useLocalizedFieldArrayMutators<string>(`${name}.options`);
  const form = useForm();

  const addOption = useEvent(() => {
    optionMutators.push("", "");
    form.mutators.push(`${name}.prices`, 0);
  });
  const removeOption = useEvent((optIndex: number) => {
    optionMutators.remove(optIndex);
    form.mutators.remove(`${name}.prices`, optIndex);
  });

  const type = useFieldValue<QuestionType>(`${name}.type`);
  const hasPrices = useFieldValue<boolean>(`${name}.hasPrices`);

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
          help={t("editor.questions.questionType.info")}
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
        {(type === QuestionType.SELECT || type === QuestionType.CHECKBOX) && (
          <>
            {optionFields.map((optName, i) => (
              <OptionRow
                key={optName}
                parent={name}
                name={optName}
                index={i}
                remove={removeOption}
                hasPrices={hasPrices}
              />
            ))}
            {optionFields.length! < MAX_OPTIONS_PER_QUESTION && (
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
        {(type === QuestionType.SELECT || type === QuestionType.CHECKBOX) && (
          <Field
            name={`${name}.hasPrices`}
            type="checkbox"
            id={`${name}.hasPrices`}
            label={t("editor.questions.hasPrices")}
            className="mb-3"
          >
            {renderCheck}
          </Field>
        )}
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
  const { push, move } = useLocalizedFieldArrayMutators<EditorQuestion, QuestionLanguage>("questions");

  const addQuestion = useEvent(() => {
    push(
      {
        key: `new-${Math.random()}`,
        required: false,
        public: false,
        question: "",
        type: QuestionType.TEXT,
        options: [""],
        prices: [0],
        hasPrices: false,
      },
      {
        question: "",
        options: [""],
      },
    );
  });

  const keys = useShallowMemo(questions.map((item) => item.key));
  // Generate objects to be passed to Sortable.
  const questionItems = useMemo(
    () => mapFields((name, i) => ({ name, id: keys[i] })),
    // Actual question data isn't included, so this list only invalidates when the question positions or count change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [keys],
  );

  return (
    <>
      <Sortable items={questionItems} component={QuestionRow} move={move} />
      <div className="text-center mb-3">
        <Button type="button" variant="primary" onClick={addQuestion}>
          {t("editor.questions.addQuestion")}
        </Button>
      </div>
    </>
  );
};

export default Questions;
