import React, { PropsWithChildren, useMemo } from "react";

import type { SignupForEditResponse, SignupUpdateResponse } from "@tietokilta/ilmomasiina-models";
import { EDIT_TOKEN_HEADER, SignupPaymentStatus } from "@tietokilta/ilmomasiina-models";
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
    result: original,
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

      const isNew = !response.signup.confirmed;
      const alreadyPaid = response.signup.paymentStatus === SignupPaymentStatus.PAID;

      const now = Date.now();
      const editingClosedOnLoad = response.signup.editableForMillis === 0;

      return {
        ...response,
        paymentError,
        // Compute these once when the response arrives.
        editingClosedOnLoad,
        confirmableUntil: now + response.signup.confirmableForMillis,
        editableUntil: now + response.signup.editableForMillis,
        isNew,

        // Show payment if there's a price to pay.
        showPayment: response.signup.price != null && response.signup.price > 0,
        // Allow editing for non-admins if not closed.
        canEdit: !editingClosedOnLoad,
        // Allow name and email editing for non-admins if canEdit and the signup is not confirmed.
        canEditNameAndEmail: !editingClosedOnLoad && isNew,
        // Allow editing of paid questions only if canEdit and not already paid.
        canEditPaidQuestions: !editingClosedOnLoad && !alreadyPaid,

        updateSignup: (update: SignupUpdateResponse) => {
          // Only store the update if the hook hasn't unmounted.
          if (!signal.aborted) setUpdated(update);
        },
      };
    },
    [id, editToken, paid],
  );

  // Merge any updates into the result.
  const result = useMemo(
    () => (original && updated ? { ...original, signup: { ...original.signup, ...updated } } : original),
    [original, updated],
  );

  const localizedEvent = useMemo(
    () => (result && language ? getLocalizedEvent(result.event, language) : result?.event),
    [result, language],
  );
  const localizedSignup = useMemo(
    () => (result && language ? getLocalizedSignup(result, language) : result?.signup),
    [result, language],
  );

  return useShallowMemo<State>({
    editToken,
    pending,
    error: error as ApiError | undefined,
    ...result,
    localizedEvent,
    localizedSignup,
  });
}

export function EditSignupProvider({ id, editToken, paid, language, children }: PropsWithChildren<EditSignupProps>) {
  const state = useEditSignupState({ id, editToken, paid, language });
  return <Provider value={state}>{children}</Provider>;
}
