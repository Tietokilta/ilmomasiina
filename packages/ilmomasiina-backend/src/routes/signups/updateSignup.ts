import { and, eq, inArray, isNull } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import { isEqual, sumBy } from "lodash";
import { isEmail } from "validator";

import type {
  AdminSignupCreateBody,
  AdminSignupSchema,
  AdminSignupUpdateBody,
  ProductSchema,
  SignupID,
  SignupPathParams,
  SignupUpdateBody,
  SignupUpdateResponse,
  SignupValidationErrors,
} from "@tietokilta/ilmomasiina-models";
import { AuditEvent, OPTION_QUESTION_TYPES, QuestionType, SignupFieldError } from "@tietokilta/ilmomasiina-models";
import config from "../../config";
import { getDb, Tx } from "../../db";
import { answerTable, signupTable } from "../../db/schema";
import { sendSignupConfirmationMail } from "../../mail/signups";
import { Event, paymentsEnabled } from "../../models/event";
import { getPaymentStatuses } from "../../models/payment";
import type { Question } from "../../models/question";
import type { Quota } from "../../models/quota";
import {
  activeSignupCondition,
  effectivePaymentStatus,
  isConfirmed,
  MAX_EMAIL_LENGTH,
  MAX_NAME_LENGTH,
  Signup,
} from "../../models/signup";
import { formatSignupForAdmin } from "../events/getEventDetails";
import { checkForConflictingPaymentsForSignupUpdate, expireExistingPaymentsForSignupUpdate } from "../payment/stripe";
import type { StringifyApi } from "../utils";
import { refreshSignupPositions } from "./computeSignupPosition";
import { signupEditable } from "./createNewSignup";
import { NoSuchQuota, NoSuchSignup, SignupsClosed, SignupValidationError } from "./errors";

/** Validates and gathers basic fields of a signup that can be edited in its current state. */
function validateBasicFields(
  signup: Signup,
  event: Pick<Event, "nameQuestion" | "emailQuestion">,
  body: SignupUpdateBody,
  admin: boolean,
) {
  const fields: Partial<Pick<Signup, "firstName" | "lastName" | "namePublic" | "email" | "language">> = {};
  const errors: SignupValidationErrors = {};

  // In admin mode, do bare minimum validation.
  // The DB schema doesn't guarantee consistency anyway when questions are edited, which admins can also do.
  if (admin) {
    if (body.firstName != null) fields.firstName = body.firstName;
    if (body.lastName != null) fields.lastName = body.lastName;
    if (body.namePublic != null) fields.namePublic = body.namePublic;
    if (body.email != null) fields.email = body.email;
    if (body.language != null) fields.language = body.language;
    return { fields, errors };
  }

  // Check that required common fields are present (if first time confirming)
  if (!isConfirmed(signup) && event.nameQuestion) {
    const { firstName, lastName } = body;
    if (!firstName) {
      errors.firstName = SignupFieldError.MISSING;
    } else if (firstName.length > MAX_NAME_LENGTH) {
      errors.firstName = SignupFieldError.TOO_LONG;
    }
    if (!lastName) {
      errors.lastName = SignupFieldError.MISSING;
    } else if (lastName.length > MAX_NAME_LENGTH) {
      errors.lastName = SignupFieldError.TOO_LONG;
    }
    fields.firstName = firstName;
    fields.lastName = lastName;
  }

  if (!isConfirmed(signup) && event.emailQuestion) {
    const { email } = body;
    if (!email) {
      errors.email = SignupFieldError.MISSING;
    } else if (email.length > MAX_EMAIL_LENGTH) {
      errors.email = SignupFieldError.TOO_LONG;
    } else if (!isEmail(email)) {
      errors.email = SignupFieldError.INVALID_EMAIL;
    }
    fields.email = email;
  }

  // Update signup language and name publicity if provided
  if (body.namePublic != null) {
    fields.namePublic = body.namePublic;
  }
  if (body.language) {
    fields.language = body.language;
  }

  return { fields, errors };
}

/** The fields of an event and its questions needed to validate answers. */
export type EventForAnswers = Pick<Event, "payments" | "languages"> & {
  questions: Pick<Question, "id" | "type" | "options" | "prices" | "required">[];
};

/** Computes product lines for a given quota in the given event. */
export function getQuotaProducts(
  quota: Pick<Quota, "title" | "price">,
  event: Pick<Event, "payments">,
): ProductSchema[] {
  if (paymentsEnabled(event) && quota.price) {
    return [
      {
        name: quota.title,
        amount: 1,
        unitPrice: quota.price,
      },
    ];
  }
  return [];
}

/**
 * Validates the answers to all questions and computes product lines resulting from them.
 *
 * If `admin` is true, types are coerced to be correct instead of skipping the answer.
 *
 * If `admin` is false and `answerErrors` is returned, other returned values are not valid and should not be used.
 */
export function validateAnswersAndGetProducts(
  event: EventForAnswers,
  rawAnswers: SignupUpdateBody["answers"] | undefined,
  admin: boolean,
) {
  let answerErrors: Record<string, SignupFieldError> | undefined;
  const answerProducts: ProductSchema[] = [];

  const withPayments = paymentsEnabled(event);

  const newAnswers = event.questions.map((question, index) => {
    // Fetch the answer to this question from the request body
    let answer = rawAnswers?.find((a) => a.questionId === question.id)?.answer;
    let error: SignupFieldError | undefined;

    const validOptions = new Map<string, number>();

    if (OPTION_QUESTION_TYPES.includes(question.type) && question.options) {
      // First, collect valid options and their prices from the default language
      question.options.forEach((opt, i) => {
        if (validOptions.has(opt)) {
          // These shouldn't occur after 3.0, but can exist in the database from before.
          console.warn(`Duplicate option "${opt}" detected in question ${question.id}`);
          error = SignupFieldError.DUPLICATE_OPTION;
          return;
        }
        validOptions.set(opt, i);
      });
      // Then, collect valid options from other languages
      for (const lang of Object.values(event.languages)) {
        const localized = lang.questions[index];

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- indexing may fail
        if (localized && localized.options) {
          // eslint-disable-next-line @typescript-eslint/no-loop-func -- func is only used immediately in forEach
          localized.options.forEach((opt, i) => {
            // Only include non-empty options, since empty ones use the default language
            if (!opt) return;

            if (validOptions.has(opt) && validOptions.get(opt) !== i) {
              console.warn(`Duplicate option "${opt}" detected in question ${question.id}`);
              error = SignupFieldError.DUPLICATE_OPTION;
              return;
            }
            validOptions.set(opt, i);
          });
        }
      }
    }

    if (error) {
      // There was an error collecting valid options, skip further validation.
      answer = "";
    } else if (!answer || !answer.length) {
      // Disallow empty answers to required questions
      if (question.required) {
        error = SignupFieldError.MISSING;
      }
      // Normalize empty answers to "" or [], depending on question type
      answer = question.type === QuestionType.CHECKBOX ? [] : "";
    } else if (question.type === QuestionType.CHECKBOX) {
      // Forcibly convert to array in admin mode
      if (admin) {
        answer = !Array.isArray(answer) ? [answer] : answer;
      }
      // Ensure checkbox answers are arrays
      if (!Array.isArray(answer)) {
        error = SignupFieldError.WRONG_TYPE;
      } else {
        // Check that all checkbox answers are valid
        const usedOptions = new Set<number>();
        for (const option of answer) {
          const optIndex = validOptions.get(option);
          if (optIndex === undefined) {
            error = SignupFieldError.NOT_AN_OPTION;
          } else if (usedOptions.has(optIndex)) {
            error = SignupFieldError.DUPLICATE_OPTION;
          } else {
            usedOptions.add(optIndex);
            // Question.prices are normalized to null when they are all zero, so any option prices being set implies prices exist.
            // Generate a product if the option is known and the question has prices, even if the option is free.
            if (withPayments && question.prices) {
              answerProducts.push({
                name: option,
                amount: 1,
                unitPrice: question.prices[optIndex] ?? 0,
              });
            }
          }
        }
      }
    } else {
      // Forcibly convert to string in admin mode
      if (admin) {
        answer = Array.isArray(answer) ? answer.join(", ") : answer;
      }
      // Don't allow arrays for non-checkbox questions
      if (typeof answer !== "string") {
        error = SignupFieldError.WRONG_TYPE;
      } else {
        switch (question.type) {
          case QuestionType.TEXT:
          case QuestionType.TEXT_AREA:
            break;
          case QuestionType.NUMBER:
            // Check that a numeric answer is valid
            if (!Number.isFinite(parseFloat(answer))) {
              error = SignupFieldError.NOT_A_NUMBER;
            }
            // TODO: could have prices for number questions later
            break;
          case QuestionType.SELECT: {
            // Check that the select answer is valid
            const optIndex = validOptions.get(answer);
            if (optIndex === undefined) {
              error = SignupFieldError.NOT_AN_OPTION;
            } else {
              // Generate a product if the option is known and the question has prices, even if the option is free.
              if (withPayments && question.prices) {
                answerProducts.push({
                  name: answer,
                  amount: 1,
                  unitPrice: question.prices[optIndex] ?? 0,
                });
              }
            }
            break;
          }
          default:
            throw new Error("Invalid question type");
        }
      }
    }

    if (error) {
      answerErrors ??= {};
      answerErrors[question.id] = error;
    }

    return {
      questionId: question.id,
      answer,
    };
  });

  return { newAnswers, answerProducts, answerErrors };
}

/** Given product lines, computes the final price-related attributes for a signup. */
export function computePrice(products: ProductSchema[]): Pick<Signup, "products" | "price" | "currency"> {
  return {
    products,
    price: sumBy(products, (prod) => prod.unitPrice * prod.amount),
    currency: config.currency,
  };
}

/** Fetches a quota with its event and the event's questions. */
async function getQuotaAndEvent(quotaId: Quota["id"], transaction: Tx) {
  const quota = await transaction.query.quota.findFirst({
    where: { id: quotaId, deletedAt: { isNull: true } },
    with: { event: { with: { questions: { orderBy: { order: "asc" } } } } },
  });
  if (!quota || !quota.event) return null;
  const { event, ...rest } = quota;
  return { quota: rest, event };
}

type QuotaAndEvent = NonNullable<Awaited<ReturnType<typeof getQuotaAndEvent>>>;

/** Internal function to fetch all data required for updating a signup. */
async function getSignupAndEventForUpdate(id: SignupID, transaction: Tx) {
  // Retrieve event data and lock the row for editing
  const [signup] = await transaction
    .select()
    .from(signupTable)
    .where(and(eq(signupTable.id, id), activeSignupCondition()))
    .for("update");
  if (!(signup as Signup | undefined)) {
    throw new NoSuchSignup("Signup expired or already deleted");
  }

  const found = await getQuotaAndEvent(signup.quotaId, transaction);
  if (!found) {
    // Quota or event soft deleted
    throw new NoSuchSignup("Signup expired or already deleted");
  }

  return { signup, ...found };
}

/**
 * Validates the fields and answers in `body` (with mode according to `admin`) and
 * updates `signup` accordingly. Returns the updated signup and its new answers.
 */
async function updateExistingSignup(
  signup: Signup,
  { quota, event }: QuotaAndEvent,
  body: AdminSignupUpdateBody | SignupUpdateBody,
  transaction: Tx,
  admin: boolean,
) {
  // Validate and assign fields found directly in Signup
  const { fields, errors } = validateBasicFields(signup, event, body, admin);
  // Validate answers and compute products from them
  const { newAnswers, answerProducts, answerErrors } = validateAnswersAndGetProducts(event, body.answers, admin);
  if (answerErrors) errors.answers = answerErrors;

  if (!admin && Object.keys(errors).length > 0) {
    throw new SignupValidationError("Errors validating signup", errors);
  }

  // Get possible product line for the quota
  const quotaProducts = getQuotaProducts(quota, event);
  const products = [...quotaProducts, ...answerProducts];
  // Compute final total price for the signup
  const paymentFields = computePrice(products);

  const paymentsChanged =
    paymentFields.price !== signup.price ||
    paymentFields.currency !== signup.currency ||
    !isEqual(paymentFields.products, signup.products);

  // Ensure there are no payments that could be paid with stale data.
  // Paid payments are allowed to exist if the price/products don't change, or if an admin is editing
  // (admins are expected to deal with price changes manually).
  await checkForConflictingPaymentsForSignupUpdate(signup, transaction, admin || !paymentsChanged);

  // Update fields for the signup
  const [updatedSignup] = await transaction
    .update(signupTable)
    .set({
      ...fields,
      ...paymentFields,
      // Mark the signup as confirmed
      confirmedAt: new Date(),
    })
    .where(eq(signupTable.id, signup.id))
    .returning();

  // Update the Answers for the Signup
  if (!newAnswers.length) return { updatedSignup, answers: [] };
  await transaction
    .update(answerTable)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(answerTable.signupId, signup.id),
        isNull(answerTable.deletedAt),
        inArray(
          answerTable.questionId,
          newAnswers.map((answer) => answer.questionId),
        ),
      ),
    );
  const answers = await transaction
    .insert(answerTable)
    .values(newAnswers.map((answer) => ({ ...answer, signupId: signup.id })))
    .returning();
  return { updatedSignup, answers };
}

/** Requires editTokenVerification and validates answers thoroughly */
export async function updateSignupAsUser(
  request: FastifyRequest<{ Params: SignupPathParams; Body: SignupUpdateBody }>,
  reply: FastifyReply,
): Promise<SignupUpdateResponse> {
  // First, attempt to expire any existing payments for this signup.
  await expireExistingPaymentsForSignupUpdate(request.params.id);

  const { updatedSignup, answers, wasConfirmed } = await getDb().transaction(async (transaction) => {
    const { signup, ...quotaAndEvent } = await getSignupAndEventForUpdate(request.params.id, transaction);
    const { event } = quotaAndEvent;

    if (!signupEditable(event, signup)) {
      throw new SignupsClosed("Signups closed for this event.");
    }

    const updated = await updateExistingSignup(signup, quotaAndEvent, request.body, transaction, false);
    await request.logEvent(AuditEvent.EDIT_SIGNUP, { signup: updated.updatedSignup, event, transaction });

    return {
      ...updated,
      /** Was this signup already confirmed (i.e. is this not the first update for this signup) */
      wasConfirmed: isConfirmed(signup),
    };
  });

  // Fetch updated payment data for response.
  const payments = await getPaymentStatuses(updatedSignup.id);

  // Send the confirmation email.
  await sendSignupConfirmationMail(updatedSignup, wasConfirmed ? "edit" : "signup", false);

  const response = {
    ...updatedSignup,
    confirmed: isConfirmed(updatedSignup),
    answers,
    paymentStatus: effectivePaymentStatus(updatedSignup, payments),
  };

  reply.status(200);
  return response as unknown as StringifyApi<typeof response>;
}

export async function updateSignupAsAdmin(
  request: FastifyRequest<{ Params: SignupPathParams; Body: AdminSignupUpdateBody }>,
  reply: FastifyReply,
): Promise<AdminSignupSchema> {
  // First, attempt to expire any existing payments for this signup.
  await expireExistingPaymentsForSignupUpdate(request.params.id);

  const { updatedSignup, answers } = await getDb().transaction(async (transaction) => {
    const { signup, ...quotaAndEvent } = await getSignupAndEventForUpdate(request.params.id, transaction);
    const updated = await updateExistingSignup(signup, quotaAndEvent, request.body, transaction, true);
    await request.logEvent(AuditEvent.EDIT_SIGNUP, {
      signup: updated.updatedSignup,
      event: quotaAndEvent.event,
      transaction,
    });
    return updated;
  });

  // Fetch updated payment data for response.
  const payments = await getPaymentStatuses(updatedSignup.id);

  // For clarity, always title the email "edit confirmation", even if the signup hadn't been confirmed yet.
  if (request.body.sendEmail ?? true) await sendSignupConfirmationMail(updatedSignup, "edit", true);

  reply.status(200);
  return formatSignupForAdmin({ ...updatedSignup, answers, payments });
}

export async function createSignupAsAdmin(
  request: FastifyRequest<{ Params: SignupPathParams; Body: AdminSignupCreateBody }>,
  reply: FastifyReply,
): Promise<AdminSignupSchema> {
  const { updatedSignup, answers, event } = await getDb().transaction(async (transaction) => {
    // Find the given quota and event.
    const quotaAndEvent = await getQuotaAndEvent(request.body.quotaId, transaction);
    if (!quotaAndEvent) throw new NoSuchQuota("Quota doesn't exist.");
    const { quota, event: quotaEvent } = quotaAndEvent;

    const [signup] = await transaction.insert(signupTable).values({ quotaId: quota.id }).returning();
    const updated = await updateExistingSignup(signup, quotaAndEvent, request.body, transaction, true);
    await request.logEvent(AuditEvent.CREATE_SIGNUP, {
      signup: updated.updatedSignup,
      event: quotaEvent,
      transaction,
    });
    return { ...updated, event: quotaEvent };
  });

  // Refresh signup positions. Ignore errors, but wait for this to complete, so that the user
  // gets a status on their signup before it being returned.
  const positions = await refreshSignupPositions(event).catch((error: unknown) => {
    console.error(error);
    return [];
  });
  const refreshed = positions.find((signup) => signup.id === updatedSignup.id);
  const signup = {
    ...updatedSignup,
    status: refreshed?.status ?? updatedSignup.status,
    position: refreshed?.position ?? updatedSignup.position,
  };

  // Fetch updated payment data for response. (Should always be empty, but for consistency.)
  const payments = await getPaymentStatuses(signup.id);

  if (request.body.sendEmail ?? true) await sendSignupConfirmationMail(signup, "signup", true);

  reply.status(200);
  return formatSignupForAdmin({ ...signup, answers, payments });
}
