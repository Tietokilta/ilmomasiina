import i18n from "i18next";

import * as en from "./locales/en.json";
import * as fi from "./locales/fi.json";

const resources = {
  // this way we generate typescript errors if not exact match
  en: en satisfies typeof fi,
  fi: fi satisfies typeof en,
} as const;

export type KnownLanguage = keyof typeof resources;
export const knownLanguages = Object.keys(resources) as KnownLanguage[];

export { resources as i18nResources };

export default i18n;
