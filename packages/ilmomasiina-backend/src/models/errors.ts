import { ErrorCode } from "@tietokilta/ilmomasiina-models";
import CustomError from "../util/customError";

export class EventValidationError extends CustomError {
  constructor(message: string, statusCode = 400) {
    super(statusCode, ErrorCode.EVENT_VALIDATION_ERROR, message);
  }
}

/** Postgres error code for a violated unique constraint. */
export const UNIQUE_VIOLATION = "23505";
/** Name of the unique constraint on event slugs, as defined in the schema. */
const SLUG_CONSTRAINT = "event_slug_key";
/** Postgres error code for an exception raised by a trigger. */
export const RAISE_EXCEPTION = "P0001";

/** Finds the Postgres error in an error thrown by a query, if any. Drizzle wraps it as the cause. */
function findDatabaseError(error: unknown) {
  for (let current = error; current instanceof Error; current = current.cause) {
    if ("code" in current && typeof current.code === "string") {
      const constraint =
        "constraint" in current && typeof current.constraint === "string" ? current.constraint : undefined;
      return { code: current.code, constraint };
    }
  }
  return undefined;
}

/** Finds the Postgres error code in an error thrown by a query, if any. */
export function databaseErrorCode(error: unknown): string | undefined {
  return findDatabaseError(error)?.code;
}

/** Converts database constraint errors from saving an event to appropriate HTTP errors. */
export function convertEventDatabaseErrors(error: unknown) {
  const dbError = findDatabaseError(error);
  if (dbError?.code === UNIQUE_VIOLATION && dbError.constraint === SLUG_CONSTRAINT) {
    return new EventValidationError("slug must be unique", 409);
  }
  return error;
}
