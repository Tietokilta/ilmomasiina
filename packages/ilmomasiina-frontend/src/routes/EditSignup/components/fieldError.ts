import { useCallback } from "react";

import { useTranslation } from "react-i18next";

import type { SignupFieldError } from "@tietokilta/ilmomasiina-models";

/**
 * Localizes a SignupFieldError. Relies on the fact that server-sent errors on
 * EditSignup fields are always SignupFieldError enum values.
 */
export default function useFieldErrors() {
  const { t } = useTranslation();
  return useCallback(
    (error?: unknown): string[] | string | undefined =>
      error ? t([`editSignup.fieldError.${error as SignupFieldError}`, "editSignup.fieldError"]) : undefined,
    [t],
  );
}
