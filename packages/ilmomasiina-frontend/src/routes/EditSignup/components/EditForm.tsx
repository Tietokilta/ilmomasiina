import React, { useEffect, useMemo, useState } from "react";

import { FORM_ERROR } from "final-form";
import { Alert, Button, Form as BsForm, Table } from "react-bootstrap";
import { Form, FormRenderProps, useFormState } from "react-final-form";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import {
  ApiError,
  errorDesc,
  useDeleteSignup,
  useEditSignupContext,
  useStartPayment,
  useUpdateSignup,
} from "@tietokilta/ilmomasiina-client";
import { ErrorCode, SignupPaymentStatus, SignupValidationError } from "@tietokilta/ilmomasiina-models";
import LinkButton from "../../../components/LinkButton";
import type { TKey } from "../../../i18n";
import paths from "../../../paths";
import { useDurationFormatter } from "../../../utils/dateFormat";
import { useDecimalPriceFormatter } from "../../../utils/priceFormat";
import useEvent from "../../../utils/useEvent";
import CommonFields from "./CommonFields";
import DeleteSignup from "./DeleteSignup";
import { formDataToSignupUpdate, SignupFormData, signupToFormData } from "./formData";
import NarrowContainer from "./NarrowContainer";
import QuestionFields from "./QuestionFields";
import SignupStatusAndPosition from "./SignupStatusAndPosition";

type PaymentProps = {
  disabled: boolean;
  onPay: () => void;
};

const Payment = ({ disabled, onPay }: PaymentProps) => {
  const { signup, paymentError, canPayOnline, isInQuota } = useEditSignupContext();
  const formatPrice = useDecimalPriceFormatter(signup!.currency ?? CURRENCY);
  const { t } = useTranslation();

  let alert = null;
  if (paymentError) {
    alert = <Alert variant="danger">{t(errorDesc<TKey>(paymentError, "editSignup.paymentError"))}</Alert>;
  } else if (signup!.paymentStatus === SignupPaymentStatus.PENDING) {
    if (isInQuota) {
      alert = <Alert variant="info">{t("editSignup.payment.status.pending")}</Alert>;
    } else {
      alert = <Alert variant="info">{t("editSignup.payment.status.inQueue")}</Alert>;
    }
  } else if (signup!.paymentStatus === SignupPaymentStatus.PAID) {
    alert = <Alert variant="success">{t("editSignup.payment.status.paid")}</Alert>;
  } else if (signup!.paymentStatus === SignupPaymentStatus.REFUNDED) {
    alert = <Alert variant="info">{t("editSignup.payment.status.refunded")}</Alert>;
  }

  return (
    <section className="ilmo--payment-summary">
      <h2>{t("editSignup.title.payment")}</h2>
      {alert}
      <Table>
        <tbody>
          {signup!.products?.map((product, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <tr key={i}>
              <td className="ilmo--amount">{t("editSignup.payment.amount", { amount: product.amount })}</td>
              <td className="ilmo--product">{product.name}</td>
              <td className="ilmo--price">{formatPrice(product.unitPrice)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th className="ilmo--total" colSpan={2}>
              {t("editSignup.payment.total")}
            </th>
            <th className="ilmo--price">{formatPrice(signup!.price ?? 0)}</th>
          </tr>
        </tfoot>
      </Table>
      {canPayOnline && (
        <nav className="ilmo--submit-buttons">
          <Button variant="primary" onClick={onPay} disabled={disabled || !isInQuota}>
            {t("editSignup.action.pay")}
          </Button>
        </nav>
      )}
    </section>
  );
};

const SubmitError = () => {
  const { isNew } = useEditSignupContext();
  const { submitError } = useFormState({ subscription: { submitError: true } });
  const { t } = useTranslation();

  return submitError ? (
    <p className="ilmo--form-error">
      {t(errorDesc<TKey>(submitError, isNew ? "editSignup.signupError" : "editSignup.editError"))}
    </p>
  ) : null;
};

/** The remaining unconfirmed edit time is highlighted when it goes below this value. */
const EXPIRY_WARNING_THRESHOLD = 5 * 60 * 1000;

const EditableUntil = () => {
  const { signup, editingClosedOnLoad, editableUntil, confirmableUntil } = useEditSignupContext();
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
    return <p>{t("editSignup.editable.closed")}</p>;
  }

  if (signup!.paymentStatus === SignupPaymentStatus.PAID) {
    // Handled by the <Alert> in <Payment>
    return null;
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
  const { localizedEvent: event, isNew, canEdit, preview } = useEditSignupContext();
  const { t } = useTranslation();

  return (
    <>
      {canEdit && (
        <p>
          {t("editSignup.editInstructions")}
          {event!.emailQuestion && ` ${t("editSignup.editInstructions.email")}`}
        </p>
      )}
      <nav className="ilmo--submit-buttons">
        {!preview && !isNew && (
          <LinkButton variant="link" to={paths.eventDetails(event!.slug)}>
            {t("editSignup.action.back")}
          </LinkButton>
        )}
        {!preview && (
          <Button type="submit" variant="primary" formNoValidate disabled={!canEdit || disabled}>
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

type BodyProps = FormRenderProps<SignupFormData> & {
  processing: boolean;
  onDelete: () => void;
  onPay: () => void;
};

const EditFormBody = ({ handleSubmit, processing, onDelete, onPay }: BodyProps) => {
  const { isNew, canEdit, showPayment, preview } = useEditSignupContext();
  const { t } = useTranslation();
  const { submitting } = useFormState({ subscription: { submitting: true } });
  const onSubmit = useEvent(handleSubmit);

  return useMemo(
    () => (
      <NarrowContainer>
        {showPayment && <Payment onPay={onPay} disabled={submitting || processing} />}
        <h2>
          {
            // eslint-disable-next-line no-nested-ternary
            preview
              ? t("editSignup.title.preview")
              : // eslint-disable-next-line no-nested-ternary
                !canEdit
                ? t("editSignup.title.view")
                : isNew
                  ? t("editSignup.title.signup")
                  : t("editSignup.title.edit")
          }
        </h2>
        <SignupStatusAndPosition />
        <EditableUntil />
        <SubmitError />
        <BsForm onSubmit={onSubmit} className="ilmo--form">
          <CommonFields />
          <QuestionFields name="answers" />
          <EditFormSubmit disabled={submitting || processing} />
        </BsForm>
        {canEdit && !preview && <DeleteSignup processing={processing} onDelete={onDelete} />}
      </NarrowContainer>
    ),
    [onSubmit, onDelete, onPay, processing, isNew, submitting, canEdit, preview, showPayment, t],
  );
};

const EditForm = () => {
  const { localizedEvent: event, localizedSignup: signup, isNew, preview } = useEditSignupContext();
  const updateSignup = useUpdateSignup();
  const deleteSignup = useDeleteSignup();
  const startPayment = useStartPayment();
  const [processing, setProcessing] = useState(false);
  const navigate = useNavigate();
  const {
    t,
    i18n: { language },
  } = useTranslation();

  // Convert answers to object form for react-final-form.
  const initialValues = useMemo(() => signupToFormData(signup!), [signup]);

  const onSubmit = useEvent(async (formData: SignupFormData) => {
    if (preview) return undefined;
    const progressToast = toast.loading(isNew ? t("editSignup.status.signup") : t("editSignup.status.edit"));
    // Convert answers back from object to array.
    const update = formDataToSignupUpdate(formData);
    try {
      const updated = await updateSignup({ ...update, language });
      toast.update(progressToast, {
        // eslint-disable-next-line no-nested-ternary
        render: isNew
          ? updated.paymentStatus != null
            ? t("editSignup.status.signupSuccess.needPayment")
            : t("editSignup.status.signupSuccess")
          : t("editSignup.status.editSuccess"),
        type: "success",
        autoClose: 5000,
        closeButton: true,
        closeOnClick: true,
        isLoading: false,
      });
      // If this was a new signup and no payment is needed, go to event details.
      if (isNew && updated.paymentStatus == null) {
        navigate(paths.eventDetails(event!.slug));
      }
      return undefined;
    } catch (error) {
      toast.update(progressToast, {
        render: t(errorDesc<TKey>(error as ApiError, isNew ? "editSignup.signupError" : "editSignup.editError")),
        type: "error",
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
      setProcessing(true);
      await deleteSignup();
      toast.update(progressToast, {
        render: t("editSignup.status.deleteSuccess"),
        type: "success",
        closeButton: true,
        closeOnClick: true,
        isLoading: false,
      });
      navigate(paths.eventDetails(event!.slug));
    } catch (error) {
      toast.update(progressToast, {
        render: t(errorDesc<TKey>(error as ApiError, "editSignup.deleteError")),
        type: "error",
        autoClose: 5000,
        closeButton: true,
        closeOnClick: true,
        isLoading: false,
      });
    } finally {
      setProcessing(false);
    }
  });

  const onPay = useEvent(async () => {
    const progressToast = toast.loading(t("editSignup.status.startingPayment"));
    try {
      setProcessing(true);
      const paymentUrl = await startPayment();
      toast.dismiss(progressToast);
      // Redirect to payment provider.
      window.location.href = paymentUrl;
    } catch (error) {
      toast.update(progressToast, {
        render: t(errorDesc<TKey>(error as ApiError, "editSignup.paymentError")),
        type: "error",
        autoClose: 5000,
        closeButton: true,
        closeOnClick: true,
        isLoading: false,
      });
      // Keep the form disabled when redirecting, so only reset this in catch.
      setProcessing(false);
    }
  });

  return (
    <Form<SignupFormData> onSubmit={onSubmit} initialValues={initialValues}>
      {(props) => <EditFormBody {...props} processing={processing} onDelete={onDelete} onPay={onPay} />}
    </Form>
  );
};

export default EditForm;
