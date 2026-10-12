import { Type } from "typebox";

import { Nullable } from "../utils";

/** Maximum length of a data URL for the header logo (roughly 1 MiB). */
export const BRANDING_LOGO_MAX_LENGTH = 1024 * 1024;
/** Maximum length of a data URL for the favicon (roughly 256 KiB). */
export const BRANDING_FAVICON_MAX_LENGTH = 256 * 1024;

/** Pattern for a base64 image data URL. */
export const BRANDING_IMAGE_DATA_URL_PATTERN =
  "^data:image/(png|jpeg|gif|webp|svg\\+xml|x-icon|vnd\\.microsoft\\.icon);base64,[A-Za-z0-9+/]+=*$";

/** Pattern for a hex color code, e.g. #0a0d10. */
const hexColorPattern = "^#[0-9a-fA-F]{6}$";

/** Pattern for links: absolute http(s) URLs, mailto links or paths on the same site. */
const linkPattern = "^(https?://|mailto:|/)";

const text = (description: string, maxLength = 200) =>
  Type.String({
    minLength: 1,
    maxLength,
    description,
  });

const link = (description: string) =>
  Type.String({
    pattern: linkPattern,
    maxLength: 500,
    description,
  });

/** Text settings visible to the frontend. */
export const frontendBrandingTexts = Type.Object({
  headerTitle: text("Title shown in the header.", 100),
  headerTitleShort: text("Title shown in the header on small screens.", 100),
  footerGdprText: text("Text of the privacy policy link in the footer. Empty to hide."),
  footerGdprLink: link("URL of the privacy policy link in the footer. Empty to hide."),
  footerHomeText: text("Text of the home page link in the footer. Empty to hide."),
  footerHomeLink: link("URL of the home page link in the footer. Empty to hide."),
});

/** Text settings for backend use only. */
export const backendBrandingTexts = Type.Object({
  loginPlaceholderEmail: text("Placeholder shown in email fields of the login and user forms", 255),
  icalCalendarName: text("Calendar name in the iCal feed", 100),
  mailFooterText: text("Footer text in emails", 500),
  mailFooterLink: link("Footer link in emails"),
});

const optionalColor = (description: string) =>
  Nullable(Type.String({ pattern: hexColorPattern }), {
    description: `${description} as a hex code, e.g. #0a0d10. null to use the built-in default.`,
  });

const optionalImage = (description: string, maxLength: number) =>
  Nullable(
    Type.String({
      pattern: BRANDING_IMAGE_DATA_URL_PATTERN,
      maxLength,
    }),
    { description: `${description} as a base64 image data URL. null to use the built-in default.` },
  );

/** Color and image settings. `null` means the built-in default compiled into the frontend. */
export const brandingThemeSettings = Type.Object({
  brandColor: optionalColor("Brand (primary) color, used for the header, links and primary buttons"),
  secondaryColor: optionalColor("Secondary color, used for secondary buttons"),
  successColor: optionalColor("Success color, used for open signups and success messages"),
  warningColor: optionalColor("Warning color, used for warning buttons and messages"),
  dangerColor: optionalColor("Danger color, used for delete buttons, errors and closed signups"),
  mutedColor: optionalColor("Muted text color, used for subheadings, help texts and the footer"),
  logo: optionalImage("Header logo", BRANDING_LOGO_MAX_LENGTH),
  favicon: optionalImage("Favicon", BRANDING_FAVICON_MAX_LENGTH),
  // TODO: Dark mode for favicon and logo.
});
