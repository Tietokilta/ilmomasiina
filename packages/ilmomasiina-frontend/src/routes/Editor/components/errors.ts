import { useCallback } from "react";

import { useTranslation } from "react-i18next";
import { z } from "zod";

import { TKey } from "../../../i18n";

export default function useEditorErrors(): (error: unknown) => string {
  const { t } = useTranslation();
  return useCallback(
    (error) => {
      if (!error || typeof error !== "object" || !("code" in error)) {
        return t("editor.errors.generic", { error: error as string });
      }
      const issue = error as z.core.$ZodIssue;
      // Handle one-off custom error messages by passing the i18n key directly in .message
      if (issue.message.startsWith("editor.errors.")) {
        return t(issue.message as TKey, issue.code === "custom" ? issue.params : {});
      }
      // Custom messages for the errors that should be possible to input with the form elements
      switch (issue.code) {
        case "invalid_type":
          if (issue.input === null || issue.input === undefined) return t("editor.errors.required");
          break;
        case "too_small":
          if (issue.origin === "string") {
            if (issue.minimum === 1) return t("editor.errors.required");
            return t("editor.errors.tooShort", { minimum: issue.minimum });
          }
          if (issue.origin === "number") return t("editor.errors.tooSmall", { minimum: issue.minimum });
          break;
        case "too_big":
          if (issue.origin === "string") return t("editor.errors.tooLong", { maximum: issue.maximum });
          if (issue.origin === "number") return t("editor.errors.tooLarge", { maximum: issue.maximum });
          break;
        default:
          break;
      }
      // Fallback
      return t("editor.errors.generic", { error: issue.message });
    },
    [t],
  );
}
