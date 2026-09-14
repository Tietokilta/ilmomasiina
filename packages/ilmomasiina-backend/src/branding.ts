import { Transaction } from "sequelize";

import type { BrandingResponse, BrandingSettings, BrandingTextDefaults } from "@tietokilta/ilmomasiina-models";
import { brandingKeys, brandingTextKeys } from "@tietokilta/ilmomasiina-models";
import config from "./config";
import { Setting } from "./models/setting";

/** Key of the branding settings in the setting table. */
export const BRANDING_SETTING_KEY = "branding";

/** Returns the defaults for the text settings, from the server configuration. */
export function getBrandingDefaults(): BrandingTextDefaults {
  return {
    headerTitle: config.brandingHeaderTitle,
    headerTitleShort: config.brandingHeaderTitleShort ?? config.brandingHeaderTitle,
    footerGdprText: config.brandingFooterGdprText,
    footerGdprLink: config.brandingFooterGdprLink,
    footerHomeText: config.brandingFooterHomeText,
    footerHomeLink: config.brandingFooterHomeLink,
    loginPlaceholderEmail: config.brandingLoginPlaceholderEmail,
    icalCalendarName: config.icalCalendarName,
    mailFooterText: config.brandingMailFooterText,
    mailFooterLink: config.brandingMailFooterLink,
  };
}

/** Picks known branding keys from a stored value, filling in nulls for keys added after it was saved. */
function toBrandingSettings(stored: object | undefined): BrandingSettings {
  const values = (stored ?? {}) as Partial<BrandingSettings>;
  return Object.fromEntries(brandingKeys.map((key) => [key, values[key] ?? null])) as BrandingSettings;
}

/** Returns the stored branding settings. All nulls mean "use defaults". */
export async function getBrandingSettings(transaction?: Transaction): Promise<BrandingSettings> {
  const setting = await Setting.findByPk(BRANDING_SETTING_KEY, { transaction });
  return toBrandingSettings(setting?.value);
}

/** Resolves branding settings to the effective branding by filling in the defaults for text settings. */
export function resolveBranding(settings: BrandingSettings): BrandingResponse {
  const defaults = getBrandingDefaults();
  const texts = Object.fromEntries(brandingTextKeys.map((key) => [key, settings[key] ?? defaults[key]]));
  return {
    ...settings,
    ...texts,
    // If only a custom full title is set, use it on small screens too.
    headerTitleShort: settings.headerTitleShort ?? settings.headerTitle ?? defaults.headerTitleShort,
  } as BrandingResponse;
}

/** Returns the effective branding. */
export async function getBranding(transaction?: Transaction): Promise<BrandingResponse> {
  return resolveBranding(await getBrandingSettings(transaction));
}

/** Replaces the branding settings. */
export async function setBrandingSettings(
  values: BrandingSettings,
  transaction?: Transaction,
): Promise<BrandingSettings> {
  const settings = toBrandingSettings(values);
  await Setting.upsert({ key: BRANDING_SETTING_KEY, value: settings }, { transaction });
  return settings;
}
