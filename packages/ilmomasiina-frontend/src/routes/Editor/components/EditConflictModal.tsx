import React from "react";

import { Button, Modal } from "react-bootstrap";
import { useForm } from "react-final-form";
import { Trans, useTranslation } from "react-i18next";

import { EditConflictError } from "@tietokilta/ilmomasiina-models";
import { EditorEvent, EditorQuestion, EditorQuota } from "../../../modules/editor/types";
import useStore from "../../../modules/store";
import { useActionDateTimeFormatter } from "../../../utils/dateFormat";
import useEvent from "../../../utils/useEvent";
import { useFieldValue } from "./hooks";

const DeletedQuotasAndQuestions = ({ modal }: { modal: EditConflictError }) => {
  const questions = useFieldValue<EditorQuestion[]>("questions");
  const quotas = useFieldValue<EditorQuota[]>("quotas");
  const { t } = useTranslation();

  return (
    <ul>
      {questions
        .filter((question) => question.id && modal.deletedQuestions.includes(question.id))
        .map((question) => (
          <li key={question.key}>
            <strong>{t("editor.editConflict.question")}</strong> {question.question}
          </li>
        ))}
      {quotas
        .filter((quota) => quota.id && modal.deletedQuotas.includes(quota.id))
        .map((quota) => (
          <li key={quota.key}>
            <strong>{t("editor.editConflict.quota")}</strong> {quota.title}
          </li>
        ))}
    </ul>
  );
};

type Props = {
  onSave: () => void;
};

const EditConflictModal = ({ onSave }: Props) => {
  const { editConflictModal: modal, editConflictDismissed, reloadEvent } = useStore((state) => state.editor);
  const { t } = useTranslation();
  const actionDateFormat = useActionDateTimeFormatter();

  const deletedQuestions = modal?.deletedQuestions || [];
  const deletedQuotas = modal?.deletedQuotas || [];

  const form = useForm<EditorEvent>();

  const overwrite = useEvent(() => {
    const { questions, quotas } = form.getState().values;
    // Tell the backend we want to overwrite the latest change.
    form.change("updatedAt", modal!.updatedAt);
    // We still need to re-create the questions and quotas that were deleted, by removing their old IDs.
    form.change(
      "questions",
      questions.map((question) => {
        if (!question.id || !deletedQuestions.includes(question.id)) return question;
        return {
          ...question,
          id: undefined,
          key: `new-${Math.random()}`,
        };
      }) ?? [],
    );
    form.change(
      "quotas",
      quotas.map((quota) => {
        if (!quota.id || !deletedQuotas.includes(quota.id)) return quota;
        return {
          ...quota,
          id: undefined,
          key: `new-${Math.random()}`,
        };
      }),
    );
    editConflictDismissed();
    onSave();
  });

  const revert = useEvent(() => {
    reloadEvent();
    editConflictDismissed();
  });

  return (
    <Modal show={!!modal} onHide={editConflictDismissed} backdrop="static">
      <Modal.Header>
        <Modal.Title>{t("editor.editConflict.title")}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>
          <Trans
            t={t}
            i18nKey={
              deletedQuotas.length || deletedQuestions.length
                ? "editor.editConflict.info1.withDeleted"
                : "editor.editConflict.info1"
            }
          >
            {"Another user or tab has edited this event at "}
            <strong>{{ time: modal && actionDateFormat.format(new Date(modal.updatedAt)) }}</strong>.
          </Trans>
        </p>
        {modal && <DeletedQuotasAndQuestions modal={modal} />}
        <p>{t("editor.editConflict.info2")}</p>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="muted" onClick={editConflictDismissed}>
          {t("editor.editConflict.action.cancel")}
        </Button>
        <Button variant="secondary" onClick={revert}>
          {t("editor.editConflict.action.revert")}
        </Button>
        <Button variant="warning" onClick={overwrite}>
          {t("editor.editConflict.action.overwrite")}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default EditConflictModal;
