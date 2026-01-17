import { FastifyReply, FastifyRequest } from "fastify";
import { sumBy } from "lodash";
import { Op, Transaction } from "sequelize";
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
import { AuditEvent, QuestionType, SignupFieldError } from "@tietokilta/ilmomasiina-models";
import config from "../../config";
import { sendSignupConfirmationMail } from "../../mail/signupConfirmation";
import { getSequelize } from "../../models";
import { Answer, AnswerCreationAttributes } from "../../models/answer";
import { Event } from "../../models/event";
import { Question } from "../../models/question";
import { Quota } from "../../models/quota";
import { Signup } from "../../models/signup";
import { formatSignupForAdmin } from "../events/getEventDetails";
import { checkForConflictingPaymentsForSignupUpdate, expireExistingPaymentsForSignupUpdate } from "../payment/stripe";
import type { StringifyApi } from "../utils";
import { refreshSignupPositions } from "./computeSignupPosition";
import { signupEditable } from "./createNewSignup";
import { NoSuchQuota, NoSuchSignup, SignupsClosed, SignupValidationError } from "./errors";

/** Computes product lines for a given quota. `quota.event` must be present. */
export function getQuotaProducts(quota: Quota): ProductSchema[] {
  if (quota.event!.paymentsEnabled && quota.price) {
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

/** Validates and gathers basic fields of a signup that can be edited in its current state. */
function validateBasicFields(signup: Signup, event: Event, body: SignupUpdateBody) {
  const fields: Partial<Signup> = {};
  const errors: SignupValidationErrors = {};

  const notConfirmedYet = !signup.confirmedAt;

  // Check that required common fields are present (if first time confirming)
  if (notConfirmedYet && event.nameQuestion) {
    const { firstName, lastName } = body;
    if (!firstName) {
      errors.firstName = SignupFieldError.MISSING;
    } else if (firstName.length > Signup.MAX_NAME_LENGTH) {
      errors.firstName = SignupFieldError.TOO_LONG;
    }
    if (!lastName) {
      errors.lastName = SignupFieldError.MISSING;
    } else if (lastName.length > Signup.MAX_NAME_LENGTH) {
      errors.lastName = SignupFieldError.TOO_LONG;
    }
    fields.firstName = firstName;
    fields.lastName = lastName;
  }

  if (notConfirmedYet && event.emailQuestion) {
    const { email } = body;
    if (!email) {
      errors.email = SignupFieldError.MISSING;
    } else if (email.length > Signup.MAX_EMAIL_LENGTH) {
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

/**
 * Validates the answers to all questions and computes product lines resulting from them.
 *
 * If `admin` is true, types are coerced to be correct instead of skipping the answer.
 *
 * If `admin` is false and `answerErrors` is returned, other returned values are not valid and should not be used.
 */
export function validateAnswersAndGetProducts(
  event: Pick<Event, "paymentsEnabled" | "questions" | "languages">,
  rawAnswers: SignupUpdateBody["answers"] | undefined,
  admin: boolean,
) {
  let answerErrors: Record<string, SignupFieldError> | undefined;
  const answerProducts: ProductSchema[] = [];

  const newAnswers = event.questions!.map((question, index) => {
    // Fetch the answer to this question from the request body
    let answer = rawAnswers?.find((a) => a.questionId === question.id)?.answer;
    let error: SignupFieldError | undefined;

    const validOptions = new Map<string, number>();

    if ((question.type === QuestionType.CHECKBOX || question.type === QuestionType.SELECT) && question.options) {
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

        if (localized && localized.options) {
          // eslint-disable-next-line @typescript-eslint/no-loop-func -- false positive on `error`
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
            if (event.paymentsEnabled && question.prices) {
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
        answer = Array.isArray(answer) ? answer.join(", ") : String(answer);
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
              if (event.paymentsEnabled && question.prices) {
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
export function computePrice(products: ProductSchema[]): Partial<Signup> {
  return {
    products,
    price: sumBy(products, (prod) => prod.unitPrice * prod.amount),
    currency: config.currency,
  };
}

/** Internal function to fetch all data required for updating a signup. */
async function getSignupAndEventForUpdate(id: SignupID, transaction: Transaction) {
  // Retrieve event data and lock the row for editing
  const signup = await Signup.scope("active").findByPk(id, {
    transaction,
    lock: Transaction.LOCK.UPDATE,
  });
  if (signup === null) {
    throw new NoSuchSignup("Signup expired or already deleted");
  }

  signup.quota = await signup.getQuota({
    include: [
      {
        model: Event,
        include: [
          {
            model: Question,
          },
        ],
      },
    ],
    order: [[Event, Question, "order", "ASC"]],
    transaction,
  });
  if (!signup.quota || !signup.quota.event) {
    // Quota or event soft deleted
    throw new NoSuchSignup("Signup expired or already deleted");
  }

  return { signup, event: signup.quota.event };
}

/** Internal function to update the contents of a signup. Performs no validation at all. */
async function updateExistingSignup(
  signup: Signup,
  fields: Partial<Signup>,
  answers: Omit<AnswerCreationAttributes, "signupId">[],
  answerProducts: ProductSchema[],
  transaction: Transaction,
) {
  // Get possible product line for the quota
  const quotaProducts = getQuotaProducts(signup.quota!);
  const products = [...quotaProducts, ...answerProducts];

  // Update fields for the signup
  await signup.update(
    {
      ...fields,
      // Compute final total price for the signup
      ...computePrice(products),
      // Mark the signup as confirmed
      confirmedAt: new Date(),
    },
    { transaction },
  );

  // Update the Answers for the Signup
  await Answer.destroy({
    where: {
      signupId: signup.id,
      questionId: {
        [Op.in]: answers.map((answer) => answer.questionId),
      },
    },
    transaction,
  });
  // eslint-disable-next-line no-param-reassign -- signup.update() is already modifying the signup
  signup.answers = await Answer.bulkCreate(
    answers.map((answer) => ({ ...answer, signupId: signup.id })),
    { transaction },
  );
}

/** Requires editTokenVerification and validates answers thoroughly */
export async function updateSignupAsUser(
  request: FastifyRequest<{ Params: SignupPathParams; Body: SignupUpdateBody }>,
  reply: FastifyReply,
): Promise<SignupUpdateResponse> {
  // First, attempt to expire any existing payments for this signup.
  await expireExistingPaymentsForSignupUpdate(request.params.id);

  const { updatedSignup, updatedAnswers, edited } = await getSequelize().transaction(async (transaction) => {
    const { signup, event } = await getSignupAndEventForUpdate(request.params.id, transaction);

    if (!signupEditable(event, signup)) {
      throw new SignupsClosed("Signups closed for this event.");
    }

    /** Is this signup already confirmed (i.e. is this the first update for this signup) */
    const notConfirmedYet = !signup.confirmedAt;

    // Collect fields to update on signup itself (name and email only editable on first confirmation)
    const { fields, errors } = validateBasicFields(signup, event, request.body);

    // Validate answers and compute products from them
    const { newAnswers, answerProducts, answerErrors } = validateAnswersAndGetProducts(
      event,
      request.body.answers,
      false,
    );
    if (answerErrors) errors.answers = answerErrors;

    if (Object.keys(errors).length > 0) {
      throw new SignupValidationError("Errors validating signup", errors);
    }

    // Ensure there are no payments that could be paid with stale data,
    // nor any paid payments (since the expected paid amount might change).
    await checkForConflictingPaymentsForSignupUpdate(signup, transaction);

    await updateExistingSignup(signup, fields, newAnswers, answerProducts, transaction);
    await request.logEvent(AuditEvent.EDIT_SIGNUP, { signup, event, transaction });

    return {
      updatedSignup: signup,
      updatedAnswers: newAnswers,
      edited: !notConfirmedYet,
    };
  });

  // Fetch updated payment data for response.
  updatedSignup.payments = await updatedSignup.getPayments();

  // Send the confirmation email.
  await sendSignupConfirmationMail(updatedSignup, edited ? "edit" : "signup", false);

  const response = {
    ...updatedSignup.get({ plain: true }),
    confirmed: Boolean(updatedSignup.confirmedAt),
    answers: updatedAnswers,
    paymentStatus: updatedSignup.effectivePaymentStatus,
  };

  reply.status(200);
  return response as unknown as StringifyApi<typeof response>;
}

/** Internal function that just converts the request body and then calls updateExistingSignup */
async function updateExistingSignupAsAdmin(
  signup: Signup,
  event: Event,
  body: AdminSignupUpdateBody,
  transaction: Transaction,
) {
  // In admin mode, do bare minimum validation.
  // The DB schema doesn't guarantee consistency anyway when questions are edited, which admins can also do.
  const fields: Partial<Signup> = {};
  if (body.firstName != null) fields.firstName = body.firstName;
  if (body.lastName != null) fields.lastName = body.lastName;
  if (body.namePublic != null) fields.namePublic = body.namePublic;
  if (body.email != null) fields.email = body.email;
  if (body.language != null) fields.language = body.language;

  // Normalize answer types (string vs array) and only keep answers to existing questions.
  // Ignore all other validation.
  const { newAnswers, answerProducts } = validateAnswersAndGetProducts(event, body.answers, true);

  // Ensure there are no payments that could be paid with stale data.
  // Paid payments are allowed to exist; admins are expected to deal with this.
  await checkForConflictingPaymentsForSignupUpdate(signup, transaction, true);

  await updateExistingSignup(signup, fields, newAnswers, answerProducts, transaction);
}

export async function updateSignupAsAdmin(
  request: FastifyRequest<{ Params: SignupPathParams; Body: AdminSignupUpdateBody }>,
  reply: FastifyReply,
): Promise<AdminSignupSchema> {
  // First, attempt to expire any existing payments for this signup.
  await expireExistingPaymentsForSignupUpdate(request.params.id, true);

  const updatedSignup = await getSequelize().transaction(async (transaction) => {
    const { signup, event } = await getSignupAndEventForUpdate(request.params.id, transaction);
    await updateExistingSignupAsAdmin(signup, event, request.body, transaction);
    await request.logEvent(AuditEvent.EDIT_SIGNUP, { signup, event, transaction });
    return signup;
  });

  // Fetch updated payment data for response.
  updatedSignup.payments = await updatedSignup.getPayments();

  // For clarity, always title the email "edit confirmation", even if the signup hadn't been confirmed yet.
  if (request.body.sendEmail ?? true) await sendSignupConfirmationMail(updatedSignup, "edit", true);

  reply.status(200);
  return formatSignupForAdmin(updatedSignup);
}

export async function createSignupAsAdmin(
  request: FastifyRequest<{ Params: SignupPathParams; Body: AdminSignupCreateBody }>,
  reply: FastifyReply,
): Promise<AdminSignupSchema> {
  const updatedSignup = await getSequelize().transaction(async (transaction) => {
    // Find the given quota and event.
    const quota = await Quota.findByPk(request.body.quotaId, {
      include: [
        {
          model: Event,
          include: [
            {
              model: Question,
              required: false,
            },
          ],
        },
      ],
      order: [[Event, Question, "order", "ASC"]],
      transaction,
    });
    if (!quota || !quota.event) throw new NoSuchQuota("Quota doesn't exist.");

    const signup = await Signup.create({ quotaId: quota.id }, { transaction });
    // Set the quota, which create() doesn't do.
    signup.quota = quota;
    await updateExistingSignupAsAdmin(signup, quota.event, request.body, transaction);
    await request.logEvent(AuditEvent.CREATE_SIGNUP, { signup, event: quota.event, transaction });
    return signup;
  });

  // Refresh signup positions. Ignore errors, but wait for this to complete, so that the user
  // gets a status on their signup before it being returned.
  await refreshSignupPositions(updatedSignup.quota!.event!).catch((error) => console.error(error));

  if (request.body.sendEmail ?? true) await sendSignupConfirmationMail(updatedSignup, "signup", true);

  reply.status(200);
  return formatSignupForAdmin(updatedSignup);
}
