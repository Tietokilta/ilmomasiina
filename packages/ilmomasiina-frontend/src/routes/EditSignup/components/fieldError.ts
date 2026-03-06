import { useCallback } from "react";

import { useTranslation } from "react-i18next";

import type { SignupFieldError } from "@tietokilta/ilmomasiina-models";

/** Localizes a SignupFieldError. */
export default function useFieldErrors() {
  const { t } = useTranslation();
  return useCallback(
    (error?: SignupFieldError): string[] | string | undefined =>
      error ? t([`editSignup.fieldError.${error}`, "editSignup.fieldError"]) : undefined,
    [t],
  );
}
