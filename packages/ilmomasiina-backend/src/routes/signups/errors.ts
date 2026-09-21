import { ErrorCode, SignupValidationErrors } from "@tietokilta/ilmomasiina-models";
import CustomError from "../../util/customError";

export class SignupsClosed extends CustomError {
  constructor(message: string) {
    super(403, ErrorCode.SIGNUPS_CLOSED, message);
  }
}

export class NoSuchQuota extends CustomError {
  constructor(message: string) {
    super(404, ErrorCode.NO_SUCH_QUOTA, message);
  }
}

export class NoSuchSignup extends CustomError {
  constructor(message: string) {
    super(404, ErrorCode.NO_SUCH_SIGNUP, message);
  }
}

export class SignupValidationError extends CustomError {
  public readonly errors: SignupValidationErrors;

  constructor(message: string, errors: SignupValidationErrors) {
    super(400, ErrorCode.SIGNUP_VALIDATION_ERROR, message);
    this.errors = errors;
  }
}
