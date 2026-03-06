import { UniqueConstraintError, ValidationError } from "sequelize";

import { ErrorCode } from "@tietokilta/ilmomasiina-models";
import CustomError from "../util/customError";

export class EventValidationError extends CustomError {
  constructor(message: string, statusCode = 400) {
    super(statusCode, ErrorCode.EVENT_VALIDATION_ERROR, message);
  }
}

/** Converts Sequelize errors to appropriate HTTP errors. */
export function convertSequelizeValidationErrors(error: unknown) {
  if (error instanceof UniqueConstraintError) {
    return new EventValidationError(error.errors[0].message, 409);
  }
  if (error instanceof ValidationError) {
    return new EventValidationError(error.errors[0].message);
  }
  return error;
}
