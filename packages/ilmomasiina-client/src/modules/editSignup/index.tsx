import React, { PropsWithChildren, useMemo } from "react";

import type { SignupForEditResponse, SignupUpdateResponse } from "@tietokilta/ilmomasiina-models";
import { EDIT_TOKEN_HEADER, PaymentMode, SignupPaymentStatus, SignupStatus } from "@tietokilta/ilmomasiina-models";
import { ApiError, apiFetch } from "../../api";
import { useAbortablePromise } from "../../utils/abortable";
import { getLocalizedEvent, getLocalizedSignup } from "../../utils/localizedEvent";
import useShallowMemo from "../../utils/useShallowMemo";
import { Provider, State } from "./state";

export interface EditSignupProps {
  id: string;
  editToken: string;
  paid?: boolean;
  language?: string;
}

export { useStateContext as useEditSignupContext, Provider as EditSignupContextProvider } from "./state";
export type { State as EditSignupState } from "./state";
export * from "./actions";

export function useEditSignupState({ id, editToken, paid, language }: EditSignupProps) {
  const [updated, setUpdated] = React.useState<SignupUpdateResponse | null>(null);

  const {
    result: initialValues,
    error,
    pending,
  } = useAbortablePromise(
    async (signal) => {
      setUpdated(null);
      let response;
      let paymentError: ApiError | undefined;
      if (paid) {
        // Attempt to complete payment. Fall back to normal fetch if it fails.
        try {
          response = await apiFetch<SignupForEditResponse>(`signups/${id}/payment/complete`, {
            signal,
            method: "POST",
            headers: {
              [EDIT_TOKEN_HEADER]: editToken,
            },
          });
        } catch (err) {
          paymentError = err as ApiError;
        }
      }
      if (!response) {
        response = await apiFetch<SignupForEditResponse>(`signups/${id}`, {
          signal,
          headers: {
            [EDIT_TOKEN_HEADER]: editToken,
          },
        });
      }
      const now = Date.now();

      // Return here only the things that don't change when updating the signup.
      // (Technically the event could change, but it's not returned with SignupUpdateResponse.)
      return {
        event: response.event,
        signup: response.signup,
        paymentError,
        confirmableUntil: now + response.signup.confirmableForMillis,
        editableUntil: now + response.signup.editableForMillis,
        updateSignup: (update: SignupUpdateResponse) => {
          // Only store the update if the hook hasn't unmounted.
          if (!signal.aborted) setUpdated(update);
        },
      } satisfies Partial<State>;
    },
    [id, editToken, paid],
  );

  // Merge any updates into the result and compute some derived state.
  const initialEvent = initialValues?.event;
  const initialSignup = initialValues?.signup;
  const mergedValues = useMemo(() => {
    if (!initialEvent || !initialSignup) return undefined;

    const event = initialEvent;
    const signup = { ...initialSignup, ...updated };

    const isNew = !signup.confirmed;
    const alreadyPaid = signup.paymentStatus === SignupPaymentStatus.PAID;
    const editingClosedOnLoad = signup.editableForMillis === 0;

    return {
      event,
      signup,
      isNew,
      editingClosedOnLoad,
      // Show payment if there's a price to pay.
      showPayment: signup.price != null && signup.price > 0,
      // Allow editing for non-admins if not closed.
      canEdit: !editingClosedOnLoad,
      // Allow name and email editing for non-admins if canEdit and the signup is not confirmed.
      canEditNameAndEmail: !editingClosedOnLoad && isNew,
      // Allow editing of paid questions only if canEdit and not already paid.
      canEditPaidQuestions: !editingClosedOnLoad && !alreadyPaid,
      // The signup can be paid online if payments are enabled and the signup is pending payment.
      canPayOnline: event.payments === PaymentMode.ONLINE && signup.paymentStatus === SignupPaymentStatus.PENDING,
      // The signup is considered in quota if it's in quota or in open quota.
      isInQuota: signup.status === SignupStatus.IN_QUOTA || signup.status === SignupStatus.IN_OPEN_QUOTA,
    } satisfies Partial<State>;
  }, [initialEvent, initialSignup, updated]);

  const localizedEvent = useMemo(
    () => (mergedValues && language ? getLocalizedEvent(mergedValues.event, language) : mergedValues?.event),
    [mergedValues, language],
  );
  const localizedSignup = useMemo(
    () => (mergedValues && language ? getLocalizedSignup(mergedValues, language) : mergedValues?.signup),
    [mergedValues, language],
  );

  return useShallowMemo<State>({
    editToken,
    pending,
    error: error as ApiError | undefined,
    ...initialValues,
    ...mergedValues,
    localizedEvent,
    localizedSignup,
  });
}

export function EditSignupProvider({ id, editToken, paid, language, children }: PropsWithChildren<EditSignupProps>) {
  const state = useEditSignupState({ id, editToken, paid, language });
  return <Provider value={state}>{children}</Provider>;
}
