import React, { ChangeEvent, ReactNode, useMemo } from 'react';

import find from 'lodash-es/find';
import reject from 'lodash-es/reject';
import without from 'lodash-es/without';
import { Form } from 'react-bootstrap';
import { useField } from 'react-final-form';
import { useTranslation } from 'react-i18next';

import type { Question, SignupUpdateBody } from '@tietokilta/ilmomasiina-models';
import FieldRow from '../../../components/FieldRow';
import { useEditSignupContext } from '../../../modules/editSignup';
import { never } from '../../../utils/helpers';
import { stringifyAnswer } from '../../../utils/signupUtils';
import useEvent from '../../../utils/useEvent';

type QuestionFieldProps = {
  name: string;
  question: Question;
  disabled?: boolean;
};

const QuestionField = ({ name, question, disabled }: QuestionFieldProps) => {
  const { input: { value, onChange } } = useField<SignupUpdateBody['answers']>(name);
  const answerValue = find(value, { questionId: question.id })?.answer || '';
  const currentAnswerString = stringifyAnswer(answerValue);
  const currentAnswerArray = useMemo(() => (Array.isArray(answerValue) ? answerValue : []), [answerValue]);

  const { t } = useTranslation();

  const updateAnswer = (answer: string | string[]) => {
    onChange(reject(value, { questionId: question.id }).concat({
      questionId: question.id,
      answer,
    }));
  };

  const onFieldChange = useEvent((evt: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    updateAnswer(evt.currentTarget.value);
  });

  const onCheckboxChange = useEvent((evt: ChangeEvent<HTMLInputElement>) => {
    const { checked, value: option } = evt.currentTarget;
    const newAnswers = checked ? [...currentAnswerArray, option] : without(currentAnswerArray, option);
    updateAnswer(newAnswers);
  });

  const help = question.public ? t('editSignup.publicQuestion') : null;

  let input: ReactNode;
  let isCheckboxes = false;
  switch (question.type) {
    case 'text':
      input = (
        <Form.Control
          type="text"
          maxLength={250}
          required={question.required}
          readOnly={disabled}
          value={currentAnswerString}
          onChange={onFieldChange}
        />
      );
      break;
    case 'number':
      input = (
        <Form.Control
          type="number"
          required={question.required}
          readOnly={disabled}
          value={currentAnswerString}
          onChange={onFieldChange}
        />
      );
      break;
    case 'checkbox': {
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
        />
      ));
      isCheckboxes = true;
      break;
    }
    case 'textarea':
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
        />
      );
      break;
    case 'select':
      if (question.options && question.options.length > 3) {
        input = (
          <Form.Control
            as="select"
            required={question.required}
            disabled={disabled}
            value={currentAnswerString}
            onChange={onFieldChange}
          >
            <option value="" disabled={question.required}>
              {t('editSignup.fields.select.placeholder')}
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
          />
        ));
        isCheckboxes = true;
      }
      break;
    default:
      return never(question.type);
  }

  return (
    <FieldRow
      key={question.id}
      name={`question-${question.id}`}
      label={question.question}
      required={question.required}
      help={help}
      checkAlign={isCheckboxes}
    >
      {input}
    </FieldRow>
  );
};

type Props = {
  name: string;
};

const QuestionFields = ({ name }: Props) => {
  const { event, registrationClosed } = useEditSignupContext();
  return (
    // TODO: add proper validation
    <>
      {event!.questions.map((question) => (
        <QuestionField key={question.id} name={name} question={question} disabled={registrationClosed} />
      ))}
    </>
  );
};

export default QuestionFields;
