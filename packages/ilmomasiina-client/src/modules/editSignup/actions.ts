import type { SignupUpdateBody, SignupUpdateResponse, StartPaymentResponse } from "@tietokilta/ilmomasiina-models";
import { EDIT_TOKEN_HEADER } from "@tietokilta/ilmomasiina-models";
import { apiFetch } from "../../api";
import { createThunk } from "./state";

/** Updates the signup in the backend, then in the frontend state. Returns the updated signup. */
export const useUpdateSignup = createThunk(
  ({ signup, editToken, updateSignup }) =>
    async (answers: SignupUpdateBody) => {
      const update = await apiFetch<SignupUpdateResponse>(`signups/${signup!.id}`, {
        method: "PATCH",
        body: answers,
        headers: {
          [EDIT_TOKEN_HEADER]: editToken,
        },
      });
      updateSignup?.(update);
      return update;
    },
);

/** Deletes the signup in the backend. */
export const useDeleteSignup = createThunk(({ signup, editToken }) => async () => {
  await apiFetch(`signups/${signup!.id}`, {
    method: "DELETE",
    headers: {
      [EDIT_TOKEN_HEADER]: editToken,
    },
  });
});

/** Starts the payment process for the signup in the backend. Returns the payment URL. */
export const useStartPayment = createThunk(({ signup, editToken }) => async () => {
  const payment = await apiFetch<StartPaymentResponse>(`signups/${signup!.id}/payment/start`, {
    method: "POST",
    headers: {
      [EDIT_TOKEN_HEADER]: editToken,
    },
  });
  return payment.paymentUrl;
});
