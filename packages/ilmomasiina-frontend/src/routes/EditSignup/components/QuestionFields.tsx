import React, { ChangeEvent, ReactNode, useMemo } from "react";

import identity from "lodash-es/identity";
import without from "lodash-es/without";
import { Form } from "react-bootstrap";
import { useField } from "react-final-form";
import { useTranslation } from "react-i18next";

import { useEditSignupContext } from "@tietokilta/ilmomasiina-client";
import { questionHasPrices } from "@tietokilta/ilmomasiina-client/dist/utils/paymentUtils";
import { stringifyAnswer } from "@tietokilta/ilmomasiina-client/dist/utils/signupUtils";
import { Question, QuestionType } from "@tietokilta/ilmomasiina-models";
import FieldRow from "../../../components/FieldRow";
import { usePriceFormatter } from "../../../utils/priceFormat";
import useEvent from "../../../utils/useEvent";
import useFieldErrors from "./fieldError";

type QuestionFieldProps = {
  name: string;
  question: Question;
  validate?: boolean;
};

const QuestionField = ({ name, question, validate = true }: QuestionFieldProps) => {
  const {
    input: { value, onChange },
    meta: { invalid },
  } = useField<string | string[]>(`${name}.${question.id}`, { parse: identity });
  const currentAnswerString = stringifyAnswer(value);
  const currentAnswerArray = useMemo(() => (Array.isArray(value) ? value : []), [value]);

  const { canEdit, canEditPaidQuestions, signup } = useEditSignupContext();
  const { t } = useTranslation();
  const formatError = useFieldErrors();

  // For admins, make all questions optional.
  // (All of them are editable by the user, and the backend doesn't care for admins.)
  const isRequired = validate && question.required;

  const formatPrice = usePriceFormatter();
  // Show the prices for each option if the question has some paid options.
  // Add a + sign if the signup has a "base price" from the quota.
  const quotaHasPrice = signup!.quota.price > 0;
  const hasPrices = questionHasPrices(question);
  const formatOptionPrice = (price?: number) =>
    hasPrices && price != null ? ` (${quotaHasPrice ? "+" : ""}${formatPrice(price)})` : "";

  const disabled = !canEdit || (!canEditPaidQuestions && questionHasPrices(question));

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

  const help =
    // eslint-disable-next-line no-nested-ternary
    canEdit && disabled // implies question is uneditable because of !canEditPaidQuestions
      ? t("editSignup.uneditablePaidQuestion")
      : question.public
        ? t("editSignup.publicQuestion")
        : null;

  let input: ReactNode;
  let isCheckboxes = false;
  switch (question.type) {
    case QuestionType.TEXT:
      input = (
        <Form.Control
          type="text"
          maxLength={250}
          required={isRequired}
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
          required={isRequired}
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
          label={`${option}${formatOptionPrice(question.prices?.[optIndex])}`}
          required={isRequired && !currentAnswerArray.some((answer) => answer !== option)}
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
          required={isRequired}
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
          <Form.Select
            required={isRequired}
            disabled={disabled}
            value={currentAnswerString}
            onChange={onFieldChange}
            isInvalid={invalid}
          >
            <option value="" disabled={isRequired}>
              {t("editSignup.fields.select.placeholder")}
            </option>
            {question.options?.map((option, optIndex) => (
              // eslint-disable-next-line react/no-array-index-key
              <option key={optIndex} value={option}>
                {option}
                {formatOptionPrice(question.prices?.[optIndex])}
              </option>
            ))}
          </Form.Select>
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
            label={`${option}${formatOptionPrice(question.prices?.[optIndex])}`}
            required={isRequired}
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
      // Show required indicator even for admins for information purposes.
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
  validate?: boolean;
};

const QuestionFields = ({ name, validate = true }: Props) => {
  const { localizedEvent: event } = useEditSignupContext();
  return (
    <>
      {event!.questions.map((question) => (
        <QuestionField key={question.id} name={name} question={question} validate={validate} />
      ))}
    </>
  );
};

export default QuestionFields;
