export const signupStatuses = ['in-quota', 'in-open', 'in-queue'] as const;
/** Possible statuses for a signup. */
export type SignupStatus = typeof signupStatuses[number];

export const questionTypes = ['text', 'textarea', 'number', 'select', 'checkbox'] as const;
/** Possible types for a question. */
export type QuestionType = typeof questionTypes[number];

/** Event types that can be audit logged. */
export enum AuditEvent {
  CREATE_EVENT = 'event.create',
  DELETE_EVENT = 'event.delete',
  PUBLISH_EVENT = 'event.publish',
  UNPUBLISH_EVENT = 'event.unpublish',
  EDIT_EVENT = 'event.edit',
  PROMOTE_SIGNUP = 'signup.queuePromote',
  DELETE_SIGNUP = 'signup.delete',
  EDIT_SIGNUP = 'signup.edit',
  CREATE_USER = 'user.create',
  DELETE_USER = 'user.delete',
  RESET_PASSWORD = 'user.resetpassword',
  CHANGE_PASSWORD = 'user.changepassword',
}

export enum ErrorCode {
  BAD_SESSION = 'BadSession',
  EDIT_CONFLICT = 'EditConflict',
  WOULD_MOVE_SIGNUPS_TO_QUEUE = 'WouldMoveSignupsToQueue',
  WRONG_OLD_PASSWORD = 'WrongOldPassword',
  SIGNUPS_CLOSED = 'SignupsClosed',
  NO_SUCH_QUOTA = 'NoSuchQuota',
  NO_SUCH_SIGNUP = 'NoSuchSignup',
  BAD_EDIT_TOKEN = 'BadEditToken',
  CANNOT_DELETE_SELF = 'CannotDeleteSelf',
  INITIAL_SETUP_NEEDED = 'InitialSetupNeeded',
  INITIAL_SETUP_ALREADY_DONE = 'InitialSetupAlreadyDone',
  VALIDATION_ERROR = 'FST_ERR_VALIDATION',
}
