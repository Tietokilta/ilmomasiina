import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import { i18n as componentsI18n, i18nResources as componentsRes } from '@tietokilta/ilmomasiina-components';
import * as en from './locales/en.json';
import * as fi from './locales/fi.json';

export const defaultNS = ['frontend', 'components'] as const;
const fiCombined = { ...fi, ...componentsRes.fi } as const;
const enCombined = { ...en, ...componentsRes.en } as const;
export const resources = {
  // these generate typescript errors if not exact match
  fi: fiCombined as typeof enCombined,
  en: enCombined as typeof fiCombined,
} as const;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'fi',
    defaultNS,
    supportedLngs: Object.keys(resources),
    interpolation: {
      // for React
      escapeValue: false,
    },
    debug: !PROD,
    react: {
      nsMode: 'fallback',
    },
  });

componentsI18n.init({ debug: !PROD });

i18n.on('languageChanged', (newLang) => {
  componentsI18n.changeLanguage(newLang);
});
componentsI18n.changeLanguage(i18n.language);

export default i18n;
