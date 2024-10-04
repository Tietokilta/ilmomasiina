import React, { PropsWithChildren } from "react";

import type { SignupForEditResponse } from "@tietokilta/ilmomasiina-models";
import { EDIT_TOKEN_HEADER } from "@tietokilta/ilmomasiina-models";
import apiFetch, { ApiError } from "../../api";
import { useAbortablePromise } from "../../utils/abortable";
import useShallowMemo from "../../utils/useShallowMemo";
import { Provider, State } from "./state";

export interface EditSignupProps {
  id: string;
  editToken: string;
}

export { useStateContext as useEditSignupContext, Provider as EditSignupContextProvider } from "./state";
export type { State as EditSignupState } from "./state";
export { useDeleteSignup, useUpdateSignup } from "./actions";

export function useEditSignupState({ id, editToken }: EditSignupProps) {
  const fetchSignup = useAbortablePromise(
    async (signal) => {
      const response = await apiFetch<SignupForEditResponse>(`signups/${id}`, {
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

  return useShallowMemo<State>({
    editToken,
    pending: fetchSignup.pending,
    error: fetchSignup.error as ApiError | undefined,
    ...fetchSignup.result,
    isNew: fetchSignup.result && !fetchSignup.result.signup.confirmed,
  });
}

export function EditSignupProvider({ id, editToken, children }: PropsWithChildren<EditSignupProps>) {
  const state = useEditSignupState({ id, editToken });
  return <Provider value={state}>{children}</Provider>;
}
