import { Static, Type } from "typebox";

import { quotaAttributes, quotaID, quotaIdentity, quotaLanguageAttributes } from "./attributes";

export { quotaID } from "./attributes";

/** Schema for a quota. */
export const quota = Type.Interface([quotaIdentity, quotaAttributes], {});

/** Schema for a quota language version. */
export const quotaLanguage = quotaLanguageAttributes;

/** Schema for creating a quota. */
export const quotaCreate = quotaAttributes;

/** Schema for updating a quota. */
export const quotaUpdate = Type.Interface(
  [Type.Partial(quotaIdentity), quotaCreate],
  {},
  { description: "Set id to reuse an existing quota, or leave it empty to create a new one." },
);

/** Quota ID type. Randomly generated alphanumeric string. */
export type QuotaID = Static<typeof quotaID>;

/** Schema for a quota. */
export type Quota = Static<typeof quota>;

/** Schema for a quota language version. */
export type QuotaLanguage = Static<typeof quotaLanguage>;

/** Schema for creating a quota. */
export type QuotaCreate = Static<typeof quotaCreate>;

/** Schema for updating a quota. */
export type QuotaUpdate = Static<typeof quotaUpdate>;
