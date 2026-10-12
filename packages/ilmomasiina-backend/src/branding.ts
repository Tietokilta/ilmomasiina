import { Transaction } from "sequelize";

import type { BrandingSettings } from "@tietokilta/ilmomasiina-models";
import config from "./config";
import { Setting } from "./models/setting";

/** Key of the branding settings in the setting table. */
export const BRANDING_SETTING_KEY = "branding";

/** Returns the defaults for the text settings, from the server configuration. */
export function getBrandingDefaults(): BrandingSettings {
  return {
    ...config.branding,
    headerTitleShort: config.branding.headerTitleShort ?? config.branding.headerTitle,
    brandColor: null,
    secondaryColor: null,
    successColor: null,
    warningColor: null,
    dangerColor: null,
    mutedColor: null,
    logo: null,
    favicon: null,
  };
}

/** Picks known branding keys from a stored value, filling in defaults for keys added after it was saved. */
function resolveBranding(stored: object | undefined): BrandingSettings {
  return {
    ...getBrandingDefaults(),
    ...(stored as Partial<BrandingSettings>),
  };
}

/** Returns the stored branding settings. All nulls mean "use defaults". */
export async function getBrandingSettings(transaction?: Transaction): Promise<BrandingSettings> {
  const setting = await Setting.findByPk(BRANDING_SETTING_KEY, { transaction });
  return resolveBranding(setting?.value);
}

/** Replaces the stored branding settings. */
export async function setBrandingSettings(
  value: BrandingSettings,
  transaction?: Transaction,
): Promise<BrandingSettings> {
  const [result] = await Setting.upsert({ key: BRANDING_SETTING_KEY, value }, { transaction });
  return resolveBranding(result.value);
}
