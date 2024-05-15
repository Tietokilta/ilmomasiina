import React from 'react';

import {
  Button, Col, Form, FormCheckProps, InputGroup, Row,
} from 'react-bootstrap';
import { Field, FieldRenderProps, useForm } from 'react-final-form';
import { FieldArray, FieldArrayRenderProps, useFieldArray } from 'react-final-form-arrays';
import { useTranslation } from 'react-i18next';
import { SortEnd } from 'react-sortable-hoc';

import { FieldRow } from '@tietokilta/ilmomasiina-components';
import useEvent from '@tietokilta/ilmomasiina-components/dist/utils/useEvent';
import { QuestionType } from '@tietokilta/ilmomasiina-models';
import { EditorQuestion } from '../../../modules/editor/types';
import { useFieldValue } from './hooks';
import SelectBox from './SelectBox';
import Sortable from './Sortable';

type OptionProps = {
  name: string;
  index: number;
  remove: FieldArrayRenderProps<string, HTMLElement>['fields']['remove'];
};

const renderInput = ({ input, meta, ...props }: FieldRenderProps<any>) => <Form.Control {...input} {...props} />;

type CheckboxRenderProps = { input: FormCheckProps };

const renderCheck = ({ input, meta, ...props }: FieldRenderProps<boolean> & CheckboxRenderProps) => (
  <Form.Check {...input} {...props} />
);

const OptionRow = ({ name, index, remove }: OptionProps) => {
  const { t } = useTranslation();

  const removeThis = useEvent(() => remove(index));

  return (
    <FieldRow
      name={name}
      type="text"
      label={t('editor.questions.questionOptions')}
      required
    >
      <InputGroup>
        <Field name={name} required>{renderInput}</Field>
        <InputGroup.Append>
          <Button variant="outline-danger" onClick={removeThis}>
            {t('editor.questions.questionOptions.delete')}
          </Button>
        </InputGroup.Append>
      </InputGroup>
    </FieldRow>
  );
};

type QuestionProps = {
  name: string;
  index: number;
  remove: FieldArrayRenderProps<EditorQuestion, HTMLElement>['fields']['remove'];
};

const QuestionRow = ({ name, index, remove }: QuestionProps) => {
  const { t } = useTranslation();
  const { mutators: { push } } = useForm();

  const removeThis = useEvent(() => remove(index));

  const addOption = useEvent(() => push(`${name}.options`, ''));

  const type = useFieldValue(`${name}.type`);

  return (
    <Row className="question-body px-0">
      <Col xs="12" sm="9" xl="10">
        <FieldRow
          name={`${name}.question`}
          type="text"
          label={t('editor.questions.questionText')}
          required
        />
        <FieldRow
          name={`${name}.type`}
          label={t('editor.questions.questionType')}
          as={SelectBox}
          required
          options={[
            [QuestionType.TEXT, t('editor.questions.questionType.text')],
            [QuestionType.TEXT_AREA, t('editor.questions.questionType.textarea')],
            [QuestionType.NUMBER, t('editor.questions.questionType.number')],
            [QuestionType.SELECT, t('editor.questions.questionType.select')],
            [QuestionType.CHECKBOX, t('editor.questions.questionType.checkbox')],
          ]}
        />
        {(type === 'select' || type === 'checkbox') && (
          <>
            <FieldArray name={`${name}.options`}>
              {({ fields }) => fields.map((optName, i) => (
                <OptionRow key={optName} name={optName} index={i} remove={fields.remove} />
              ))}
            </FieldArray>
            <Row>
              <Col sm="3" />
              <Col sm="9">
                <Button variant="secondary" type="button" onClick={addOption}>
                  {t('editor.questions.questionOptions.add')}
                </Button>
              </Col>
            </Row>
          </>
        )}
      </Col>
      <Col xs="12" sm="3" xl="2" className="event-editor--question-buttons">
        <Field
          name={`${name}.required`}
          type="checkbox"
          id={`${name}.required`}
          label={t('editor.questions.questionRequired')}
          className="mb-3"
        >
          {renderCheck}
        </Field>
        <Field
          name={`${name}.public`}
          type="checkbox"
          id={`${name}.public`}
          label={t('editor.questions.questionPublic')}
          className="mb-3"
        >
          {renderCheck}
        </Field>
        <Button variant="danger" type="button" onClick={removeThis}>
          {t('editor.questions.deleteQuestion')}
        </Button>
      </Col>
    </Row>
  );
};

const Questions = () => {
  const { t } = useTranslation();

  const { fields } = useFieldArray<EditorQuestion>('questions');

  const addQuestion = useEvent(() => {
    fields.push({
      key: `new-${Math.random()}`,
      required: false,
      public: false,
      question: '',
      type: QuestionType.TEXT,
      options: [''],
    });
  });

  const updateOrder = useEvent(({ newIndex, oldIndex }: SortEnd) => fields.move(oldIndex, newIndex));
  const questionItems = fields.map((name, i) => (
    <QuestionRow key={fields.value[i].key} name={name} index={i} remove={fields.remove} />
  ));

  return (
    <>
      <Sortable
        collection="questions"
        items={questionItems}
        onSortEnd={updateOrder}
        useDragHandle
      />
      <div className="text-center mb-3">
        <Button type="button" variant="primary" onClick={addQuestion}>
          {t('editor.questions.addQuestion')}
        </Button>
      </div>
    </>
  );
};

export default Questions;
