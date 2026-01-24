import type { SignupForEditResponse, SignupUpdateResponse } from "@tietokilta/ilmomasiina-models";
import { ApiError } from "../../api";
import { createStateContext } from "../../utils/stateContext";

export type State = Partial<SignupForEditResponse> & {
  localizedEvent?: SignupForEditResponse["event"];
  localizedSignup?: SignupForEditResponse["signup"];
  /** If true, the signup has not been confirmed. Will be updated by `updateSignup`. */
  isNew?: boolean;
  pending: boolean;
  error?: ApiError;
  /** The error related to payment completion, if any. */
  paymentError?: ApiError;
  editToken: string;

  /** Whether the signup was closed for editing when the view was loaded. */
  editingClosedOnLoad?: boolean;
  /** The timestamp in milliseconds when the signup will be deleted unless confirmed. */
  confirmableUntil?: number;
  /** The timestamp in milliseconds until which the signup can be edited. */
  editableUntil?: number;

  /** Whether to show the payment section for the signup. */
  showPayment?: boolean;
  /** Whether the signup can be edited. */
  canEdit?: boolean;
  /** Whether the name and email fields can be edited. */
  canEditNameAndEmail?: boolean;
  /** Whether paid questions can be edited. */
  canEditPaidQuestions?: boolean;
  /** Whether the signup is expecting an online payment now or later. */
  canPayOnline?: boolean;
  /** Whether the signup is in any quota (open or normal). A signup cannot be paid if it is not in a quota. */
  isInQuota?: boolean;

  preview?: { setPreviewingForm: (form: boolean) => void };
  updateSignup?: (response: SignupUpdateResponse) => void;
};

export const { Provider, useStateContext, createThunk } = createStateContext<State>();
