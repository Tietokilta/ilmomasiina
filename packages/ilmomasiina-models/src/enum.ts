/** Possible statuses for a signup. */
export enum SignupStatus {
  IN_QUOTA = "in-quota",
  IN_OPEN_QUOTA = "in-open",
  IN_QUEUE = "in-queue",
}

/** Possible payment statuses. */
export enum PaymentStatus {
  /** The payment is being created in the payment processor. */
  CREATING = "creating",
  /** The payment has been created and is pending confirmation. */
  PENDING = "pending",
  /** The payment has been successfully completed. */
  PAID = "paid",
  /** The payment has expired or has been canceled. */
  EXPIRED = "expired",
  /** Creating the payment in the payment processor has failed. */
  CREATION_FAILED = "creation_failed",
  /** The payment has been refunded by an admin. */
  REFUNDED = "refunded",
}

/** Possible effective payment statuses for signups. */
export enum SignupPaymentStatus {
  /** The payment is required but not yet completed. */
  PENDING = "pending",
  /** The payment has been successfully completed. */
  PAID = "paid",
  /** The payment has been refunded. */
  REFUNDED = "refunded",
}

/** Possible manual (admin-managed) payment statuses for signups. */
export enum ManualPaymentStatus {
  /** The signup has been paid externally. */
  PAID = "paid",
  /** The signup has been refunded externally. */
  REFUNDED = "refunded",
}

/** Possible question types. */
export enum QuestionType {
  TEXT = "text",
  TEXT_AREA = "textarea",
  NUMBER = "number",
  SELECT = "select",
  CHECKBOX = "checkbox",
}

/** Payment modes for events. */
export enum PaymentMode {
  /** No payments. */
  DISABLED = "disabled",
  /** Manual payments confirmed by admin. */
  MANUAL = "manual",
  /** Online payments via payment integration. */
  ONLINE = "online",
}

/** Event types that can be audit logged. */
export enum AuditEvent {
  CREATE_EVENT = "event.create",
  DELETE_EVENT = "event.delete",
  PUBLISH_EVENT = "event.publish",
  UNPUBLISH_EVENT = "event.unpublish",
  EDIT_EVENT = "event.edit",
  PROMOTE_SIGNUP = "signup.queuePromote",
  CREATE_SIGNUP = "signup.create",
  DELETE_SIGNUP = "signup.delete",
  EDIT_SIGNUP = "signup.edit",
  CREATE_USER = "user.create",
  DELETE_USER = "user.delete",
  RESET_PASSWORD = "user.resetpassword",
  CHANGE_PASSWORD = "user.changepassword",
}

export enum ErrorCode {
  BAD_SESSION = "BadSession",
  EDIT_CONFLICT = "EditConflict",
  WOULD_MOVE_SIGNUPS_TO_QUEUE = "WouldMoveSignupsToQueue",
  WRONG_OLD_PASSWORD = "WrongOldPassword",
  SIGNUPS_CLOSED = "SignupsClosed",
  NO_SUCH_QUOTA = "NoSuchQuota",
  NO_SUCH_SIGNUP = "NoSuchSignup",
  BAD_EDIT_TOKEN = "BadEditToken",
  CANNOT_DELETE_SELF = "CannotDeleteSelf",
  INITIAL_SETUP_NEEDED = "InitialSetupNeeded",
  INITIAL_SETUP_ALREADY_DONE = "InitialSetupAlreadyDone",
  SIGNUP_VALIDATION_ERROR = "SignupValidationError",
  EVENT_VALIDATION_ERROR = "EventValidationError",
  VALIDATION_ERROR = "FST_ERR_VALIDATION",
  ONLINE_PAYMENTS_DISABLED = "OnlinePaymentsDisabled",
  SIGNUP_NOT_CONFIRMED = "SignupNotConfirmed",
  SIGNUP_IN_QUEUE = "SignupInQueue",
  SIGNUP_ALREADY_PAID = "SignupAlreadyPaid",
  PAYMENT_NOT_REQUIRED = "PaymentNotRequired",
  PAYMENT_IN_PROGRESS = "PaymentInProgress",
  PAYMENT_NOT_FOUND = "PaymentNotFound",
  PAYMENT_NOT_COMPLETE = "PaymentNotComplete",
  PAYMENT_RATE_LIMITED = "PaymentRateLimited",
}

export enum SignupFieldError {
  MISSING = "missing",
  WRONG_TYPE = "wrongType",
  TOO_LONG = "tooLong",
  INVALID_EMAIL = "invalidEmail",
  NOT_A_NUMBER = "notANumber",
  NOT_AN_OPTION = "notAnOption",
  DUPLICATE_OPTION = "duplicateOption",
}
