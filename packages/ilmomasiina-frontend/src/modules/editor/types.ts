import type { ApiError } from "@tietokilta/ilmomasiina-client";
import type { QuotaSignups, SignupWithQuota } from "@tietokilta/ilmomasiina-client/dist/utils/signupUtils";
import type {
  AdminEventResponse,
  AdminSignupCreateBody,
  AdminSignupSchema,
  AdminSignupUpdateBody,
  CheckSlugResponse,
  EditConflictError,
  EventUpdateBody,
  QuestionID,
  QuestionUpdate,
  QuotaID,
  QuotaUpdate,
  SignupCreateBody,
} from "@tietokilta/ilmomasiina-models";

export enum EditorEventType {
  ONLY_EVENT = "event",
  EVENT_WITH_SIGNUP = "event+signup",
  ONLY_SIGNUP = "signup",
}

export type AdminQuotaSignups = QuotaSignups<AdminEventResponse>;
export type AdminSignupWithQuota = SignupWithQuota<AdminEventResponse>;

// For new signups, the local state has all creation fields initialized (some to null), plus id: null as a tag.
export type EditorNewSignup = Required<AdminSignupCreateBody> & { id: null; keepEditing: boolean };
// For existing signups, the local state has all update fields initialized from the existing signup, plus id and quotaId.
export type EditorExistingSignup = Required<AdminSignupUpdateBody> &
  Pick<AdminSignupSchema, "id"> &
  SignupCreateBody & { keepEditing: boolean };

/** Admin signup editor form data type */
export type EditorSignup = EditorNewSignup | EditorExistingSignup;

export interface EditorState {
  event: AdminEventResponse | null;
  isNew: boolean;
  loadError?: ApiError;
  slugAvailability: null | "checking" | CheckSlugResponse;
  selectedLanguage: string;
  allCategories: null | string[];
  moveToQueueModal: { count: number } | null;
  editConflictModal: EditConflictError | null;
  editedSignup: EditorSignup | null;
}

/** Question type for event editor */
export interface EditorQuestion extends Omit<QuestionUpdate, "options"> {
  key: QuestionID;
  options: string[];
  prices: number[];
  /**
   * Used as a separate checkbox to enable the pricing inputs for each question. Otherwise the UI looks
   * horrible if you have a lot of options but don't care about pricing (like most use cases).
   */
  hasPrices: boolean;
}

/** Quota type for event editor */
export type EditorQuota = QuotaUpdate & {
  key: QuotaID;
};

/** Root form data type for event editor */
export interface EditorEvent extends Omit<
  Required<EventUpdateBody>,
  // Omit fields we'll overwrite for editing states that aren't valid in the API
  "quotas" | "questions" | "date" | "endDate" | "registrationStartDate" | "registrationEndDate" | "openQuotaSize"
> {
  eventType: EditorEventType;

  date: Date | null;
  endDate: Date | null;

  questions: EditorQuestion[];

  registrationStartDate: Date | null;
  registrationEndDate: Date | null;
  quotas: EditorQuota[];
  useOpenQuota: boolean;
  openQuotaSize: number | null;
}

/** Stricter version of EventUpdateBody with fields we guarantee to return from `editorEventToServer`. */
export type ConvertedEditorEvent = Omit<Required<EventUpdateBody>, "moveSignupsToQueue">;
