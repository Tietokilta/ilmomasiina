import React, { useMemo } from "react";

import { Alert, Button, Form as BsForm, Modal, Spinner } from "react-bootstrap";
import { FieldInputProps, Form, FormRenderProps, useFormState } from "react-final-form";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";

import {
  ApiError,
  EditSignupContextProvider,
  EditSignupState,
  errorDesc,
  getLocalizedEvent,
  useEditSignupContext,
} from "@tietokilta/ilmomasiina-client";
import { questionHasPrices } from "@tietokilta/ilmomasiina-client/dist/utils/paymentUtils";
import { QuotaID } from "@tietokilta/ilmomasiina-models";
import FieldRow from "../../../components/FieldRow";
import type { TKey } from "../../../i18n";
import type { EditorEvent, EditorSignup } from "../../../modules/editor/types";
import useStore from "../../../modules/store";
import useEvent from "../../../utils/useEvent";
import CommonFields from "../../EditSignup/components/CommonFields";
import { formDataToSignupUpdate, SignupFormData, signupToFormData } from "../../EditSignup/components/formData";
import QuestionFields from "../../EditSignup/components/QuestionFields";
import { editorEventToUserEvent, previewDummyQuota } from "./userComponentInterop";

const QuotaField = (props: FieldInputProps<QuotaID>) => {
  const quotas = useStore((state) => state.editor.event!.quotas);
  return (
    <BsForm.Select {...props}>
      {quotas.map((quota) => (
        // eslint-disable-next-line react/no-array-index-key
        <option key={quota.id} value={quota.id}>
          {quota.title}
        </option>
      ))}
    </BsForm.Select>
  );
};

const EditSignupModalBody = ({ handleSubmit, submitting }: FormRenderProps<SignupFormData<EditorSignup>>) => {
  const isNew = useStore((state) => state.editor.editedSignup?.id == null);
  const signupEditCanceled = useStore((state) => state.editor.signupEditCanceled);
  const { t } = useTranslation();
  const onSubmit = useEvent(handleSubmit);
  const { event } = useEditSignupContext();

  // TODO: When quotas can be changed, this needs to also check for paid quotas (i.e. eventHasPayments).
  const questions = event?.questions;
  const hasPaidQuestions = useMemo(() => questions?.some(questionHasPrices), [questions]);

  return (
    <BsForm className="ilmo--form" onSubmit={onSubmit}>
      <Modal.Header>
        <Modal.Title>{isNew ? t("editor.editSignup.title.create") : t("editor.editSignup.title.edit")}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {isNew && <FieldRow name="quotaId" as={QuotaField} label={t("editor.editSignup.quota")} required />}
        <CommonFields />
        <QuestionFields name="answers" validate={false} />
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
        <Alert variant="warning">
          <p className="mb-0">{t("editor.editSignup.validation")}</p>
          {hasPaidQuestions && !isNew && <p className="mb-0 mt-2">{t("editor.editSignup.priceChangeWarning")}</p>}
        </Alert>
      </Modal.Body>
      <Modal.Footer>
        {submitting && <Spinner animation="border" />}
        <Button variant="muted" onClick={signupEditCanceled} disabled={submitting}>
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
  const { editedSignup, saveSignup, signupEditCanceled } = useStore((state) => state.editor);
  const { values } = useFormState<EditorEvent>();
  const { t } = useTranslation();

  // We will reuse components from the user signup form, so prepare a mock context.
  const editSignupCtx = useMemo((): EditSignupState | null => {
    if (!editedSignup) return null;
    const convertedEvent = editorEventToUserEvent(values);
    const signup = {
      createdAt: new Date().toISOString(),
      status: null,
      position: null,
      confirmed: false,
      price: 0,
      currency: CURRENCY,
      products: [],
      paymentStatus: null,
      deletedAt: null,
      editableForMillis: Infinity,
      confirmableForMillis: Infinity,
      // Override with values from signup if this is an existing signup.
      ...editedSignup,
      id: editedSignup.id ?? "new",
      quota: previewDummyQuota(convertedEvent),
    };
    return {
      pending: false,
      editToken: "",
      isNew: true,
      event: convertedEvent,
      localizedEvent: getLocalizedEvent(convertedEvent, editedSignup?.language ?? values.defaultLanguage),
      signup,
      localizedSignup: signup, // No need for quota name localization
      editingClosedOnLoad: false,
      confirmableUntil: Infinity,
      editableUntil: Infinity,
      showPayment: false,
      canEdit: true,
      canEditNameAndEmail: true,
      canEditPaidQuestions: true,
    };
  }, [values, editedSignup]);

  const initialValues = useMemo(() => editedSignup && signupToFormData(editedSignup), [editedSignup]);

  const onSubmit = useEvent(async (formData: SignupFormData<EditorSignup>) => {
    const update = formDataToSignupUpdate(formData);
    try {
      await saveSignup(update);
      toast.success(t("editor.editSignup.success"), { autoClose: 5000 });
    } catch (error) {
      toast.error(t(errorDesc<TKey>(error as ApiError, "editor.saveSignupError")), { autoClose: 5000 });
    }
  });

  return (
    <Modal show={editedSignup != null} onHide={signupEditCanceled} dialogClassName="event-editor--signup-dialog">
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
