import React from 'react';

import moment from 'moment-timezone';
import { Button, Modal } from 'react-bootstrap';
import { useForm } from 'react-final-form';
import { Trans, useTranslation } from 'react-i18next';

import useEvent from '@tietokilta/ilmomasiina-components/dist/utils/useEvent';
import { EditConflictError } from '@tietokilta/ilmomasiina-models';
import { editConflictDismissed, reloadEvent } from '../../../modules/editor/actions';
import { EditorEvent, EditorQuestion, EditorQuota } from '../../../modules/editor/types';
import { useTypedDispatch, useTypedSelector } from '../../../store/reducers';
import { useFieldValue } from './hooks';

const DeletedQuotasAndQuestions = ({ modal }: { modal: EditConflictError }) => {
  const questions = useFieldValue<EditorQuestion[]>('questions');
  const quotas = useFieldValue<EditorQuota[]>('quotas');
  const { t } = useTranslation();

  return (
    <ul>
      {questions
        .filter((question) => question.id && modal.deletedQuestions.includes(question.id))
        .map((question) => (
          <li key={question.key}>
            <strong>
              {t('editor.editConflict.question')}
            </strong>
            {' '}
            {question.question}
          </li>
        ))}
      {quotas
        .filter((quota) => quota.id && modal.deletedQuotas.includes(quota.id))
        .map((quota) => (
          <li key={quota.key}>
            <strong>
              {t('editor.editConflict.quota')}
            </strong>
            {' '}
            {quota.title}
          </li>
        ))}
    </ul>
  );
};

type Props = {
  onSave: () => void;
};

const EditConflictModal = ({ onSave }: Props) => {
  const dispatch = useTypedDispatch();
  const modal = useTypedSelector((state) => state.editor.editConflictModal);
  const { t } = useTranslation();

  const deletedQuestions = modal?.deletedQuestions || [];
  const deletedQuotas = modal?.deletedQuotas || [];

  const form = useForm<EditorEvent>();

  const overwrite = useEvent(() => {
    const { questions, quotas } = form.getState().values;
    // Tell the backend we want to overwrite the latest change.
    form.change('updatedAt', modal!.updatedAt);
    // We still need to re-create the questions and quotas that were deleted, by removing their old IDs.
    form.change(
      'questions',
      questions?.map((question) => {
        if (!question.id || !deletedQuestions.includes(question.id)) return question;
        return {
          ...question,
          id: undefined,
          key: `new-${Math.random()}`,
        };
      }) ?? [],
    );
    form.change(
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
    onSave();
  });

  const revert = useEvent(() => {
    dispatch(reloadEvent());
    dispatch(editConflictDismissed());
  });

  const cancel = useEvent(() => dispatch(editConflictDismissed()));

  return (
    <Modal show={!!modal} onHide={cancel} backdrop="static">
      <Modal.Header>
        <Modal.Title>{t('editor.editConflict.title')}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>
          <Trans
            t={t}
            i18nKey={
              deletedQuotas.length || deletedQuestions.length
                ? 'editor.editConflict.info1.withDeleted'
                : 'editor.editConflict.info1'
            }
          >
            {'Another user or tab has edited this event at '}
            <strong>
              {{ time: modal && moment(modal.updatedAt).tz(TIMEZONE).format('DD.MM.YYYY HH:mm:ss') }}
            </strong>
            .
          </Trans>
        </p>
        {modal && <DeletedQuotasAndQuestions modal={modal} />}
        <p>
          {t('editor.editConflict.info2')}
        </p>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="muted" onClick={cancel}>
          {t('editor.editConflict.action.cancel')}
        </Button>
        <Button variant="secondary" onClick={revert}>
          {t('editor.editConflict.action.revert')}
        </Button>
        <Button variant="warning" onClick={overwrite}>
          {t('editor.editConflict.action.overwrite')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default EditConflictModal;
