// Import via full path to reduce entry chunk size (by not importing entire ilmomasiina-client).
import componentsEn from "@tietokilta/ilmomasiina-client/dist/locales/en.json";
import componentsFi from "@tietokilta/ilmomasiina-client/dist/locales/fi.json";
import frontendEn from "./en.json";
import frontendFi from "./fi.json";

const fi = { ...componentsFi, ...frontendFi } as const;
const en = { ...componentsEn, ...frontendEn } as const;

// Ensure we generate typescript errors if the keys don't match exactly.
fi satisfies typeof en;
en satisfies typeof fi;

// eslint-disable-next-line import/prefer-default-export
export const i18nResources = { fi, en } as const;
