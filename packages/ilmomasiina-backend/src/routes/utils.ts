import { SignupForEditResponse } from "@tietokilta/ilmomasiina-models";
import { Answer } from "../models/answer";
import { Event } from "../models/event";
import { Question } from "../models/question";
import { Quota } from "../models/quota";
import { Signup } from "../models/signup";
import { NoSuchSignup } from "./signups/errors";

/** Converts given value to a Date if it is a string, and otherwise just passthroughs the input */
// eslint-disable-next-line import/prefer-default-export
export function toDate<T>(s: T): Date | Exclude<T, string> {
  return typeof s === "string" ? new Date(s) : (s as Exclude<T, string>);
}

/** Utility type that converts fields in the imported API to string. */
export type StringifyApi<T> = {
  [P in keyof T]: T[P] extends (infer E)[] // all arrays are stringified recursively
    ? StringifyApi<E>[]
    : // Date | null --> string | null
      // Date --> string
      // (also matches "x: null", but that's an useless type anyway)
      T[P] extends Date | null
      ? null extends T[P]
        ? string | null
        : string
      : // basic types: any subset of boolean | number | string | null --> itself
        T[P] extends boolean | number | string | null
        ? T[P]
        : // other types (essentially, objects) are stringified recursively
          StringifyApi<T[P]>;
};

export async function getSignupDetails(signupId: string): Promise<SignupForEditResponse> {
  const signup = await Signup.scope("active").findByPk(signupId, {
    include: [
      {
        model: Answer,
        required: false,
      },
      {
        model: Quota,
        include: [{ model: Event }],
      },
    ],
  });
  if (signup === null) {
    // Event not found with id, probably deleted
    throw new NoSuchSignup("No signup found with given id");
  }

  const event = signup.quota!.event!;

  // Fetch these separately to avoid O(n^3) returned rows.
  event.questions = await Question.findAll({ where: { eventId: event.id }, order: [["order", "ASC"]] });
  event.quotas = await Quota.findAll({ where: { eventId: event.id }, order: [["order", "ASC"]] });

  // Determine how long the signup can be edited for.
  let editableForMillis = 0;
  const now = Date.now();
  if (event.registrationEndDate != null) {
    editableForMillis = Math.max(
      0,
      event.registrationEndDate.getTime() - now,
      signup.editableAtLeastUntil.getTime() - now,
    );
  }
  const confirmableForMillis = signup.confirmedAt ? 0 : Math.max(0, signup.confirmableUntil.getTime() - now);

  const response = {
    signup: {
      ...signup.get({ plain: true }),
      confirmed: Boolean(signup.confirmedAt),
      status: signup.status,
      answers: signup.answers!,
      price: signup.quota!.price + signup.price,
      quota: {
        ...signup.quota!.get({ plain: true }),
      },
      confirmableForMillis,
      editableForMillis,
    },
    event: {
      ...event.get({ plain: true }),
      questions: event.questions!.map((question) => question.get({ plain: true })),
      quotas: event.quotas!.map((quota) => quota.get({ plain: true })),
    },
  };
  return response as unknown as StringifyApi<typeof response>;
}
