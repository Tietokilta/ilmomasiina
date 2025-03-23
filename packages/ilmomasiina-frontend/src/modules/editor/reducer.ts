import {
  CATEGORIES_LOADED,
  EDIT_CONFLICT,
  EDIT_CONFLICT_DISMISSED,
  EDIT_NEW_SIGNUP,
  EDIT_SIGNUP,
  EVENT_LOAD_FAILED,
  EVENT_LOADED,
  EVENT_SAVING,
  EVENT_SLUG_CHECKED,
  EVENT_SLUG_CHECKING,
  MOVE_TO_QUEUE_CANCELED,
  MOVE_TO_QUEUE_WARNING,
  RESET,
  SAVED_SIGNUP,
  SIGNUP_EDIT_CANCELED,
} from "./actionTypes";
import type { EditorActions, EditorExistingSignup, EditorNewSignup, EditorSignup, EditorState } from "./types";

const initialState: EditorState = {
  event: null,
  isNew: true,
  slugAvailability: null,
  allCategories: null,
  moveToQueueModal: null,
  editConflictModal: null,
  editedSignup: null,
};

/** Fields to reset between newly created signups. */
const blankSignup = {
  id: null,
  firstName: "",
  lastName: "",
  email: "",
  answers: [],
} satisfies Partial<EditorSignup>;

export default function reducer(state = initialState, action: EditorActions): EditorState {
  switch (action.type) {
    case RESET:
      return initialState;
    case EVENT_LOADED:
      return {
        ...state,
        event: action.payload.event,
        isNew: action.payload.isNew,
        loadError: undefined,
      };
    case EVENT_LOAD_FAILED:
      return {
        ...state,
        loadError: action.payload,
      };
    case EVENT_SLUG_CHECKING:
      return {
        ...state,
        slugAvailability: "checking",
      };
    case EVENT_SLUG_CHECKED:
      return {
        ...state,
        slugAvailability: action.payload,
      };
    case EVENT_SAVING:
      return {
        ...state,
        moveToQueueModal: null,
      };
    case MOVE_TO_QUEUE_WARNING:
      return {
        ...state,
        moveToQueueModal: action.payload,
      };
    case MOVE_TO_QUEUE_CANCELED:
      return {
        ...state,
        moveToQueueModal: null,
      };
    case EDIT_CONFLICT:
      return {
        ...state,
        editConflictModal: action.payload,
      };
    case EDIT_CONFLICT_DISMISSED:
      return {
        ...state,
        editConflictModal: null,
      };
    case CATEGORIES_LOADED:
      return {
        ...state,
        allCategories: action.payload,
      };
    case EDIT_SIGNUP: {
      return {
        ...state,
        editedSignup: {
          ...action.payload,
          quotaId: action.payload.quota.id,
          language: null,
          sendEmail: true,
          keepEditing: false,
        } satisfies EditorExistingSignup,
      };
    }
    case EDIT_NEW_SIGNUP:
      if (!state.event || !state.event.quotas.length) return state;
      return {
        ...state,
        editedSignup: {
          ...blankSignup,
          quotaId: state.event.quotas[0].id,
          namePublic: false,
          language: action.payload.language,
          sendEmail: true,
          keepEditing: false,
        } satisfies EditorNewSignup,
      };
    case SAVED_SIGNUP: {
      if (!state.event) return state;
      const { saved, formData } = action.payload;
      const isNew = formData.id == null;
      return {
        ...state,
        // Reset the signup to be edited. Keep edit settings and quota ID.
        editedSignup:
          isNew && formData.keepEditing ? ({ ...formData, ...blankSignup } satisfies EditorNewSignup) : null,
        // Update the event with the saved signup.
        event: {
          ...state.event,
          quotas: state.event.quotas.map((quota) =>
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
      };
    }
    case SIGNUP_EDIT_CANCELED:
      return {
        ...state,
        editedSignup: null,
      };
    default:
      return state;
  }
}
