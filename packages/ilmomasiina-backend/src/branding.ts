import { Transaction } from "sequelize";

import type { BrandingSchema } from "@tietokilta/ilmomasiina-models";
import { brandingKeys, defaultBranding } from "@tietokilta/ilmomasiina-models";
import { Setting } from "./models/setting";

/** Key of the branding settings in the setting table. */
export const BRANDING_SETTING_KEY = "branding";

/** Picks known branding keys from a stored value, filling in nulls for keys added after it was saved. */
function toBrandingSchema(stored: object | undefined): BrandingSchema {
  const values = (stored ?? {}) as Partial<BrandingSchema>;
  return Object.fromEntries(brandingKeys.map((key) => [key, values[key] ?? null])) as BrandingSchema;
}

/** Returns the current branding settings. All nulls mean "use built-in defaults". */
export async function getBranding(transaction?: Transaction): Promise<BrandingSchema> {
  const setting = await Setting.findByPk(BRANDING_SETTING_KEY, { transaction });
  return toBrandingSchema(setting?.value);
}

/** Replaces the branding settings. */
export async function setBranding(values: BrandingSchema, transaction?: Transaction): Promise<BrandingSchema> {
  const branding = toBrandingSchema(values);
  await Setting.upsert({ key: BRANDING_SETTING_KEY, value: branding }, { transaction });
  return branding;
}

export { defaultBranding };
