import React, { PropsWithChildren } from 'react';

import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';

import * as en from './locales/en.json';
import * as fi from './locales/fi.json';

export const defaultNS = ['components'] as const;
export const resources = {
  // this way we generate typescript errors if not exact match
  fi: fi as typeof en,
  en: en as typeof fi,
} as const;

export { resources as i18nResources };

const i18n = createInstance({
  resources,
  fallbackLng: 'fi',
  defaultNS,
  interpolation: {
    // for React
    escapeValue: false,
  },
});

export default i18n;

export function I18nProvider({ children }: PropsWithChildren<{}>) {
  return (
    <I18nextProvider i18n={i18n}>
      {children}
    </I18nextProvider>
  );
}
