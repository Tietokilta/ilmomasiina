import i18n, { DefaultNamespace, ParseKeys } from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import { i18nResources } from "./locales";

export const defaultNS = ["frontend", "public"] as const;

export type KnownLanguage = keyof typeof i18nResources;
export const knownLanguages = Object.keys(i18nResources) as KnownLanguage[];

export type TKey = ParseKeys<DefaultNamespace>;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: i18nResources,
    fallbackLng: DEFAULT_LANGUAGE,
    defaultNS,
    supportedLngs: knownLanguages,
    interpolation: {
      // for React
      escapeValue: false,
    },
    debug: !PROD,
    react: {
      nsMode: "fallback",
    },
  });

if (import.meta.hot) {
  // In development, accept updated translations without reloading the entire app.
  import.meta.hot.accept("./locales", (module) => {
    if (!module) return;
    // eslint-disable-next-line no-console
    console.log("hot reloading i18n resources");
    const newResources: Record<string, Record<string, string>> = module.i18nResources;
    for (const lang of Object.keys(newResources)) {
      for (const ns of Object.keys(newResources[lang])) {
        i18n.addResourceBundle(lang, ns, newResources[lang][ns], true, true);
      }
    }
  });
}

export default i18n;
