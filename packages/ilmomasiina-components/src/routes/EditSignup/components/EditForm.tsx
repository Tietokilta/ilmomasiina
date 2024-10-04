import React, { useEffect, useMemo, useState } from "react";

import { FORM_ERROR } from "final-form";
import { Button, Form as BsForm } from "react-bootstrap";
import { Form, FormRenderProps, useFormState } from "react-final-form";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";

import { ErrorCode, QuestionID, SignupUpdateBody, SignupValidationError } from "@tietokilta/ilmomasiina-models";
import { ApiError } from "../../../api";
import { linkComponent, useNavigate } from "../../../config/router";
import { usePaths } from "../../../contexts/paths";
import { useDeleteSignup, useEditSignupContext, useUpdateSignup } from "../../../modules/editSignup";
import { useDurationFormatter } from "../../../utils/dateFormat";
import { errorDesc } from "../../../utils/errorMessage";
import useEvent from "../../../utils/useEvent";
import CommonFields from "./CommonFields";
import DeleteSignup from "./DeleteSignup";
import NarrowContainer from "./NarrowContainer";
import QuestionFields from "./QuestionFields";
import SignupStatus from "./SignupStatus";

const SubmitError = () => {
  const { isNew } = useEditSignupContext();
  const { submitError } = useFormState({ subscription: { submitError: true } });
  const { t } = useTranslation();

  return submitError ? (
    <p className="ilmo--form-error">
      {errorDesc(t, submitError, isNew ? "editSignup.signupError" : "editSignup.editError")}
    </p>
  ) : null;
};

/** The remaining unconfirmed edit time is highlighted when it goes below this value. */
const EXPIRY_WARNING_THRESHOLD = 5 * 60 * 1000;

const EditableUntil = () => {
  const { event, signup, editingClosedOnLoad, editableUntil, confirmableUntil } = useEditSignupContext();
  const paths = usePaths();
  const Link = linkComponent();
  const { t } = useTranslation();
  const duration = useDurationFormatter();

  // Rerender every second
  const [, refresh] = useState({});
  useEffect(() => {
    if (editingClosedOnLoad) return undefined;
    const timer = window.setInterval(() => refresh({}), 1000);
    return () => window.clearInterval(timer);
  }, [editingClosedOnLoad]);

  if (editingClosedOnLoad) {
    return (
      <>
        <p>{t("editSignup.editable.closed")}</p>
        <p>
          <Link to={paths.eventDetails(event!.slug)}>{t("editSignup.backToEvent")}</Link>
        </p>
      </>
    );
  }

  const now = Date.now();
  if (signup!.confirmed) {
    return <p>{t("editSignup.editable.confirmed", { duration: duration(Math.max(editableUntil! - now)) })}</p>;
  }

  // Highlight when little time is left
  const timeLeft = Math.max(0, confirmableUntil! - now);
  const highlight = timeLeft < EXPIRY_WARNING_THRESHOLD;
  return (
    <p className={highlight ? "ilmo--form-error" : ""}>
      {t("editSignup.editable.unconfirmed", { duration: duration(timeLeft) })}
    </p>
  );
};

const EditFormSubmit = ({ disabled }: { disabled: boolean }) => {
  const { event, editingClosedOnLoad, isNew, preview } = useEditSignupContext();
  const paths = usePaths();
  const Link = linkComponent();
  const { t } = useTranslation();

  return editingClosedOnLoad ? null : (
    <>
      <p>
        {t("editSignup.editInstructions")}
        {event!.emailQuestion && ` ${t("editSignup.editInstructions.email")}`}
      </p>
      <nav className="ilmo--submit-buttons">
        {!preview && !isNew && (
          <Button as={Link} variant="link" to={paths.eventDetails(event!.slug)}>
            {t("editSignup.action.cancel")}
          </Button>
        )}
        {!preview && (
          <Button type="submit" variant="primary" formNoValidate disabled={disabled}>
            {isNew ? t("editSignup.action.save") : t("editSignup.action.edit")}
          </Button>
        )}
        {preview && (
          <Button variant="primary" onClick={() => preview.setPreviewingForm(false)}>
            {t("editSignup.action.back")}
          </Button>
        )}
      </nav>
    </>
  );
};

// react-final-form works better when we convert answers to an object
type SignupFormData = Omit<SignupUpdateBody, "answers"> & {
  answers: Record<QuestionID, string | string[]>;
};

type BodyProps = FormRenderProps<SignupFormData> & {
  deleting: boolean;
  onDelete: () => void;
};

const EditFormBody = ({ handleSubmit, deleting, onDelete }: BodyProps) => {
  const { isNew, editingClosedOnLoad, preview } = useEditSignupContext();
  const { t } = useTranslation();
  const { submitting } = useFormState({ subscription: { submitting: true } });
  const onSubmit = useEvent(handleSubmit);

  return useMemo(
    () => (
      <NarrowContainer>
        <h2>
          {/* eslint-disable-next-line no-nested-ternary */}
          {preview ? t("editSignup.title.preview") : isNew ? t("editSignup.title.signup") : t("editSignup.title.edit")}
        </h2>
        <SignupStatus />
        <EditableUntil />
        <SubmitError />
        <BsForm onSubmit={onSubmit} className="ilmo--form">
          <CommonFields />
          <QuestionFields name="answers" />
          <EditFormSubmit disabled={submitting || deleting} />
        </BsForm>
        {!editingClosedOnLoad && !preview && <DeleteSignup deleting={deleting} onDelete={onDelete} />}
      </NarrowContainer>
    ),
    [onSubmit, onDelete, deleting, isNew, editingClosedOnLoad, submitting, preview, t],
  );
};

const EditForm = () => {
  const { event, signup, isNew, preview } = useEditSignupContext();
  const updateSignup = useUpdateSignup();
  const deleteSignup = useDeleteSignup();
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();
  const paths = usePaths();
  const {
    t,
    i18n: { language },
  } = useTranslation();

  // Convert answers to object form for react-final-form.
  const initialValues = useMemo(
    () => ({
      ...signup,
      answers: Object.fromEntries(signup!.answers.map(({ questionId, answer }) => [questionId, answer])),
    }),
    [signup],
  );

  const onSubmit = useEvent(async (formData: SignupFormData) => {
    if (preview) return undefined;
    const progressToast = toast.loading(isNew ? t("editSignup.status.signup") : t("editSignup.status.edit"));
    // Convert answers back from object to array.
    const answers = Object.entries(formData.answers).map(([questionId, answer]) => ({
      questionId,
      answer,
    }));
    try {
      await updateSignup({ ...formData, answers, language });
      toast.update(progressToast, {
        render: isNew ? t("editSignup.status.signupSuccess") : t("editSignup.status.editSuccess"),
        type: toast.TYPE.SUCCESS,
        autoClose: 5000,
        closeButton: true,
        closeOnClick: true,
        isLoading: false,
      });
      if (isNew) {
        navigate(paths.eventDetails(event!.slug));
      }
      return undefined;
    } catch (error) {
      toast.update(progressToast, {
        render: errorDesc(t, error as ApiError, isNew ? "editSignup.signupError" : "editSignup.editError"),
        type: toast.TYPE.ERROR,
        autoClose: 5000,
        closeButton: true,
        closeOnClick: true,
        isLoading: false,
      });
      // Augment the submit errors object if the error is a submit validation error.
      const errors =
        error instanceof ApiError && error.code === ErrorCode.SIGNUP_VALIDATION_ERROR
          ? (error.response! as SignupValidationError).errors
          : null;
      return { [FORM_ERROR]: error, ...errors };
    }
  });

  const onDelete = useEvent(async () => {
    const progressToast = toast.loading(t("editSignup.status.delete"));
    try {
      setDeleting(true);
      await deleteSignup();
      toast.update(progressToast, {
        render: t("editSignup.status.deleteSuccess"),
        type: toast.TYPE.SUCCESS,
        closeButton: true,
        closeOnClick: true,
        isLoading: false,
      });
      navigate(paths.eventDetails(event!.slug));
    } catch (error) {
      toast.update(progressToast, {
        render: errorDesc(t, error as ApiError, "editSignup.deleteError"),
        type: toast.TYPE.ERROR,
        autoClose: 5000,
        closeButton: true,
        closeOnClick: true,
        isLoading: false,
      });
    } finally {
      setDeleting(false);
    }
  });

  return (
    <Form<SignupFormData> onSubmit={onSubmit} initialValues={initialValues}>
      {(props) => <EditFormBody {...props} deleting={deleting} onDelete={onDelete} />}
    </Form>
  );
};

export default EditForm;
