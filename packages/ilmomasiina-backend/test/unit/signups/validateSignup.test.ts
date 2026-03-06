import { describe, expect, test } from "vitest";

import type { QuestionLanguage } from "@tietokilta/ilmomasiina-models";
import { QuestionType, SignupFieldError } from "@tietokilta/ilmomasiina-models";
import type { Event } from "../../../src/models/event";
import type { QuestionAttributes } from "../../../src/models/question";
import { validateAnswersAndGetProducts } from "../../../src/routes/signups/updateSignup";

/** Wrapper to test validation and product generation for a single question. */
function validateQuestion(
  question: QuestionAttributes,
  answer?: string | string[],
  secondLocale?: QuestionLanguage,
  thirdLocale?: QuestionLanguage,
) {
  const languages: Record<string, { questions: QuestionLanguage[] }> = {};
  if (secondLocale) languages.fi = { questions: [secondLocale] };
  if (thirdLocale) languages.sv = { questions: [thirdLocale] };

  const event = {
    paymentsEnabled: true,
    questions: [question],
    languages,
  } as Pick<Event, "paymentsEnabled" | "questions" | "languages">;

  const rawAnswers =
    answer === undefined
      ? []
      : [
          {
            questionId: question.id,
            answer,
          },
        ];

  return validateAnswersAndGetProducts(event, rawAnswers, false);
}

describe("validateAnswersAndGetProducts", () => {
  describe("TEXT questions", () => {
    const baseQuestion = {
      id: "text-question",
      order: 0,
      question: "Text question",
      type: QuestionType.TEXT,
      eventId: "test-event-id",
      required: false,
      public: false,
      options: null,
      prices: null,
    } satisfies Partial<QuestionAttributes>;

    test("accepts valid text answer", () => {
      const question: QuestionAttributes = { ...baseQuestion };

      const { newAnswers, answerProducts, answerErrors } = validateQuestion(question, "Some text");
      expect(newAnswers).toEqual([{ questionId: question.id, answer: "Some text" }]);
      expect(answerProducts).toEqual([]);
      expect(answerErrors).toBeUndefined();
    });

    test("allows missing answer when not required", () => {
      const question: QuestionAttributes = { ...baseQuestion };

      const { newAnswers, answerProducts, answerErrors } = validateQuestion(question, undefined);
      expect(newAnswers).toEqual([{ questionId: question.id, answer: "" }]);
      expect(answerProducts).toEqual([]);
      expect(answerErrors).toBeUndefined();
    });

    test("rejects missing answer when required", () => {
      const question: QuestionAttributes = { ...baseQuestion, required: true };

      const { newAnswers, answerErrors } = validateQuestion(question, undefined);
      expect(newAnswers).toEqual([{ questionId: question.id, answer: "" }]);
      expect(answerErrors).toEqual({ [question.id]: SignupFieldError.MISSING });
    });

    test("rejects empty string when required", () => {
      const question: QuestionAttributes = { ...baseQuestion, required: true };

      const { newAnswers, answerErrors } = validateQuestion(question, "");
      expect(newAnswers).toEqual([{ questionId: question.id, answer: "" }]);
      expect(answerErrors).toEqual({ [question.id]: SignupFieldError.MISSING });
    });

    test("rejects array answer", () => {
      const question: QuestionAttributes = { ...baseQuestion };

      const { newAnswers, answerErrors } = validateQuestion(question, ["text"]);
      expect(newAnswers).toEqual([{ questionId: question.id, answer: ["text"] }]);
      expect(answerErrors).toEqual({ [question.id]: SignupFieldError.WRONG_TYPE });
    });
  });

  describe("TEXT_AREA questions", () => {
    const baseQuestion = {
      id: "textarea-question",
      order: 0,
      question: "Textarea question",
      type: QuestionType.TEXT_AREA,
      eventId: "test-event-id",
      required: false,
      public: false,
      options: null,
      prices: null,
    } satisfies Partial<QuestionAttributes>;

    test("accepts valid textarea answer", () => {
      const question: QuestionAttributes = { ...baseQuestion };

      const { newAnswers, answerProducts, answerErrors } = validateQuestion(question, "Multi\nline\ntext");
      expect(newAnswers).toEqual([{ questionId: question.id, answer: "Multi\nline\ntext" }]);
      expect(answerProducts).toEqual([]);
      expect(answerErrors).toBeUndefined();
    });

    test("rejects missing answer when required", () => {
      const question: QuestionAttributes = { ...baseQuestion, required: true };

      const { answerErrors } = validateQuestion(question, undefined);
      expect(answerErrors).toEqual({ [question.id]: SignupFieldError.MISSING });
    });

    test("rejects empty string when required", () => {
      const question: QuestionAttributes = { ...baseQuestion, required: true };

      const { answerErrors } = validateQuestion(question, "");
      expect(answerErrors).toEqual({ [question.id]: SignupFieldError.MISSING });
    });

    test("allows missing answer when not required", () => {
      const question: QuestionAttributes = { ...baseQuestion };

      const { newAnswers, answerErrors } = validateQuestion(question, undefined);
      expect(newAnswers).toEqual([{ questionId: question.id, answer: "" }]);
      expect(answerErrors).toBeUndefined();
    });
  });

  describe("NUMBER questions", () => {
    const baseQuestion = {
      id: "number-question",
      order: 0,
      question: "Number question",
      type: QuestionType.NUMBER,
      eventId: "test-event-id",
      required: false,
      public: false,
      options: null,
      prices: null,
    } satisfies Partial<QuestionAttributes>;

    test("accepts valid number answer", () => {
      const question: QuestionAttributes = { ...baseQuestion };

      const { newAnswers, answerProducts, answerErrors } = validateQuestion(question, "42");
      expect(newAnswers).toEqual([{ questionId: question.id, answer: "42" }]);
      expect(answerProducts).toEqual([]);
      expect(answerErrors).toBeUndefined();
    });

    test("accepts decimal number", () => {
      const question: QuestionAttributes = { ...baseQuestion };

      const { answerErrors } = validateQuestion(question, "3.14");

      expect(answerErrors).toBeUndefined();
    });

    test("accepts negative number", () => {
      const question: QuestionAttributes = { ...baseQuestion };

      const { answerErrors } = validateQuestion(question, "-5");
      expect(answerErrors).toBeUndefined();
    });

    test("rejects non-numeric text", () => {
      const question: QuestionAttributes = { ...baseQuestion };

      const { answerErrors } = validateQuestion(question, "not a number");
      expect(answerErrors).toEqual({ [question.id]: SignupFieldError.NOT_A_NUMBER });
    });

    test("allows empty string when not required", () => {
      const question: QuestionAttributes = { ...baseQuestion };

      const { newAnswers, answerErrors } = validateQuestion(question, "");

      expect(newAnswers).toEqual([{ questionId: question.id, answer: "" }]);
      expect(answerErrors).toBeUndefined();
    });

    test("rejects missing answer when required", () => {
      const question: QuestionAttributes = { ...baseQuestion, required: true };

      const { answerErrors } = validateQuestion(question, undefined);
      expect(answerErrors).toEqual({ [question.id]: SignupFieldError.MISSING });
    });

    test("rejects empty string when required", () => {
      const question: QuestionAttributes = { ...baseQuestion, required: true };

      const { answerErrors } = validateQuestion(question, "");
      expect(answerErrors).toEqual({ [question.id]: SignupFieldError.MISSING });
    });

    test("allows missing answer when not required", () => {
      const question: QuestionAttributes = { ...baseQuestion };

      const { newAnswers, answerErrors } = validateQuestion(question, undefined);
      expect(newAnswers).toEqual([{ questionId: question.id, answer: "" }]);
      expect(answerErrors).toBeUndefined();
    });
  });

  describe("SELECT questions", () => {
    const baseQuestion = {
      id: "select-question",
      order: 0,
      question: "Select question",
      type: QuestionType.SELECT,
      eventId: "test-event-id",
      required: false,
      public: false,
    } satisfies Partial<QuestionAttributes>;

    test("accepts valid option", () => {
      const question: QuestionAttributes = {
        ...baseQuestion,
        options: ["Option A", "Option B", "Option C"],
        prices: [100, 200, 300],
      };

      const { newAnswers, answerProducts, answerErrors } = validateQuestion(question, "Option B");
      expect(newAnswers).toEqual([{ questionId: question.id, answer: "Option B" }]);
      expect(answerProducts).toEqual([
        {
          name: "Option B",
          amount: 1,
          unitPrice: 200,
        },
      ]);
      expect(answerErrors).toBeUndefined();
    });

    test("rejects invalid option", () => {
      const question: QuestionAttributes = {
        ...baseQuestion,
        options: ["Option A", "Option B"],
        prices: null,
      };

      const { answerErrors } = validateQuestion(question, "Option Z");
      expect(answerErrors).toEqual({ [question.id]: SignupFieldError.NOT_AN_OPTION });
    });

    test("rejects array answer", () => {
      const question: QuestionAttributes = {
        ...baseQuestion,
        options: ["Option A", "Option B"],
        prices: null,
      };

      const { answerErrors } = validateQuestion(question, ["Option A"]);
      expect(answerErrors).toEqual({ [question.id]: SignupFieldError.WRONG_TYPE });
    });

    test("rejects missing and empty answer when required", () => {
      const question: QuestionAttributes = {
        ...baseQuestion,
        required: true,
        options: ["Option A", "Option B"],
        prices: null,
      };

      let { answerErrors } = validateQuestion(question, undefined);
      expect(answerErrors).toEqual({ [question.id]: SignupFieldError.MISSING });

      ({ answerErrors } = validateQuestion(question, ""));
      expect(answerErrors).toEqual({ [question.id]: SignupFieldError.MISSING });
    });

    test("allows missing and empty answer when not required", () => {
      const question: QuestionAttributes = {
        ...baseQuestion,
        options: ["Option A", "Option B"],
        prices: [100, 200],
      };

      let { newAnswers, answerProducts, answerErrors } = validateQuestion(question, undefined);
      expect(newAnswers).toEqual([{ questionId: question.id, answer: "" }]);
      expect(answerProducts).toEqual([]);
      expect(answerErrors).toBeUndefined();

      ({ newAnswers, answerProducts, answerErrors } = validateQuestion(question, ""));
      expect(newAnswers).toEqual([{ questionId: question.id, answer: "" }]);
      expect(answerProducts).toEqual([]);
      expect(answerErrors).toBeUndefined();
    });

    test("returns no products for null prices", () => {
      const question: QuestionAttributes = {
        ...baseQuestion,
        options: ["Option A", "Option B", "Option C"],
        prices: null,
      };

      const { answerProducts } = validateQuestion(question, "Option A");
      expect(answerProducts).toEqual([]);
    });

    test("handles extra prices in prices array", () => {
      const question: QuestionAttributes = {
        ...baseQuestion,
        options: ["Option A", "Option B"],
        prices: [100, 200, 300, 400], // extra prices are ignored
      };

      const { answerProducts } = validateQuestion(question, "Option B");
      expect(answerProducts).toEqual([
        {
          name: "Option B",
          amount: 1,
          unitPrice: 200,
        },
      ]);
    });

    test("returns zero price for missing prices", () => {
      const question: QuestionAttributes = {
        ...baseQuestion,
        options: ["Option A", "Option B", "Option C"],
        prices: [100, 200], // missing prices for C
      };

      expect(validateQuestion(question, "Option A").answerProducts).toEqual([
        {
          name: "Option A",
          amount: 1,
          unitPrice: 100,
        },
      ]);
      expect(validateQuestion(question, "Option B").answerProducts).toEqual([
        {
          name: "Option B",
          amount: 1,
          unitPrice: 200,
        },
      ]);
      expect(validateQuestion(question, "Option C").answerProducts).toEqual([
        {
          name: "Option C",
          amount: 1,
          unitPrice: 0,
        },
      ]);
    });

    test("handles negative prices correctly", () => {
      const question: QuestionAttributes = {
        ...baseQuestion,
        options: ["Option A", "Option B"],
        prices: [-50, 100],
      };

      const { answerProducts } = validateQuestion(question, "Option A");
      expect(answerProducts).toEqual([
        {
          name: "Option A",
          amount: 1,
          unitPrice: -50,
        },
      ]);
    });

    test("handles localized options with prices", () => {
      const question: QuestionAttributes = {
        ...baseQuestion,
        options: ["Option A", "Option B"],
        prices: [100, 200],
      };
      const secondLocale: QuestionLanguage = {
        question: "Kysymys",
        options: ["Vaihtoehto A", "Vaihtoehto B"],
      };
      const { newAnswers, answerProducts, answerErrors } = validateQuestion(question, "Vaihtoehto A", secondLocale);
      expect(newAnswers).toEqual([{ questionId: question.id, answer: "Vaihtoehto A" }]);
      expect(answerProducts).toEqual([
        {
          name: "Vaihtoehto A",
          amount: 1,
          unitPrice: 100,
        },
      ]);
      expect(answerErrors).toBeUndefined();
    });
  });

  describe("CHECKBOX questions", () => {
    const baseQuestion = {
      id: "checkbox-question",
      order: 0,
      question: "Checkbox question",
      type: QuestionType.CHECKBOX,
      eventId: "test-event-id",
      required: false,
      public: false,
    } satisfies Partial<QuestionAttributes>;

    test("accepts single valid selection", () => {
      const question: QuestionAttributes = {
        ...baseQuestion,
        options: ["Option A", "Option B", "Option C"],
        prices: [100, 200, 300],
      };

      const { newAnswers, answerProducts, answerErrors } = validateQuestion(question, ["Option B"]);
      expect(newAnswers).toEqual([{ questionId: question.id, answer: ["Option B"] }]);
      expect(answerProducts).toEqual([
        {
          name: "Option B",
          amount: 1,
          unitPrice: 200,
        },
      ]);
      expect(answerErrors).toBeUndefined();
    });

    test("accepts multiple valid selections", () => {
      const question: QuestionAttributes = {
        ...baseQuestion,
        options: ["Option A", "Option B", "Option C", "Option D"],
        prices: [50, 100, 150, 200],
      };

      const { newAnswers, answerProducts, answerErrors } = validateQuestion(question, [
        "Option A",
        "Option B",
        "Option C",
        "Option D",
      ]);
      expect(newAnswers).toEqual([
        { questionId: question.id, answer: ["Option A", "Option B", "Option C", "Option D"] },
      ]);
      expect(answerProducts).toEqual([
        {
          name: "Option A",
          amount: 1,
          unitPrice: 50,
        },
        {
          name: "Option B",
          amount: 1,
          unitPrice: 100,
        },
        {
          name: "Option C",
          amount: 1,
          unitPrice: 150,
        },
        {
          name: "Option D",
          amount: 1,
          unitPrice: 200,
        },
      ]);
      expect(answerErrors).toBeUndefined();
    });

    test("rejects non-existent option in array", () => {
      const question: QuestionAttributes = {
        ...baseQuestion,
        options: ["Option A", "Option B"],
        prices: null,
      };

      const { answerErrors } = validateQuestion(question, ["Option A", "Option Z"]);
      expect(answerErrors).toEqual({ [question.id]: SignupFieldError.NOT_AN_OPTION });
    });

    test("rejects string answer", () => {
      const question: QuestionAttributes = {
        ...baseQuestion,
        options: ["Option A", "Option B"],
        prices: null,
      };

      const { answerErrors } = validateQuestion(question, "Option A");
      expect(answerErrors).toEqual({ [question.id]: SignupFieldError.WRONG_TYPE });
    });

    test("rejects missing and empty answer when required", () => {
      const question: QuestionAttributes = {
        ...baseQuestion,
        required: true,
        options: ["Option A", "Option B"],
        prices: null,
      };

      let { answerErrors } = validateQuestion(question, undefined);
      expect(answerErrors).toEqual({ [question.id]: SignupFieldError.MISSING });

      ({ answerErrors } = validateQuestion(question, []));
      expect(answerErrors).toEqual({ [question.id]: SignupFieldError.MISSING });
    });

    test("accepts missing or empty selection when not required", () => {
      const question: QuestionAttributes = {
        ...baseQuestion,
        options: ["Option A", "Option B"],
        prices: [100, 200],
      };

      let { newAnswers, answerProducts, answerErrors } = validateQuestion(question, undefined);
      expect(newAnswers).toEqual([{ questionId: question.id, answer: [] }]);
      expect(answerProducts).toEqual([]);
      expect(answerErrors).toBeUndefined();

      ({ newAnswers, answerProducts, answerErrors } = validateQuestion(question, []));
      expect(newAnswers).toEqual([{ questionId: question.id, answer: [] }]);
      expect(answerProducts).toEqual([]);
      expect(answerErrors).toBeUndefined();
    });

    test("returns products for zero-priced selection in paid question", () => {
      const question: QuestionAttributes = {
        ...baseQuestion,
        options: ["Free", "Paid"],
        prices: [0, 100],
      };

      expect(validateQuestion(question, ["Free"]).answerProducts).toEqual([
        {
          name: "Free",
          amount: 1,
          unitPrice: 0,
        },
      ]);
      expect(validateQuestion(question, ["Free", "Paid"]).answerProducts).toEqual([
        {
          name: "Free",
          amount: 1,
          unitPrice: 0,
        },
        {
          name: "Paid",
          amount: 1,
          unitPrice: 100,
        },
      ]);
    });

    test("returns no products when prices is null", () => {
      const question: QuestionAttributes = {
        ...baseQuestion,
        options: ["Option A", "Option B"],
        prices: null,
      };

      expect(validateQuestion(question, ["Option A", "Option B"]).answerProducts).toEqual([]);
    });

    test("handles negative prices in selections", () => {
      const question: QuestionAttributes = {
        ...baseQuestion,
        options: ["Option A", "Option B"],
        prices: [-50, 100],
      };

      const { answerProducts } = validateQuestion(question, ["Option A"]);
      expect(answerProducts).toEqual([
        {
          name: "Option A",
          amount: 1,
          unitPrice: -50,
        },
      ]);
    });

    test("returns zero price for missing prices", () => {
      const question: QuestionAttributes = {
        ...baseQuestion,
        options: ["Option A", "Option B", "Option C"],
        prices: [100, 200], // missing prices for C
      };

      const { newAnswers, answerProducts, answerErrors } = validateQuestion(question, ["Option A", "Option C"]);
      expect(newAnswers).toEqual([{ questionId: question.id, answer: ["Option A", "Option C"] }]);
      expect(answerProducts).toEqual([
        {
          name: "Option A",
          amount: 1,
          unitPrice: 100,
        },
        {
          name: "Option C",
          amount: 1,
          unitPrice: 0,
        },
      ]);
      expect(answerErrors).toBeUndefined();
    });

    test("handles localized options with prices", () => {
      const question: QuestionAttributes = {
        ...baseQuestion,
        options: ["Option A", "Option B"],
        prices: [100, 200],
      };
      const secondLocale: QuestionLanguage = {
        question: "Kysymys",
        options: ["Vaihtoehto A", "Vaihtoehto B"],
      };

      const { newAnswers, answerProducts, answerErrors } = validateQuestion(
        question,
        ["Option A", "Vaihtoehto B"],
        secondLocale,
      );
      expect(newAnswers).toEqual([{ questionId: question.id, answer: ["Option A", "Vaihtoehto B"] }]);
      expect(answerProducts).toEqual([
        { name: "Option A", amount: 1, unitPrice: 100 },
        { name: "Vaihtoehto B", amount: 1, unitPrice: 200 },
      ]);
      expect(answerErrors).toBeUndefined();
    });

    test("rejects duplicate selections", () => {
      const question: QuestionAttributes = {
        ...baseQuestion,
        options: ["Option A", "Option B", "Option C"],
        prices: [100, 200, 300],
      };

      const { answerErrors } = validateQuestion(question, ["Option A", "Option B", "Option A"]);
      expect(answerErrors).toEqual({ [question.id]: SignupFieldError.DUPLICATE_OPTION });
    });

    test("rejects duplicate selections in localized options", () => {
      const question: QuestionAttributes = {
        ...baseQuestion,
        options: ["Option A", "Option B", "Option C"],
        prices: [100, 200, 300],
      };
      const secondLocale: QuestionLanguage = {
        question: "Kysymys",
        options: ["Vaihtoehto A", "Vaihtoehto B", "Vaihtoehto C"],
      };

      const { answerErrors } = validateQuestion(
        question,
        ["Option C", "Option B", "Vaihtoehto C"], // duplicate Vaihtoehto C / Option C
        secondLocale,
      );
      expect(answerErrors).toEqual({ [question.id]: SignupFieldError.DUPLICATE_OPTION });
    });
  });

  describe("validates options to prevent ambiguity", () => {
    const baseQuestion = {
      id: "checkbox-question",
      order: 0,
      question: "Checkbox question",
      type: QuestionType.CHECKBOX,
      eventId: "test-event-id",
      required: false,
      public: false,
    } satisfies Partial<QuestionAttributes>;

    test("rejects duplicate options in default locale", () => {
      const question: QuestionAttributes = {
        ...baseQuestion,
        options: ["Option A", "Option B", "Option A"], // duplicate Option A
        prices: [100, 200, 300],
      };

      consoleWarn.mockImplementation(() => {}); // Suppress expected warning log

      const { answerErrors } = validateQuestion(question, ["Option A"]);
      expect(answerErrors).toEqual({ [question.id]: SignupFieldError.DUPLICATE_OPTION });
    });

    test("rejects duplicate options in locales", () => {
      const question: QuestionAttributes = {
        ...baseQuestion,
        options: ["Option A", "Option B", "Option C"],
        prices: [100, 200, 300],
      };

      consoleWarn.mockImplementation(() => {}); // Suppress expected warning log

      const { answerErrors } = validateQuestion(question, ["Vaihtoehto A"], {
        question: "Kysymys",
        options: ["Vaihtoehto A", "Vaihtoehto B", "Vaihtoehto B"], // duplicate Vaihtoehto B
      });
      expect(answerErrors).toEqual({ [question.id]: SignupFieldError.DUPLICATE_OPTION });
    });

    test("rejects duplicate options between a locale and default", () => {
      const question: QuestionAttributes = {
        ...baseQuestion,
        options: ["Option A", "Option B", "Option C"],
        prices: [100, 200, 300],
      };
      const localizedQuestion: QuestionLanguage = {
        question: "Kysymys",
        options: ["Vaihtoehto A", "Vaihtoehto B", "Option B"], // duplicate Option B
      };

      consoleWarn.mockImplementation(() => {}); // Suppress expected warning log

      const { answerErrors } = validateQuestion(question, ["Option A"], localizedQuestion);
      expect(answerErrors).toEqual({ [question.id]: SignupFieldError.DUPLICATE_OPTION });
    });

    test("rejects duplicate options between locales", () => {
      const question: QuestionAttributes = {
        ...baseQuestion,
        options: ["Option A", "Option B", "Option C"],
        prices: [100, 200, 300],
      };
      const secondLocale: QuestionLanguage = {
        question: "Kysymys",
        options: ["Vaihtoehto A", "Vaihtoehto B", "Vaihtoehto C"],
      };
      const thirdLocale: QuestionLanguage = {
        question: "Fråga",
        options: ["Alternativ A", "Alternativ B", "Vaihtoehto B"], // duplicate Vaihtoehto B
      };

      consoleWarn.mockImplementation(() => {}); // Suppress expected warning log

      const { answerErrors } = validateQuestion(question, ["Option A"], secondLocale, thirdLocale);
      expect(answerErrors).toEqual({ [question.id]: SignupFieldError.DUPLICATE_OPTION });
    });

    test("allows duplicate options with matching positions", () => {
      const question: QuestionAttributes = {
        ...baseQuestion,
        options: ["Option A", "Option B", "Option C"],
        prices: [100, 200, 300],
      };
      const secondLocale: QuestionLanguage = {
        question: "Kysymys",
        options: ["Option A", "Vaihtoehto B", "Option C"],
      };
      const thirdLocale: QuestionLanguage = {
        question: "Fråga",
        options: ["Alternativ A", "Vaihtoehto B", "Option C"],
      };

      const { answerErrors, newAnswers } = validateQuestion(
        question,
        ["Alternativ A", "Vaihtoehto B", "Option C"],
        secondLocale,
        thirdLocale,
      );
      expect(answerErrors).toBeUndefined();
      expect(newAnswers).toEqual([{ questionId: question.id, answer: ["Alternativ A", "Vaihtoehto B", "Option C"] }]);
    });
  });
});
