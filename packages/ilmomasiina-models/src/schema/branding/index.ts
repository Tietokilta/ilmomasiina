import { Static, Type } from "typebox";

import { backendBrandingTexts, brandingThemeSettings, frontendBrandingTexts } from "./attributes";

export { BRANDING_FAVICON_MAX_LENGTH, BRANDING_IMAGE_DATA_URL_PATTERN, BRANDING_LOGO_MAX_LENGTH } from "./attributes";

/** Editable branding settings visible to the frontend. */
export const frontendBrandingSettings = Type.Interface([frontendBrandingTexts, brandingThemeSettings], {});

/** Editable branding settings. */
export const brandingSettings = Type.Interface(
  [frontendBrandingTexts, backendBrandingTexts, brandingThemeSettings],
  {},
);

/** Request body for updating the branding settings. */
export const brandingUpdateBody = brandingSettings;

/** Response schema for fetching the branding settings as an admin. */
export const adminBrandingResponse = Type.Object({
  settings: brandingSettings,
  hasEnvVariables: Type.Boolean({
    description: "Whether any legacy branding environment variables are still configured.",
  }),
});

/** Editable branding settings, as stored. `null` always means "use the default". */
export type BrandingSettings = Static<typeof brandingSettings>;
/** Response schema for fetching the branding settings as an admin. */
export type AdminBrandingResponse = Static<typeof adminBrandingResponse>;
/** Request body for updating the branding settings. */
export type BrandingUpdateBody = Static<typeof brandingUpdateBody>;

/** All editable branding keys. */
export const brandingKeys = Object.keys(brandingSettings.properties) as (keyof BrandingSettings)[];
