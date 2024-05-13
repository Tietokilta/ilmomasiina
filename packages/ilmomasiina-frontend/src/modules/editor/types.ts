import type { ApiError } from '@tietokilta/ilmomasiina-components';
import type {
  AdminEventResponse, CheckSlugResponse, EditConflictError, EventUpdateBody,
  QuestionID, QuestionUpdate, QuotaID, QuotaUpdate,
} from '@tietokilta/ilmomasiina-models';
import type { EditorEventType } from './actions';

export interface EditorState {
  event: AdminEventResponse | null;
  isNew: boolean;
  loadError?: ApiError;
  slugAvailability: null | 'checking' | CheckSlugResponse;
  allCategories: null | string[];
  moveToQueueModal: { count: number } | null;
  editConflictModal: EditConflictError | null;
}

/** Question type for event editor */
export interface EditorQuestion extends Omit<QuestionUpdate, 'options'> {
  key: QuestionID;
  options: string[];
}

/** Quota type for event editor */
export type EditorQuota = QuotaUpdate & {
  key: QuotaID;
};

/** Root form data type for event editor */
export interface EditorEvent extends Omit<
EventUpdateBody, 'quotas' | 'questions' | 'date' | 'endDate' | 'registrationStartDate' | 'registrationEndDate'
> {
  eventType: EditorEventType;

  date: Date | undefined;
  endDate: Date | undefined;

  questions?: EditorQuestion[];

  registrationStartDate: Date | undefined;
  registrationEndDate: Date | undefined;
  quotas: EditorQuota[];
  useOpenQuota: boolean;
}

export type { EditorActions } from './actions';
export { EditorEventType } from './actions';
