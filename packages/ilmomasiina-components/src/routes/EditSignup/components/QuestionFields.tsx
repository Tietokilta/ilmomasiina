import React, { ChangeEvent, ReactNode, useMemo } from "react";

import identity from "lodash-es/identity";
import without from "lodash-es/without";
import { Form } from "react-bootstrap";
import { useField } from "react-final-form";
import { useTranslation } from "react-i18next";

import { Question, QuestionType } from "@tietokilta/ilmomasiina-models";
import FieldRow from "../../../components/FieldRow";
import { useEditSignupContext } from "../../../modules/editSignup";
import { stringifyAnswer } from "../../../utils/signupUtils";
import useEvent from "../../../utils/useEvent";
import useFieldErrors from "./fieldError";

type QuestionFieldProps = {
  name: string;
  question: Question;
  disabled?: boolean;
};

const QuestionField = ({ name, question, disabled }: QuestionFieldProps) => {
  const {
    input: { value, onChange },
    meta: { invalid },
  } = useField<string | string[]>(`${name}.${question.id}`, { parse: identity });
  const currentAnswerString = stringifyAnswer(value);
  const currentAnswerArray = useMemo(() => (Array.isArray(value) ? value : []), [value]);

  const { t } = useTranslation();
  const formatError = useFieldErrors();

  // We need to wrap onChange, as react-final-form complains if we pass radios to it without type="radio".
  // If we pass type="radio", it doesn't provide us with the value of the field.
  const onFieldChange = useEvent((evt: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    onChange(evt.currentTarget.value);
  });

  const onCheckboxChange = useEvent((evt: ChangeEvent<HTMLInputElement>) => {
    const { checked, value: option } = evt.currentTarget;
    const newAnswers = checked ? [...currentAnswerArray, option] : without(currentAnswerArray, option);
    onChange(newAnswers);
  });

  const help = question.public ? t("editSignup.publicQuestion") : null;

  let input: ReactNode;
  let isCheckboxes = false;
  switch (question.type) {
    case QuestionType.TEXT:
      input = (
        <Form.Control
          type="text"
          maxLength={250}
          required={question.required}
          readOnly={disabled}
          value={currentAnswerString}
          onChange={onFieldChange}
          isInvalid={invalid}
        />
      );
      break;
    case QuestionType.NUMBER:
      input = (
        <Form.Control
          type="number"
          required={question.required}
          readOnly={disabled}
          value={currentAnswerString}
          onChange={onFieldChange}
          isInvalid={invalid}
        />
      );
      break;
    case QuestionType.CHECKBOX: {
      input = question.options?.map((option, optIndex) => (
        <Form.Check
          // eslint-disable-next-line react/no-array-index-key
          key={optIndex}
          type="checkbox"
          id={`question-${question.id}-option-${optIndex}`}
          value={option}
          label={option}
          required={question.required && !currentAnswerArray.some((answer) => answer !== option)}
          disabled={disabled}
          checked={currentAnswerArray.includes(option)}
          onChange={onCheckboxChange}
          isInvalid={invalid}
        />
      ));
      isCheckboxes = true;
      break;
    }
    case QuestionType.TEXT_AREA:
      input = (
        <Form.Control
          as="textarea"
          rows={3}
          cols={40}
          maxLength={250}
          required={question.required}
          readOnly={disabled}
          value={currentAnswerString}
          onChange={onFieldChange}
          isInvalid={invalid}
        />
      );
      break;
    case QuestionType.SELECT:
      if (question.options && question.options.length > 3) {
        input = (
          <Form.Control
            as="select"
            required={question.required}
            disabled={disabled}
            value={currentAnswerString}
            onChange={onFieldChange}
            isInvalid={invalid}
          >
            <option value="" disabled={question.required}>
              {t("editSignup.fields.select.placeholder")}
            </option>
            {question.options?.map((option, optIndex) => (
              // eslint-disable-next-line react/no-array-index-key
              <option key={optIndex} value={option}>
                {option}
              </option>
            ))}
          </Form.Control>
        );
      } else {
        input = question.options?.map((option, optIndex) => (
          <Form.Check
            // eslint-disable-next-line react/no-array-index-key
            key={optIndex}
            type="radio"
            id={`question-${question.id}-option-${optIndex}`}
            inline
            value={option}
            label={option}
            required={question.required}
            disabled={disabled}
            checked={currentAnswerString === option}
            onChange={onFieldChange}
            isInvalid={invalid}
          />
        ));
        isCheckboxes = true;
      }
      break;
    default:
      return null;
  }

  return (
    <FieldRow
      key={question.id}
      name={`${name}.${question.id}`}
      label={question.question}
      required={question.required}
      help={help}
      checkAlign={isCheckboxes}
      formatError={formatError}
    >
      {input}
    </FieldRow>
  );
};

type Props = {
  name: string;
};

const QuestionFields = ({ name }: Props) => {
  const { event, editingClosedOnLoad, admin } = useEditSignupContext();
  const canEdit = !editingClosedOnLoad || admin;
  return (
    // TODO: add proper validation
    <>
      {event!.questions.map((question) => (
        <QuestionField key={question.id} name={name} question={question} disabled={!canEdit} />
      ))}
    </>
  );
};

export default QuestionFields;
