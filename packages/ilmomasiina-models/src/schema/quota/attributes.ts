import { Type } from "typebox";

import { Nullable } from "../utils";

export const quotaID = Type.String({
  title: "QuotaID",
  description: "Quota ID. Randomly generated alphanumeric string.",
  // TODO: Add validation? max-length?
});

/** Non-editable identity attributes of a quota. */
export const quotaIdentity = Type.Object({
  id: quotaID,
});

/** Editable attributes of a quota language version. */
export const quotaLanguageAttributes = Type.Object({
  // No minLength to allow for fallback.
  title: Type.String({
    description: "Quota name.",
    maxLength: 255,
  }),
});

/** Editable attributes of a quota. */
export const quotaAttributes = Type.Object({
  title: Type.String({
    description: "Quota name.",
    minLength: 1,
    maxLength: 255,
  }),
  size: Nullable(Type.Integer({ minimum: 1 }), {
    description: "Maximum number of signups in the quota. If null, the size is unlimited.",
  }),
  price: Type.Integer({
    description: "Price in cents for the quota. Must be zero or a positive integer.",
    minimum: 0,
  }),
});
