import { TString, Type } from "typebox";

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

const color = (description: string) =>
  Nullable(Type.String({ pattern: hexColorPattern }), {
    description: `${description} as a hex code, e.g. #0a0d10. null to use the built-in default.`,
  });

const text = (description: string, maxLength = 200) =>
  Nullable(Type.String({ minLength: 1, maxLength }), {
    description: `${description}. null to use the server default.`,
  });

const link = (description: string) =>
  Nullable(Type.String({ pattern: linkPattern, maxLength: 500 }), {
    description: `${description}. null to use the server default.`,
  });

/** Text settings. The server provides a default for each of these from its configuration. */
export const brandingTextSettings = {
  headerTitle: text("Title shown in the header", 100),
  headerTitleShort: text("Title shown in the header on small screens", 100),
  footerGdprText: text("Text of the privacy policy link in the footer"),
  footerGdprLink: link("URL of the privacy policy link in the footer"),
  footerHomeText: text("Text of the home page link in the footer"),
  footerHomeLink: link("URL of the home page link in the footer"),
  loginPlaceholderEmail: text("Placeholder shown in email fields of the login and user forms", 255),
  icalCalendarName: text("Calendar name in the iCal feed", 100),
  mailFooterText: text("Footer text in emails", 500),
  mailFooterLink: link("Footer link in emails"),
};

/** Color and image settings. `null` means the built-in default compiled into the frontend. */
export const brandingThemeSettings = {
  brandColor: color("Brand (primary) color, used for the header, links and primary buttons"),
  secondaryColor: color("Secondary color, used for secondary buttons"),
  successColor: color("Success color, used for open signups and success messages"),
  warningColor: color("Warning color, used for warning buttons and messages"),
  dangerColor: color("Danger color, used for delete buttons, errors and closed signups"),
  mutedColor: color("Muted text color, used for subheadings, help texts and the footer"),
  logo: Nullable(Type.String({ pattern: BRANDING_IMAGE_DATA_URL_PATTERN, maxLength: BRANDING_LOGO_MAX_LENGTH }), {
    description: "Header logo as a base64 image data URL. null to use the built-in default.",
  }),
  showLogo: Nullable(Type.Boolean(), {
    description: "Whether to show the header logo. null to use the built-in default.",
  }),
  favicon: Nullable(Type.String({ pattern: BRANDING_IMAGE_DATA_URL_PATTERN, maxLength: BRANDING_FAVICON_MAX_LENGTH }), {
    description: "Favicon as a base64 image data URL. null to use the built-in default.",
  }),
};

/** Editable branding settings, as stored. `null` always means "use the default". */
export const brandingSettings = Type.Object({ ...brandingTextSettings, ...brandingThemeSettings });

/** Server defaults for the text settings. Empty strings mean the item is not shown. */
export const brandingTextDefaults = Type.Object(
  Object.fromEntries(Object.keys(brandingTextSettings).map((key) => [key, Type.String()])) as {
    [K in keyof typeof brandingTextSettings]: TString;
  },
);

/** Effective branding: text settings resolved to their defaults, theme settings as stored. */
export const brandingResponse = Type.Object({ ...brandingTextDefaults.properties, ...brandingThemeSettings });
