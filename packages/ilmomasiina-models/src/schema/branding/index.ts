import { Static, Type } from "typebox";

import { brandingResponse, brandingSettings, brandingTextDefaults, brandingTextSettings } from "./attributes";

export {
  BRANDING_FAVICON_MAX_LENGTH,
  BRANDING_IMAGE_DATA_URL_PATTERN,
  BRANDING_LOGO_MAX_LENGTH,
  brandingResponse,
  brandingSettings,
  brandingTextDefaults,
} from "./attributes";

/** Request body for updating the branding settings. */
export const brandingUpdateBody = brandingSettings;

/** Response schema for fetching the branding settings as an admin. */
export const adminBrandingResponse = Type.Object({
  settings: brandingSettings,
  defaults: brandingTextDefaults,
});

/** Editable branding settings, as stored. `null` always means "use the default". */
export type BrandingSettings = Static<typeof brandingSettings>;
/** Server defaults for the text settings. */
export type BrandingTextDefaults = Static<typeof brandingTextDefaults>;
/** Effective branding, with text settings resolved to their defaults. */
export type BrandingResponse = Static<typeof brandingResponse>;
/** Response schema for fetching the branding settings as an admin. */
export type AdminBrandingResponse = Static<typeof adminBrandingResponse>;
/** Request body for updating the branding settings. */
export type BrandingUpdateBody = Static<typeof brandingUpdateBody>;

/** All editable branding keys. */
export const brandingKeys = Object.keys(brandingSettings.properties) as (keyof BrandingSettings)[];
/** Text setting keys, which have server defaults. */
export const brandingTextKeys = Object.keys(brandingTextSettings) as (keyof BrandingTextDefaults)[];

/** Branding settings with all values set to null, i.e. defaults everywhere. */
export const emptyBrandingSettings = Object.fromEntries(brandingKeys.map((key) => [key, null])) as BrandingSettings;
