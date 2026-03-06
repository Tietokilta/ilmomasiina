import { z, ZodType } from "zod";

import { MAX_OPTIONS_PER_QUESTION, PaymentMode, QuestionType } from "@tietokilta/ilmomasiina-models";
import { EditorEvent, EditorEventType } from "../../modules/editor/types";

// The form validation should catch almost all error cases.
// As the form state differs from our JSON schema somewhat, it's probably less work to just write
// a manual validation schema for the rest of the cases, than attempt to map JSON schema errors back
// to form field names.

const questionOptionsSchema: ZodType<EditorEvent["questions"][number]["options"]> = z
  .array(z.string().max(255))
  .max(MAX_OPTIONS_PER_QUESTION)
  // Validate that the stringified options list is short enough, due to current server limitations.
  .superRefine((value, ctx) => {
    if (JSON.stringify(value).length > 255) {
      ctx.addIssue({
        code: "custom",
        message: "editor.errors.optionsTooLong",
        // Add the error on the last option to make it look nice
        path: [value.length - 1],
      });
    }
  });

const priceSchema = z
  .number({ error: "editor.errors.invalidPrice" })
  .int({ error: "editor.errors.invalidPrice" })
  .nonnegative({ error: "editor.errors.negativePrice" });

const editorSchema: ZodType<EditorEvent> = z
  .object({
    title: z.string().min(1).max(255),
    slug: z
      .string()
      .min(1)
      .max(255)
      .regex(/^[A-Za-z0-9_-]+$/, { error: "editor.errors.invalidSlug" }),
    eventType: z.enum(EditorEventType),
    date: z.nullable(z.date()),
    endDate: z.nullable(z.date()),
    registrationStartDate: z.nullable(z.date()),
    registrationEndDate: z.nullable(z.date()),
    useOpenQuota: z.boolean(),
    openQuotaSize: z.nullable(z.number().min(0)),
    category: z.string().max(255),
    description: z.nullable(z.string()),
    price: z.nullable(z.string().max(255)),
    location: z.nullable(z.string().max(255)),
    webpageUrl: z.nullable(z.string().max(255)),
    facebookUrl: z.nullable(z.string().max(255)),
    signupsPublic: z.boolean(),
    nameQuestion: z.boolean(),
    emailQuestion: z.boolean(),
    draft: z.boolean(),
    listed: z.boolean(),
    preferredFrontend: z.string().max(255),
    verificationEmail: z.nullable(z.string()),
    payments: z.enum(PaymentMode),
    languages: z.record(
      z.string(),
      z.object({
        title: z.string().max(255),
        description: z.nullable(z.string()),
        price: z.nullable(z.string().max(255)),
        location: z.nullable(z.string().max(255)),
        webpageUrl: z.nullable(z.string().max(255)),
        facebookUrl: z.nullable(z.string().max(255)),
        verificationEmail: z.nullable(z.string()),
        quotas: z.array(
          z.object({
            title: z.string().max(255),
          }),
        ),
        questions: z.array(
          z.object({
            question: z.string().max(255),
            options: questionOptionsSchema,
          }),
        ),
      }),
    ),
    defaultLanguage: z.string(),
    quotas: z.array(
      z.object({
        id: z.optional(z.string()),
        key: z.string(),
        title: z.string().min(1).max(255),
        size: z.nullable(z.number().min(1)),
        price: priceSchema,
      }),
    ),
    questions: z.array(
      z.object({
        id: z.optional(z.string()),
        key: z.string(),
        type: z.enum(QuestionType),
        question: z.string().min(1).max(255),
        required: z.boolean(),
        public: z.boolean(),
        options: questionOptionsSchema,
        prices: z.array(priceSchema).max(MAX_OPTIONS_PER_QUESTION),
        hasPrices: z.boolean(),
      }),
    ),
    moveSignupsToQueue: z.boolean(),
    updatedAt: z.string(),
  })
  .superRefine((event, ctx) => {
    if (event.eventType !== EditorEventType.ONLY_SIGNUP) {
      if (!event.date) {
        ctx.addIssue({
          code: "invalid_type",
          path: ["date"],
          expected: "date",
          received: "null",
        });
      }
    }
    if (event.eventType !== EditorEventType.ONLY_EVENT) {
      if (!event.registrationStartDate) {
        ctx.addIssue({
          code: "invalid_type",
          path: ["registrationStartDate"],
          expected: "date",
          received: "null",
        });
      }
      if (!event.registrationEndDate) {
        ctx.addIssue({
          code: "invalid_type",
          path: ["registrationEndDate"],
          expected: "date",
          received: "null",
        });
      }
    }
    if (event.date && event.endDate && event.endDate < event.date) {
      ctx.addIssue({
        code: "custom",
        message: "editor.errors.dateInverted",
        path: ["endDate"],
      });
    }
    if (
      event.registrationStartDate &&
      event.registrationEndDate &&
      event.registrationEndDate < event.registrationStartDate
    ) {
      ctx.addIssue({
        code: "custom",
        message: "editor.errors.registrationDateInverted",
        path: ["registrationEndDate"],
      });
    }
  });

export default editorSchema;
