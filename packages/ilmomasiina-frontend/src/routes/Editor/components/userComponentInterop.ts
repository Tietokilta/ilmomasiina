import { SignupForEdit, SignupStatus, UserEventResponse } from "@tietokilta/ilmomasiina-models";
import { editorEventToServer } from "../../../modules/editor/actions";
import type { EditorEvent } from "../../../modules/editor/types";

export const editorEventToUserEvent = (form: EditorEvent): UserEventResponse => {
  const serverEvent = editorEventToServer(form);
  return {
    ...serverEvent,
    id: "preview",
    quotas: serverEvent.quotas.map((quota) => ({
      ...quota,
      id: quota.id ?? `preview${Math.random()}`,
      signupCount: 0,
      signups: [],
    })),
    questions: serverEvent.questions.map((question) => ({
      ...question,
      id: question.id ?? `preview${Math.random()}`,
    })),
    registrationClosed: false,
    millisTillOpening: Infinity,
  };
};

export const previewDummyQuota = (event?: UserEventResponse): SignupForEdit["quota"] =>
  event?.quotas[0] ?? {
    id: `preview${Math.random()}`,
    title: "\u2013",
    size: 0,
  };

export const previewDummySignup = (event: UserEventResponse): SignupForEdit => ({
  id: "preview",
  firstName: null,
  lastName: null,
  email: null,
  answers: [],
  confirmed: false,
  createdAt: new Date().toISOString(),
  namePublic: false,
  quota: previewDummyQuota(event),
  status: SignupStatus.IN_QUOTA,
  position: 1,
  confirmableForMillis: 30 * 60 * 60 * 1000,
  editableForMillis: 30 * 60 * 60 * 1000,
});
