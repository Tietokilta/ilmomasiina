import { z, ZodIssueCode, ZodType } from "zod";

import { QuestionType } from "@tietokilta/ilmomasiina-models";
import { EditorEventType } from "../../modules/editor/actions";
import type { EditorEvent } from "../../modules/editor/types";
import { maxOptionsPerQuestion } from "./components/Questions";

// The form validation should catch almost all error cases.
// As the form state differs from our JSON schema somewhat, it's probably less work to just write
// a manual validation schema for the rest of the cases, than attempt to map JSON schema errors back
// to form field names.

const questionOptionsSchema: ZodType<EditorEvent["questions"][number]["options"]> = z
  .array(z.string().max(255))
  .max(maxOptionsPerQuestion)
  // Validate that the stringified options list is short enough, due to current server limitations.
  .superRefine((value, ctx) => {
    if (JSON.stringify(value).length > 255) {
      ctx.addIssue({
        code: ZodIssueCode.custom,
        message: "editor.errors.optionsTooLong",
        // Add the error on the last option to make it look nice
        path: [value.length - 1],
      });
    }
  });
const questionPricesSchema: ZodType<EditorEvent["questions"][number]["prices"]> = z
  .array(z.number())
  .max(maxOptionsPerQuestion)
  // Validate that all the prices are non-negative
  .superRefine((value, ctx) => {
    for (let i = 0; i < value.length; i += 1) {
      if (value[i] < 0) {
        ctx.addIssue({
          code: ZodIssueCode.custom,
          message: "editor.errors.negativePrice",
          });
      }
    }
  });

const numberFromString = z.preprocess((val) => {
  if (val === "" || val == null) return 0;
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const n = Number(val.replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}, z.number({ invalid_type_error: "Must be a number" }).min(0, "Must be ≥ 0"));

const editorSchema: ZodType<EditorEvent, z.ZodTypeDef, unknown> = z
  .object({
    title: z.string().min(1).max(255),
    slug: z
      .string()
      .min(1)
      .max(255)
      .regex(/^[A-Za-z0-9_-]+$/, { message: "editor.errors.invalidSlug" }),
    eventType: z.nativeEnum(EditorEventType),
    date: z.nullable(z.date()),
    endDate: z.nullable(z.date()),
    registrationStartDate: z.nullable(z.date()),
    registrationEndDate: z.nullable(z.date()),
    useOpenQuota: z.boolean(),
    openQuotaSize: z.nullable(z.number().min(0)),
    openQuotaPrice: z.number().min(0).default(0),
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
    verificationEmail: z.nullable(z.string()),
    languages: z.record(
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
            prices: questionPricesSchema,
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
        price: z.number().min(0).default(0),
      }),
    ),
    questions: z.array(
      z.object({
        id: z.optional(z.string()),
        key: z.string(),
        type: z.nativeEnum(QuestionType),
        question: z.string().min(1).max(255),
        required: z.boolean(),
        public: z.boolean(),
        options: questionOptionsSchema,
        prices: questionPricesSchema,
      }),
    ),
    moveSignupsToQueue: z.optional(z.boolean()),
    updatedAt: z.string(),
  })
  .superRefine((event, ctx) => {
    if (event.eventType !== EditorEventType.ONLY_SIGNUP) {
      if (!event.date) {
        ctx.addIssue({
          code: ZodIssueCode.invalid_type,
          path: ["date"],
          expected: "date",
          received: "null",
        });
      }
    }
    if (event.eventType !== EditorEventType.ONLY_EVENT) {
      if (!event.registrationStartDate) {
        ctx.addIssue({
          code: ZodIssueCode.invalid_type,
          path: ["registrationStartDate"],
          expected: "date",
          received: "null",
        });
      }
      if (!event.registrationEndDate) {
        ctx.addIssue({
          code: ZodIssueCode.invalid_type,
          path: ["registrationEndDate"],
          expected: "date",
          received: "null",
        });
      }
    }
    if (event.date && event.endDate && event.endDate < event.date) {
      ctx.addIssue({
        code: ZodIssueCode.custom,
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
        code: ZodIssueCode.custom,
        message: "editor.errors.registrationDateInverted",
        path: ["registrationEndDate"],
      });
    }
  });

export default editorSchema;
