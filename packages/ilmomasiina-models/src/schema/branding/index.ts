import { Static } from "typebox";

import { brandingAttributes } from "./attributes";

export { BRANDING_FAVICON_MAX_LENGTH, BRANDING_IMAGE_DATA_URL_PATTERN, BRANDING_LOGO_MAX_LENGTH } from "./attributes";

/** Response schema for fetching the current branding. */
export const brandingResponse = brandingAttributes;

/** Request body for updating the branding. */
export const brandingUpdateBody = brandingAttributes;

/** Schema for the current branding. */
export type BrandingSchema = Static<typeof brandingAttributes>;
/** Response schema for fetching the current branding. */
export type BrandingResponse = Static<typeof brandingResponse>;
/** Request body for updating the branding. */
export type BrandingUpdateBody = Static<typeof brandingUpdateBody>;
