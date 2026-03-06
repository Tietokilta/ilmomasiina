import React, { BaseSyntheticEvent } from "react";

import { Button, ButtonGroup, Spinner } from "react-bootstrap";
import { useFormState } from "react-final-form";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import useStore from "../../../modules/store";
import paths from "../../../paths";

type Props = {
  onSave: (evt: BaseSyntheticEvent) => void;
  onSaveToggleDraft: () => void;
};

const EditorToolbar = ({ onSave, onSaveToggleDraft }: Props) => {
  const isSubmitting = useFormState({
    subscription: { submitting: true },
  }).submitting;
  const event = useStore((state) => state.editor.event);
  const isNew = useStore((state) => state.editor.isNew);
  const isDraft = event?.draft || isNew;

  const { t } = useTranslation();

  return (
    <>
      <h1>{isNew ? t("editor.title.new") : t("editor.title.edit")}</h1>
      <div className="event-editor--buttons-wrapper">
        <div className="flex-fill">
          <Link to={paths.adminEventsList}>&#8592; {t("editor.action.goBack")}</Link>
        </div>
        {isSubmitting && <Spinner animation="border" />}
        <div className="event-editor--public-status">
          <div className={`event-editor--bubble ${isDraft ? "draft" : "public"} event-editor--animated`} />
          <span>
            {isDraft ? (
              t("editor.status.draft")
            ) : (
              <Link to={paths.eventDetails(event!.slug)} target="_blank">
                {t("editor.status.published")}
              </Link>
            )}
          </span>
        </div>
        <ButtonGroup>
          {!isNew && (
            <Button
              type="button"
              disabled={isSubmitting}
              variant={isDraft ? "success" : "warning"}
              formNoValidate
              onClick={onSaveToggleDraft}
            >
              {isDraft ? t("editor.action.publish") : t("editor.action.convertToDraft")}
            </Button>
          )}
          <Button type="button" disabled={isSubmitting} variant="secondary" formNoValidate onClick={onSave}>
            {isNew ? t("editor.action.saveDraft") : t("editor.action.saveChanges")}
          </Button>
        </ButtonGroup>
      </div>
    </>
  );
};

export default EditorToolbar;
