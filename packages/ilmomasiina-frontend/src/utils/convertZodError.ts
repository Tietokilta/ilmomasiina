import { FORM_ERROR } from "final-form";
import { z, ZodError } from "zod";

// Zod produces a _errors array for each field. Post-process to the format expected to final-form:
// only one error per field, and a leaf field at that.

type FinalFormErrorObject<T, R> = T extends unknown[]
  ? (R | FinalFormErrorObject<T[number], R>)[]
  : { [K in keyof T]?: R | FinalFormErrorObject<T[K], R> };

type FinalFormRootError<T, R> = FinalFormErrorObject<T, R> & { [FORM_ERROR]?: R };

export default function convertZodError<T extends object, R>(
  zodErr: ZodError<T>,
  convertIssue: (issue: z.core.$ZodIssue) => R,
): FinalFormRootError<T, R>;

export default function convertZodError<T extends object>(zodErr: ZodError<T>): FinalFormRootError<T, z.core.$ZodIssue>;

/** Converts a Zod formatted error to a final-form compatible format. */
export default function convertZodError<T extends object, R>(
  zodErr: ZodError<T>,
  convertIssue = (issue: z.core.$ZodIssue): R => issue as R,
): FinalFormRootError<T, R> {
  // Assume the root is always an object; start with an object, even if the typing would allow an array.
  type Result = { [key: PropertyKey]: Result | Result[] | R | null };
  const result = {} as Result;
  for (const issue of zodErr.issues) {
    if (!issue.path.length) {
      // Error at the form root. Place in the special FORM_ERROR slot.
      if (result[FORM_ERROR] == null) result[FORM_ERROR] = convertIssue(issue);
    } else {
      // Error in some path. Create the objects along the path and place the error.
      let current = result;
      for (let i = 0; i < issue.path.length; i++) {
        const key = issue.path[i];
        if (typeof current[key] === "string") {
          // If there is already an error here, ignore this one.
        } else if (i === issue.path.length - 1) {
          // If this is the last segment, place the stringified error here.
          current[key] = convertIssue(issue);
        } else {
          // Determine whether this key points to an array.
          // Final-form errors out on any numeric keys on non-arrays, so this is easy.
          const nextKey = issue.path[i + 1];
          if (Number.isNaN(Number(nextKey))) {
            // Add the key if missing.
            current[key] ??= {};
            // Walk into it.
            current = current[key] as Result;
            // Ensure we're now walking into an array; ignore incompatible types.
            if (Array.isArray(current)) break;
          } else {
            current[key] ??= [];
            current = current[key] as Result;
            if (!Array.isArray(current)) break;
          }
        }
      }
    }
  }
  return result as FinalFormRootError<T, R>;
}
