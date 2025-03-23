import React, { useMemo } from "react";

import { Button, Form as BsForm, Modal, Spinner } from "react-bootstrap";
import { FieldInputProps, Form, FormRenderProps, useFormState } from "react-final-form";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";

import { ApiError, EditSignupContextProvider, EditSignupState, FieldRow } from "@tietokilta/ilmomasiina-components";
import CommonFields from "@tietokilta/ilmomasiina-components/dist/routes/EditSignup/components/CommonFields";
import {
  formDataToSignupUpdate,
  SignupFormData,
  signupToFormData,
} from "@tietokilta/ilmomasiina-components/dist/routes/EditSignup/components/formData";
import QuestionFields from "@tietokilta/ilmomasiina-components/dist/routes/EditSignup/components/QuestionFields";
import { errorDesc } from "@tietokilta/ilmomasiina-components/dist/utils/errorMessage";
import useEvent from "@tietokilta/ilmomasiina-components/dist/utils/useEvent";
import type { QuotaID } from "@tietokilta/ilmomasiina-models";
import { saveSignup, signupEditCanceled } from "../../../modules/editor/actions";
import type { EditorEvent, EditorSignup } from "../../../modules/editor/types";
import { useTypedDispatch, useTypedSelector } from "../../../store/reducers";
import { editorEventToUserEvent, previewDummyQuota } from "./userComponentInterop";

const QuotaField = (props: FieldInputProps<QuotaID>) => {
  const event = useTypedSelector((state) => state.editor.event!);
  return (
    <BsForm.Control as="select" {...props}>
      {event.quotas.map((quota) => (
        // eslint-disable-next-line react/no-array-index-key
        <option key={quota.id} value={quota.id}>
          {quota.title}
        </option>
      ))}
    </BsForm.Control>
  );
};

const EditSignupModalBody = ({ handleSubmit, submitting }: FormRenderProps<SignupFormData<EditorSignup>>) => {
  const isNew = useTypedSelector((state) => state.editor.editedSignup?.id == null);
  const dispatch = useTypedDispatch();
  const { t } = useTranslation();
  const onSubmit = useEvent(handleSubmit);

  const cancel = useEvent(() => dispatch(signupEditCanceled()));

  return (
    <BsForm className="ilmo--form" onSubmit={onSubmit}>
      <Modal.Header>
        <Modal.Title>{isNew ? t("editor.editSignup.title.create") : t("editor.editSignup.title.edit")}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {isNew && <FieldRow name="quotaId" as={QuotaField} label={t("editor.editSignup.quota")} required />}
        <CommonFields />
        <QuestionFields name="answers" />
        <FieldRow
          name="sendEmail"
          as={BsForm.Check}
          type="checkbox"
          label={t("editor.editSignup.sendEmail")}
          checkAlign
          checkLabel={isNew ? t("editor.editSignup.sendEmail.create") : t("editor.editSignup.sendEmail.edit")}
        />
        {isNew && (
          <FieldRow
            name="keepEditing"
            as={BsForm.Check}
            type="checkbox"
            label={t("editor.editSignup.keepEditing")}
            checkAlign
            checkLabel={t("editor.editSignup.keepEditing.check")}
          />
        )}
        <p>{t("editor.editSignup.validation")}</p>
      </Modal.Body>
      <Modal.Footer>
        {submitting && <Spinner animation="border" />}
        <Button variant="muted" onClick={cancel} disabled={submitting}>
          {t("editor.editSignup.action.cancel")}
        </Button>
        <Button variant="primary" type="submit" disabled={submitting}>
          {t("editor.editSignup.action.save")}
        </Button>
      </Modal.Footer>
    </BsForm>
  );
};

const EditSignupModal = () => {
  const dispatch = useTypedDispatch();
  const editedSignup = useTypedSelector((state) => state.editor.editedSignup);
  const { values } = useFormState<EditorEvent>();
  const { t } = useTranslation();

  // We will reuse components from the user signup form, so prepare a mock context.
  const editSignupCtx = useMemo((): EditSignupState | null => {
    if (!editedSignup) return null;
    const convertedEvent = editorEventToUserEvent(values);
    return {
      pending: false,
      editToken: "",
      isNew: true,
      event: convertedEvent,
      signup: {
        createdAt: new Date().toISOString(),
        status: null,
        position: null,
        confirmed: false,
        editableForMillis: Infinity,
        confirmableForMillis: Infinity,
        // Override with values from signup if this is an existing signup.
        ...editedSignup,
        id: editedSignup.id ?? "new",
        quota: previewDummyQuota(convertedEvent),
      },
      editingClosedOnLoad: false,
      confirmableUntil: Infinity,
      editableUntil: Infinity,
      admin: true,
    };
  }, [values, editedSignup]);

  const initialValues = useMemo(() => editedSignup && signupToFormData(editedSignup), [editedSignup]);

  const onSubmit = useEvent(async (formData: SignupFormData<EditorSignup>) => {
    const update = formDataToSignupUpdate(formData);
    try {
      await dispatch(saveSignup(update));
      toast.success(t("editor.editSignup.success"), { autoClose: 5000 });
    } catch (error) {
      toast.error(errorDesc(t, error as ApiError, "editor.saveSignupError"), { autoClose: 5000 });
    }
  });
  const cancel = useEvent(() => dispatch(signupEditCanceled()));

  return (
    <Modal show={editedSignup != null} onHide={cancel} dialogClassName="event-editor--signup-dialog">
      {editSignupCtx && initialValues && (
        <EditSignupContextProvider value={editSignupCtx}>
          <Form<SignupFormData<EditorSignup>> onSubmit={onSubmit} initialValues={initialValues}>
            {(props) => <EditSignupModalBody {...props} />}
          </Form>
        </EditSignupContextProvider>
      )}
    </Modal>
  );
};

export default EditSignupModal;
