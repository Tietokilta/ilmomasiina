import { Type } from "typebox";

import { Nullable } from "../utils";

/** Maximum length of a data URL for the header logo (roughly 1 MiB). */
export const BRANDING_LOGO_MAX_LENGTH = 1024 * 1024;
/** Maximum length of a data URL for the favicon (roughly 256 KiB). */
export const BRANDING_FAVICON_MAX_LENGTH = 256 * 1024;

/** Pattern for a base64 image data URL. */
export const BRANDING_IMAGE_DATA_URL_PATTERN = "^data:image/(png|jpeg|gif|webp|svg\\+xml|x-icon|vnd\\.microsoft\\.icon);base64,[A-Za-z0-9+/]+=*$";

/** Pattern for a hex color code, e.g. #0a0d10. */
const hexColorPattern = "^#[0-9a-fA-F]{6}$";

/** Editable branding attributes. `null` means "use the built-in default". */
export const brandingAttributes = Type.Object({
  headerTitle: Nullable(Type.String({ minLength: 1, maxLength: 100 }), {
    description: "Title shown in the header. null to use the built-in default.",
  }),
  headerTitleShort: Nullable(Type.String({ minLength: 1, maxLength: 100 }), {
    description: "Title shown in the header on small screens. null to use the built-in default.",
  }),
  brandColor: Nullable(Type.String({ pattern: hexColorPattern }), {
    description: "Brand color as a hex code, e.g. #0a0d10. null to use the built-in default.",
  }),
  dangerColor: Nullable(Type.String({ pattern: hexColorPattern }), {
    description: "Danger color (delete buttons, errors) as a hex code, e.g. #d74949. null to use the built-in default.",
  }),
  logo: Nullable(Type.String({ pattern: BRANDING_IMAGE_DATA_URL_PATTERN, maxLength: BRANDING_LOGO_MAX_LENGTH }), {
    description: "Header logo as a base64 image data URL. null to use the built-in default.",
  }),
  favicon: Nullable(Type.String({ pattern: BRANDING_IMAGE_DATA_URL_PATTERN, maxLength: BRANDING_FAVICON_MAX_LENGTH }), {
    description: "Favicon as a base64 image data URL. null to use the built-in default.",
  }),
});
