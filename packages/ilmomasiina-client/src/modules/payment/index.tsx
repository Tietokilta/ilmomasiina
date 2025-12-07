import React, { PropsWithChildren, useMemo } from "react";

import { EDIT_TOKEN_HEADER, SignupPaymentResponse } from "@tietokilta/ilmomasiina-models";
import { ApiError, apiFetch } from "../../api";
import { useAbortablePromise } from "../../utils/abortable";
import { getLocalizedEvent, getLocalizedSignup } from "../../utils/localizedEvent";
import useShallowMemo from "../../utils/useShallowMemo";
import { Provider, State } from "./state";

export interface PaymentProps {
  id: string;
  editToken: string;
  language?: string;
}

export { useStateContext as usePaymentContext, Provider as PaymentContextProvider } from "./state";
export type { State as PaymentState } from "./state";

export function usePaymentState({ id, editToken, language }: PaymentProps) {
  const { result, error, pending } = useAbortablePromise(
    async (signal) => {
      const response = await apiFetch<SignupPaymentResponse>(`payments/${id}`, {
        signal,
        headers: {
          [EDIT_TOKEN_HEADER]: editToken,
        },
      });
      const now = Date.now();
      return {
        ...response,
        signup: {
          ...response.signup,
          firstName: response.signup.firstName || "",
          lastName: response.signup.lastName || "",
          email: response.signup.email || "",
        },
        // Compute these once when the response arrives.
        editingClosedOnLoad: response.signup.editableForMillis === 0,
        confirmableUntil: now + response.signup.confirmableForMillis,
        editableUntil: now + response.signup.editableForMillis,
      };
    },
    [id, editToken],
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
    isNew: result && !result.signup.confirmed,
  });
}

export function PaymentProvider({ id, editToken, language, children }: PropsWithChildren<PaymentProps>) {
  const state = usePaymentState({ id, editToken, language });
  return <Provider value={state}>{children}</Provider>;
}
