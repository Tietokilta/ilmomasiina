import React, { useEffect, useState } from 'react';

import { useFormikContext } from 'formik';
import moment from 'moment-timezone';
import { Button, Modal } from 'react-bootstrap';

import { editConflictDismissed, reloadEvent } from '../../../modules/editor/actions';
import { EditorEvent } from '../../../modules/editor/types';
import { useTypedDispatch, useTypedSelector } from '../../../store/reducers';

const EditConflictModal = () => {
  const dispatch = useTypedDispatch();
  const modal = useTypedSelector((state) => state.editor.editConflictModal);

  const deletedQuestions = modal?.deletedQuestions || [];
  const deletedQuotas = modal?.deletedQuotas || [];

  const { values: { questions, quotas }, setFieldValue, submitForm } = useFormikContext<EditorEvent>();

  // Another ugly hack. Formik doesn't provide a facility to modify fields and then reliably submit them, due to it
  // storing its data in an internal useReducer. setFieldValue() followed by submitForm() _seems_ to work, but isn't
  // guaranteed; therefore, we setFieldValue() here and submitForm() on the next render.
  const [submitOverwrite, setSubmitOverwrite] = useState(false);

  useEffect(() => {
    if (submitOverwrite) {
      setSubmitOverwrite(false);
      submitForm();
    }
  }, [submitOverwrite, submitForm]);

  function overwrite() {
    // Tell the backend we want to overwrite the latest change.
    setFieldValue('updatedAt', modal!.updatedAt);
    // We still need to re-create the questions and quotas that were deleted, by removing their old IDs.
    setFieldValue(
      'questions',
      questions.map((question) => {
        if (!question.id || !deletedQuestions.includes(question.id)) return question;
        return {
          ...question,
          id: undefined,
          key: `new-${Math.random()}`,
        };
      }),
    );
    setFieldValue(
      'quotas',
      quotas.map((quota) => {
        if (!quota.id || !deletedQuotas.includes(quota.id)) return quota;
        return {
          ...quota,
          id: undefined,
          key: `new-${Math.random()}`,
        };
      }),
    );
    dispatch(editConflictDismissed());
    setSubmitOverwrite(true);
  }

  function revert() {
    dispatch(reloadEvent());
    dispatch(editConflictDismissed());
  }

  return (
    <Modal
      show={!!modal}
      onHide={() => dispatch(editConflictDismissed())}
      backdrop="static"
    >
      <Modal.Header>
        <Modal.Title>Overlapping editing</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>
          This event has been edited by another user or tab
          {' '}
          <strong>
            {modal && moment(modal.updatedAt)
              .tz(TIMEZONE)
              .format('DD.MM.YYYY HH:mm:ss')}
          </strong>
          {deletedQuotas.length || deletedQuestions.length ? ' and removed the following quotas or questions:' : '.'}
        </p>
        <ul>
          {questions
            .filter((question) => question.id && deletedQuestions.includes(question.id))
            .map((question) => (
              <li key={question.key}>
                <strong>Question: </strong>
                {question.question}
              </li>
            ))}
          {quotas
            .filter((quota) => quota.id && deletedQuotas.includes(quota.id))
            .map((quota) => (
              <li key={quota.key}>
                <strong>Quota: </strong>
                {quota.title}
              </li>
            ))}
        </ul>
        <p>
          You can save the event and overwrite the changes of another user, or reject the changes 
          you make and continue from the event edited by another user.        
        </p>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="muted" onClick={() => dispatch(editConflictDismissed())}>Peruuta</Button>
        <Button variant="secondary" onClick={revert}>Reject changes</Button>
        <Button variant="warning" onClick={overwrite}>Overtime</Button>
      </Modal.Footer>
    </Modal>
  );
};

export default EditConflictModal;
