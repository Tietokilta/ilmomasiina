import { ApiError } from "@tietokilta/ilmomasiina-client";
import {
  AdminEventResponse,
  AdminSignupCreateBody,
  AdminSignupSchema,
  AdminSignupUpdateBody,
  CategoriesResponse,
  CheckSlugResponse,
  ErrorCode,
  EventID,
  SignupID,
} from "@tietokilta/ilmomasiina-models";
import storeSlice from "../../utils/storeSlice";
import type { Root } from "../store";
import { editorEventToServer } from "./selectors";
import type {
  AdminSignupWithQuota,
  EditorEvent,
  EditorExistingSignup,
  EditorNewSignup,
  EditorSignup,
  EditorState,
} from "./types";

const initialState: EditorState = {
  event: null,
  isNew: true,
  slugAvailability: null,
  selectedLanguage: DEFAULT_LANGUAGE,
  allCategories: null,
  moveToQueueModal: null,
  editConflictModal: null,
  editedSignup: null,
};

export type EditorSlice = EditorState & {
  resetState: () => void;

  newEvent: () => void;
  getEvent: (id: EventID, toCopy?: boolean) => Promise<void>;
  reloadEvent: () => void;
  loaded: (event: AdminEventResponse | null, isNew: boolean) => void;

  checkingSlugAvailability: () => void;
  checkSlugAvailability: (slug: string) => Promise<void>;

  languageSelected: (language: string) => void;

  moveToQueueCanceled: () => void;
  editConflictDismissed: () => void;

  loadCategories: () => Promise<void>;

  publishNewEvent: (data: EditorEvent) => Promise<AdminEventResponse>;
  publishEventUpdate: (id: EventID, data: EditorEvent) => Promise<AdminEventResponse | null>;

  editSignup: (signup: AdminSignupWithQuota) => void;
  editNewSignup: (language: string) => void;
  signupEditCanceled: () => void;
  deleteSignup: (id: SignupID) => Promise<boolean>;
  saveSignup: (formData: EditorSignup) => Promise<void>;
};

/** Fields to reset between newly created signups. */
const blankSignup = {
  id: null,
  firstName: "",
  lastName: "",
  email: "",
  answers: [],
  manualPaymentStatus: null,
} satisfies Partial<EditorSignup>;

/* eslint-disable no-param-reassign -- immer in use */

export const editorSlice = storeSlice<Root>()("editor", (set, get, store, getSlice, setSlice, resetState) => ({
  ...initialState,
  resetState,

  newEvent: () => getSlice().loaded(null, true),
  getEvent: async (id: EventID, toCopy = false) => {
    try {
      const response = await get().auth.adminApiFetch<AdminEventResponse>(`admin/events/${id}`);
      getSlice().loaded(response, toCopy);
    } catch (e) {
      setSlice({ loadError: e as ApiError });
    }
  },
  reloadEvent: () => {
    const { event } = getSlice();
    if (!event) return;
    getSlice().resetState();
    getSlice().getEvent(event.id);
  },
  loaded: (event: AdminEventResponse | null, isNew: boolean) =>
    setSlice({
      event,
      isNew,
      selectedLanguage: event?.defaultLanguage ?? DEFAULT_LANGUAGE,
      loadError: undefined,
    }),

  checkingSlugAvailability: () => setSlice({ slugAvailability: "checking" }),
  checkSlugAvailability: async (slug: string) => {
    try {
      const response = await get().auth.adminApiFetch<CheckSlugResponse>(`admin/slugs/${slug}`);
      setSlice({ slugAvailability: response });
    } catch (e) {
      setSlice({ slugAvailability: null });
    }
  },

  languageSelected: (language: string) => setSlice({ selectedLanguage: language }),

  moveToQueueCanceled: () => setSlice({ moveToQueueModal: null }),
  editConflictDismissed: () => setSlice({ editConflictModal: null }),

  loadCategories: async () => {
    try {
      const response = await get().auth.adminApiFetch<CategoriesResponse>("admin/categories");
      setSlice({ allCategories: response });
    } catch (e) {
      setSlice({ allCategories: [] });
      throw e;
    }
  },

  publishNewEvent: async (data: EditorEvent): Promise<AdminEventResponse> => {
    setSlice({ moveToQueueModal: null });

    const cleaned = editorEventToServer(data);
    const response = await get().auth.adminApiFetch<AdminEventResponse>("admin/events", {
      method: "POST",
      body: cleaned,
    });
    setSlice({ event: response, isNew: false });
    return response;
  },
  publishEventUpdate: async (id: EventID, data: EditorEvent): Promise<AdminEventResponse | null> => {
    setSlice({ moveToQueueModal: null });

    const body = editorEventToServer(data);
    try {
      const response = await get().auth.adminApiFetch<AdminEventResponse>(`admin/events/${id}`, {
        method: "PATCH",
        body,
      });
      setSlice({ event: response, isNew: false });
      return response;
    } catch (e) {
      if (e instanceof ApiError && e.code === ErrorCode.WOULD_MOVE_SIGNUPS_TO_QUEUE) {
        setSlice({ moveToQueueModal: { count: e.response!.count } });
        return null;
      }
      if (e instanceof ApiError && e.code === ErrorCode.EDIT_CONFLICT) {
        setSlice({ editConflictModal: e.response! });
        return null;
      }
      throw e;
    }
  },

  editSignup: (signup: AdminSignupWithQuota) =>
    setSlice({
      editedSignup: {
        ...signup,
        quotaId: signup.quota.id,
        language: null,
        sendEmail: true,
        keepEditing: false,
      } satisfies EditorExistingSignup,
    }),
  editNewSignup: (language: string) =>
    setSlice((state) => {
      if (!state.event || !state.event.quotas.length) return state;
      return {
        ...state,
        editedSignup: {
          ...blankSignup,
          quotaId: state.event.quotas[0].id,
          namePublic: false,
          language,
          sendEmail: true,
          keepEditing: false,
        } satisfies EditorNewSignup,
      };
    }),
  signupEditCanceled: () => setSlice({ editedSignup: null }),
  deleteSignup: async (id: SignupID) => {
    try {
      await get().auth.adminApiFetch(`admin/signups/${id}`, { method: "DELETE" });
      return true;
    } catch (e) {
      return false;
    }
  },
  saveSignup: async (formData: EditorSignup): Promise<void> => {
    const saved =
      formData.id == null
        ? await get().auth.adminApiFetch<AdminSignupSchema>(`admin/signups`, {
            method: "POST",
            body: formData satisfies AdminSignupCreateBody,
          })
        : await get().auth.adminApiFetch<AdminSignupSchema>(`admin/signups/${formData.id}`, {
            method: "PATCH",
            body: formData satisfies AdminSignupUpdateBody,
          });

    const { event } = getSlice();
    if (!event) return;
    const isNew = formData.id == null;
    setSlice({
      // Reset the signup to be edited. Keep edit settings and quota ID.
      editedSignup: isNew && formData.keepEditing ? ({ ...formData, ...blankSignup } satisfies EditorNewSignup) : null,
      // Update the event with the saved signup.
      event: {
        ...event,
        quotas: event.quotas.map((quota) =>
          quota.id === formData.quotaId
            ? {
                ...quota,
                // If the signup is new, append it. Otherwise, replace it.
                signups: isNew
                  ? [...quota.signups, saved]
                  : quota.signups.map((signup) => (signup.id === saved.id ? saved : signup)),
              }
            : quota,
        ),
      },
    });
  },
}));
