import { FastifyReply, FastifyRequest } from "fastify";
import { Transaction } from "sequelize";
import { isEmail } from "validator";

import type {
  SignupPathParams,
  SignupUpdateBody,
  SignupUpdateResponse,
  SignupValidationErrors,
} from "@tietokilta/ilmomasiina-models";
import { AuditEvent, SignupFieldError } from "@tietokilta/ilmomasiina-models";
import sendSignupConfirmationMail from "../../mail/signupConfirmation";
import { getSequelize } from "../../models";
import { Answer } from "../../models/answer";
import { Event } from "../../models/event";
import { Question } from "../../models/question";
import { Signup } from "../../models/signup";
import { signupEditable } from "./createNewSignup";
import { NoSuchSignup, SignupsClosed, SignupValidationError } from "./errors";

/** Requires editTokenVerification */
export default async function updateSignup(
  request: FastifyRequest<{ Params: SignupPathParams; Body: SignupUpdateBody }>,
  reply: FastifyReply,
): Promise<SignupUpdateResponse> {
  const { updatedSignup, edited } = await getSequelize().transaction(async (transaction) => {
    // Retrieve event data and lock the row for editing
    const signup = await Signup.scope("active").findByPk(request.params.id, {
      transaction,
      lock: Transaction.LOCK.UPDATE,
    });
    if (signup === null) {
      throw new NoSuchSignup("Signup expired or already deleted");
    }

    const quota = await signup.getQuota({
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
      transaction,
    });
    const event = quota.event!;
    if (!signupEditable(event, signup)) {
      throw new SignupsClosed("Signups closed for this event.");
    }

    /** Is this signup already confirmed (i.e. is this the first update for this signup) */
    const notConfirmedYet = !signup.confirmedAt;
    const questions = event.questions!;

    const errors: SignupValidationErrors = {};

    // Check that required common fields are present (if first time confirming)
    let nameFields = {};
    if (notConfirmedYet && event.nameQuestion) {
      const { firstName, lastName } = request.body;
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
      nameFields = { firstName, lastName };
    }

    let emailField = {};
    if (notConfirmedYet && event.emailQuestion) {
      const { email } = request.body;
      if (!email) {
        errors.email = SignupFieldError.MISSING;
      } else if (email.length > Signup.MAX_EMAIL_LENGTH) {
        errors.email = SignupFieldError.TOO_LONG;
      } else if (!isEmail(email)) {
        errors.email = SignupFieldError.INVALID_EMAIL;
      }
      emailField = { email };
    }

    // Update signup language if provided
    let languageField = {};
    if (request.body.language) {
      languageField = { language: request.body.language };
    }

    // Check that all questions are answered with a valid answer
    const newAnswers = questions.map((question) => {
      // Fetch the answer to this question from the request body
      let answer = request.body.answers?.find((a) => a.questionId === question.id)?.answer;
      let error: SignupFieldError | undefined;

      if (!answer || !answer.length) {
        // Disallow empty answers to required questions
        if (question.required) {
          error = SignupFieldError.MISSING;
        }
        // Normalize empty answers to "" or [], depending on question type
        answer = question.type === "checkbox" ? [] : "";
      } else if (question.type === "checkbox") {
        // Ensure checkbox answers are arrays
        if (!Array.isArray(answer)) {
          error = SignupFieldError.WRONG_TYPE;
        } else {
          // Check that all checkbox answers are valid
          answer.forEach((option) => {
            if (!question.options!.includes(option)) {
              error = SignupFieldError.NOT_AN_OPTION;
            }
          });
        }
      } else {
        // Don't allow arrays for non-checkbox questions
        if (typeof answer !== "string") {
          error = SignupFieldError.WRONG_TYPE;
        } else {
          switch (question.type) {
            case "text":
            case "textarea":
              break;
            case "number":
              // Check that a numeric answer is valid
              if (!Number.isFinite(parseFloat(answer))) {
                error = SignupFieldError.NOT_A_NUMBER;
              }
              break;
            case "select": {
              // Check that the select answer is valid
              if (!question.options!.includes(answer)) {
                error = SignupFieldError.NOT_AN_OPTION;
              }
              break;
            }
            default:
              throw new Error("Invalid question type");
          }
        }
      }

      if (error) {
        errors.answers ??= {};
        errors.answers[question.id] = error;
      }

      return {
        questionId: question.id,
        answer,
        signupId: signup.id,
      };
    });

    if (Object.keys(errors).length > 0) {
      throw new SignupValidationError("Errors validating signup", errors);
    }

    // Update fields for the signup (name and email only editable on first confirmation)
    const updatedFields = {
      ...nameFields,
      ...emailField,
      ...languageField,
      namePublic: Boolean(request.body.namePublic),
      confirmedAt: new Date(),
    };

    await signup.update(updatedFields, { transaction });

    // Update the Answers for the Signup
    await Answer.destroy({
      where: {
        signupId: signup.id,
      },
      transaction,
    });
    await Answer.bulkCreate(newAnswers, { transaction });

    await request.logEvent(AuditEvent.EDIT_SIGNUP, {
      signup,
      event: quota.event,
      transaction,
    });

    return { updatedSignup: signup, edited: !notConfirmedYet };
  });

  // Send the confirmation email
  sendSignupConfirmationMail(updatedSignup, edited);

  // Return data
  reply.status(200);
  return {
    id: updatedSignup.id,
  };
}
