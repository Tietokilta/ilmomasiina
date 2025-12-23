import { describe, expect, test } from "vitest";

import { QuestionType } from "@tietokilta/ilmomasiina-models";
import { Question } from "../../../src/models/question";
import { calculateQuestionPrice } from "../../../src/routes/signups/updateSignup";

describe("calculateQuestionPrice", () => {
  describe("SELECT questions", () => {
    test("returns correct price for selected option", () => {
      const question = {
        type: QuestionType.SELECT,
        options: ["Option A", "Option B", "Option C"],
        prices: [100, 200, 300], // prices in cents
      } as Question;

      const price = calculateQuestionPrice(question, "Option B");
      expect(price).toBe(200);
    });

    test("returns 0 for option not in prices array", () => {
      const question = {
        type: QuestionType.SELECT,
        options: ["Option A", "Option B", "Option C"],
        prices: [100], // prices array shorter than options
      } as Question;

      const price = calculateQuestionPrice(question, "Option C");
      expect(price).toBe(0);
    });

    test("returns 0 for non-existent option", () => {
      const question = {
        type: QuestionType.SELECT,
        options: ["Option A", "Option B"],
        prices: [100, 200],
      } as Question;

      const price = calculateQuestionPrice(question, "Option Z");
      expect(price).toBe(0);
    });

    test("handles null/undefined prices in array", () => {
      const question = {
        type: QuestionType.SELECT,
        options: ["Option A", "Option B", "Option C"],
        prices: [100, null, undefined] as any,
      } as Question;

      expect(calculateQuestionPrice(question, "Option B")).toBe(0);
      expect(calculateQuestionPrice(question, "Option C")).toBe(0);
    });
  });

  describe("CHECKBOX questions", () => {
    test("returns correct sum for multiple selections", () => {
      const question = {
        type: QuestionType.CHECKBOX,
        options: ["Option A", "Option B", "Option C"],
        prices: [100, 200, 300],
      } as Question;

      const price = calculateQuestionPrice(question, ["Option A", "Option C"]);
      expect(price).toBe(400); // 100 + 300
    });

    test("returns correct price for single selection", () => {
      const question = {
        type: QuestionType.CHECKBOX,
        options: ["Option A", "Option B", "Option C"],
        prices: [100, 200, 300],
      } as Question;

      const price = calculateQuestionPrice(question, ["Option B"]);
      expect(price).toBe(200);
    });

    test("returns 0 for empty selection array", () => {
      const question = {
        type: QuestionType.CHECKBOX,
        options: ["Option A", "Option B"],
        prices: [100, 200],
      } as Question;

      const price = calculateQuestionPrice(question, []);
      expect(price).toBe(0);
    });

    test("handles selections with options not in prices array", () => {
      const question = {
        type: QuestionType.CHECKBOX,
        options: ["Option A", "Option B", "Option C"],
        prices: [100, 200], // shorter than options
      } as Question;

      const price = calculateQuestionPrice(question, ["Option A", "Option C"]);
      expect(price).toBe(100); // Only Option A has a price
    });

    test("ignores non-existent options in selection", () => {
      const question = {
        type: QuestionType.CHECKBOX,
        options: ["Option A", "Option B"],
        prices: [100, 200],
      } as Question;

      const price = calculateQuestionPrice(question, ["Option A", "Option Z"]);
      expect(price).toBe(100); // Option Z doesn't exist, so only Option A is counted
    });

    test("handles all selections with varying prices", () => {
      const question = {
        type: QuestionType.CHECKBOX,
        options: ["Option A", "Option B", "Option C", "Option D"],
        prices: [50, 100, 150, 200],
      } as Question;

      const price = calculateQuestionPrice(question, ["Option A", "Option B", "Option C", "Option D"]);
      expect(price).toBe(500); // 50 + 100 + 150 + 200
    });
  });

  describe("missing or null prices/options", () => {
    test("returns 0 when prices is null", () => {
      const question = {
        type: QuestionType.SELECT,
        options: ["Option A", "Option B"],
        prices: null,
      } as Question;

      const price = calculateQuestionPrice(question, "Option A");
      expect(price).toBe(0);
    });

    test("returns 0 when prices is undefined", () => {
      const question = {
        type: QuestionType.SELECT,
        options: ["Option A", "Option B"],
        prices: undefined,
      } as Question;

      const price = calculateQuestionPrice(question, "Option A");
      expect(price).toBe(0);
    });

    test("returns 0 when options is null", () => {
      const question = {
        type: QuestionType.SELECT,
        options: null,
        prices: [100, 200],
      } as Question;

      const price = calculateQuestionPrice(question, "Option A");
      expect(price).toBe(0);
    });

    test("returns 0 when options is undefined", () => {
      const question = {
        type: QuestionType.SELECT,
        options: undefined,
        prices: [100, 200],
      } as Question;

      const price = calculateQuestionPrice(question, "Option A");
      expect(price).toBe(0);
    });

    test("returns 0 when both options and prices are null", () => {
      const question = {
        type: QuestionType.SELECT,
        options: null,
        prices: null,
      } as Question;

      const price = calculateQuestionPrice(question, "Option A");
      expect(price).toBe(0);
    });
  });

  describe("mismatched options/prices array lengths", () => {
    test("handles prices array longer than options", () => {
      const question = {
        type: QuestionType.SELECT,
        options: ["Option A", "Option B"],
        prices: [100, 200, 300, 400], // extra prices are ignored
      } as Question;

      const price = calculateQuestionPrice(question, "Option B");
      expect(price).toBe(200);
    });

    test("handles prices array shorter than options - SELECT", () => {
      const question = {
        type: QuestionType.SELECT,
        options: ["Option A", "Option B", "Option C", "Option D"],
        prices: [100, 200], // missing prices for C and D
      } as Question;

      expect(calculateQuestionPrice(question, "Option A")).toBe(100);
      expect(calculateQuestionPrice(question, "Option B")).toBe(200);
      expect(calculateQuestionPrice(question, "Option C")).toBe(0);
      expect(calculateQuestionPrice(question, "Option D")).toBe(0);
    });

    test("handles prices array shorter than options - CHECKBOX", () => {
      const question = {
        type: QuestionType.CHECKBOX,
        options: ["Option A", "Option B", "Option C", "Option D"],
        prices: [100, 200], // missing prices for C and D
      } as Question;

      const price = calculateQuestionPrice(question, ["Option A", "Option C", "Option D"]);
      expect(price).toBe(100); // Only Option A has a price
    });
  });

  describe("edge cases and wrong answer types", () => {
    test("returns 0 when SELECT question receives array answer", () => {
      const question = {
        type: QuestionType.SELECT,
        options: ["Option A", "Option B"],
        prices: [100, 200],
      } as Question;

      const price = calculateQuestionPrice(question, ["Option A"] as any);
      expect(price).toBe(0);
    });

    test("returns 0 when CHECKBOX question receives string answer", () => {
      const question = {
        type: QuestionType.CHECKBOX,
        options: ["Option A", "Option B"],
        prices: [100, 200],
      } as Question;

      const price = calculateQuestionPrice(question, "Option A" as any);
      expect(price).toBe(0);
    });

    test("returns 0 for TEXT question type", () => {
      const question = {
        type: QuestionType.TEXT,
        options: ["Option A"],
        prices: [100],
      } as Question;

      const price = calculateQuestionPrice(question, "Option A");
      expect(price).toBe(0);
    });

    test("handles zero prices correctly", () => {
      const question = {
        type: QuestionType.SELECT,
        options: ["Free Option", "Paid Option"],
        prices: [0, 100],
      } as Question;

      expect(calculateQuestionPrice(question, "Free Option")).toBe(0);
      expect(calculateQuestionPrice(question, "Paid Option")).toBe(100);
    });

    test("handles negative prices (edge case)", () => {
      const question = {
        type: QuestionType.SELECT,
        options: ["Option A", "Option B"],
        prices: [-50, 100],
      } as Question;

      const price = calculateQuestionPrice(question, "Option A");
      expect(price).toBe(-50);
    });
  });
});
