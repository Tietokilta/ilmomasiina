import type { SignupForEditResponse } from "@tietokilta/ilmomasiina-models";
import { ApiError } from "../../api";
import { createStateContext } from "../../utils/stateContext";

export type State = Partial<SignupForEditResponse> & {
  localizedEvent?: SignupForEditResponse["event"];
  localizedSignup?: SignupForEditResponse["signup"];
  isNew?: boolean;
  pending: boolean;
  error?: ApiError;
  editToken: string;
  editingClosedOnLoad?: boolean;
  confirmableUntil?: number;
  editableUntil?: number;
  preview?: { setPreviewingForm: (form: boolean) => void };
  admin?: boolean;
};

export const { Provider, useStateContext, createThunk } = createStateContext<State>();
