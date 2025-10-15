import { ApiError } from "@tietokilta/ilmomasiina-client";
import {
  AdminEventResponse,
  AdminSignupCreateBody,
  AdminSignupSchema,
  AdminSignupUpdateBody,
  CategoriesResponse,
  CheckSlugResponse,
  EditConflictError,
  ErrorCode,
  EventID,
  SignupID,
} from "@tietokilta/ilmomasiina-models";
import adminApiFetch from "../../api";
import type { DispatchAction, GetState } from "../../store/types";
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
  LANGUAGE_SELECTED,
  MOVE_TO_QUEUE_CANCELED,
  MOVE_TO_QUEUE_WARNING,
  RESET,
  SAVED_SIGNUP,
  SIGNUP_EDIT_CANCELED,
} from "./actionTypes";
import { editorEventToServer } from "./selectors";
import type { AdminSignupWithQuota, EditorEvent, EditorSignup } from "./types";

export const resetState = () =>
  <const>{
    type: RESET,
  };

export const loaded = (event: AdminEventResponse) =>
  <const>{
    type: EVENT_LOADED,
    payload: {
      event,
      isNew: false,
    },
  };

export const loadedForCopy = (event: AdminEventResponse) =>
  <const>{
    type: EVENT_LOADED,
    payload: {
      event,
      isNew: true,
    },
  };

export const newEvent = () =>
  <const>{
    type: EVENT_LOADED,
    payload: {
      event: null,
      isNew: true,
    },
  };

export const loadFailed = (error: ApiError) =>
  <const>{
    type: EVENT_LOAD_FAILED,
    payload: error,
  };

export const checkingSlugAvailability = () =>
  <const>{
    type: EVENT_SLUG_CHECKING,
  };

export const slugAvailabilityChecked = (result: CheckSlugResponse | null) =>
  <const>{
    type: EVENT_SLUG_CHECKED,
    payload: result,
  };

export const languageSelected = (language: string) =>
  <const>{
    type: LANGUAGE_SELECTED,
    payload: language,
  };

export const saving = () =>
  <const>{
    type: EVENT_SAVING,
  };

export const moveToQueueWarning = (count: number) =>
  <const>{
    type: MOVE_TO_QUEUE_WARNING,
    payload: { count },
  };

export const moveToQueueCanceled = () =>
  <const>{
    type: MOVE_TO_QUEUE_CANCELED,
  };

export const editConflictDetected = (data: EditConflictError) =>
  <const>{
    type: EDIT_CONFLICT,
    payload: data,
  };

export const editConflictDismissed = () =>
  <const>{
    type: EDIT_CONFLICT_DISMISSED,
  };

export const categoriesLoaded = (categories: string[]) =>
  <const>{
    type: CATEGORIES_LOADED,
    payload: categories,
  };

export const editSignup = (signup: AdminSignupWithQuota) =>
  <const>{
    type: EDIT_SIGNUP,
    payload: signup,
  };

export const editNewSignup = (payload: { language: string }) =>
  <const>{
    type: EDIT_NEW_SIGNUP,
    payload,
  };

export const savedSignup = (payload: { saved: AdminSignupSchema; formData: EditorSignup }) =>
  <const>{
    type: SAVED_SIGNUP,
    payload,
  };

export const signupEditCanceled = () =>
  <const>{
    type: SIGNUP_EDIT_CANCELED,
  };

export type EditorActions =
  | ReturnType<typeof resetState>
  | ReturnType<typeof loaded>
  | ReturnType<typeof loadedForCopy>
  | ReturnType<typeof newEvent>
  | ReturnType<typeof loadFailed>
  | ReturnType<typeof checkingSlugAvailability>
  | ReturnType<typeof slugAvailabilityChecked>
  | ReturnType<typeof languageSelected>
  | ReturnType<typeof saving>
  | ReturnType<typeof moveToQueueWarning>
  | ReturnType<typeof moveToQueueCanceled>
  | ReturnType<typeof editConflictDetected>
  | ReturnType<typeof editConflictDismissed>
  | ReturnType<typeof categoriesLoaded>
  | ReturnType<typeof editSignup>
  | ReturnType<typeof editNewSignup>
  | ReturnType<typeof savedSignup>
  | ReturnType<typeof signupEditCanceled>;

export const getEvent = (id: EventID) => async (dispatch: DispatchAction, getState: GetState) => {
  const { accessToken } = getState().auth;

  try {
    const response = await adminApiFetch<AdminEventResponse>(`admin/events/${id}`, { accessToken }, dispatch);
    dispatch(loaded(response));
  } catch (e) {
    dispatch(loadFailed(e as ApiError));
  }
};

export const copyEvent = (id: EventID) => async (dispatch: DispatchAction, getState: GetState) => {
  const { accessToken } = getState().auth;

  try {
    const response = await adminApiFetch<AdminEventResponse>(`admin/events/${id}`, { accessToken }, dispatch);
    dispatch(loadedForCopy(response));
  } catch (e) {
    dispatch(loadFailed(e as ApiError));
  }
};

export const reloadEvent = () => (dispatch: DispatchAction, getState: GetState) => {
  const { event } = getState().editor;
  if (!event) return;
  dispatch(resetState());
  dispatch(getEvent(event.id));
};

export const checkSlugAvailability = (slug: string) => async (dispatch: DispatchAction, getState: GetState) => {
  const { accessToken } = getState().auth;

  try {
    const response = await adminApiFetch<CheckSlugResponse>(`admin/slugs/${slug}`, { accessToken }, dispatch);
    dispatch(slugAvailabilityChecked(response));
  } catch (e) {
    dispatch(slugAvailabilityChecked(null));
  }
};

export const loadCategories = () => async (dispatch: DispatchAction, getState: GetState) => {
  const { accessToken } = getState().auth;

  try {
    const response = await adminApiFetch<CategoriesResponse>("admin/categories", { accessToken }, dispatch);
    dispatch(categoriesLoaded(response));
  } catch (e) {
    dispatch(categoriesLoaded([]));
    throw e;
  }
};

export const publishNewEvent = (data: EditorEvent) => async (dispatch: DispatchAction, getState: GetState) => {
  dispatch(saving());

  const cleaned = editorEventToServer(data);
  const { accessToken } = getState().auth;

  const response = await adminApiFetch<AdminEventResponse>(
    "admin/events",
    {
      accessToken,
      method: "POST",
      body: cleaned,
    },
    dispatch,
  );
  dispatch(loaded(response));
  return response;
};

export const publishEventUpdate =
  (id: EventID, data: EditorEvent) => async (dispatch: DispatchAction, getState: GetState) => {
    dispatch(saving());

    const body = editorEventToServer(data);
    const { accessToken } = getState().auth;
    const toCents = (v: unknown) => Math.round(Number(v ?? 0) * 100);

    body.quotas = body.quotas.map((q) => ({
        ...q,
        price: toCents(q.price),
    }));

    try {
      const response = await adminApiFetch<AdminEventResponse>(
        `admin/events/${id}`,
        {
          accessToken,
          method: "PATCH",
          body,
        },
        dispatch,
      );
      dispatch(loaded(response));
      return response;
    } catch (e) {
      if (e instanceof ApiError && e.code === ErrorCode.WOULD_MOVE_SIGNUPS_TO_QUEUE) {
        dispatch(moveToQueueWarning(e.response!.count));
        return null;
      }
      if (e instanceof ApiError && e.code === ErrorCode.EDIT_CONFLICT) {
        dispatch(editConflictDetected(e.response!));
        return null;
      }
      throw e;
    }
  };

export const deleteSignup = (id: SignupID) => async (dispatch: DispatchAction, getState: GetState) => {
  const { accessToken } = getState().auth;

  try {
    await adminApiFetch(
      `admin/signups/${id}`,
      {
        accessToken,
        method: "DELETE",
      },
      dispatch,
    );
    return true;
  } catch (e) {
    return false;
  }
};

export const saveSignup = (formData: EditorSignup) => async (dispatch: DispatchAction, getState: GetState) => {
  const { accessToken } = getState().auth;

  if (formData.id == null) {
    const saved = await adminApiFetch<AdminSignupSchema>(
      `admin/signups`,
      {
        accessToken,
        method: "POST",
        body: formData satisfies AdminSignupCreateBody,
      },
      dispatch,
    );
    dispatch(savedSignup({ saved, formData }));
  } else {
    const saved = await adminApiFetch<AdminSignupSchema>(
      `admin/signups/${formData.id}`,
      {
        accessToken,
        method: "PATCH",
        body: formData satisfies AdminSignupUpdateBody,
      },
      dispatch,
    );
    dispatch(savedSignup({ saved, formData }));
  }
};
