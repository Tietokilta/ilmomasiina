import i18n from 'i18next';

import config from './config';
import * as en from './locales/en.json';
import * as fi from './locales/fi.json';

export const resources = {
  // this way we generate typescript errors if not exact match
  en: en as typeof fi,
  fi: fi as typeof en,
} as const;

i18n.init({
  lng: config.mailDefaultLang,
  fallbackLng: config.mailDefaultLang,

  resources: {
    fi,
    en,
  },
});

export default i18n;
