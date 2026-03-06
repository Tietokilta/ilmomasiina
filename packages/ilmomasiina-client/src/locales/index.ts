import en from "./en.json";
import fi from "./fi.json";

// Ensure we generate typescript errors if the keys don't match exactly.
fi satisfies typeof en;
en satisfies typeof fi;

// eslint-disable-next-line import/prefer-default-export
export const i18nResources = { fi, en } as const;
