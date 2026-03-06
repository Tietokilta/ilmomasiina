import dotenvFlow from "dotenv-flow";
import path from "path";

import { FrontendsConfig, frontendsSchema, stripeBrandingSchema } from "./configSchemas";
import i18n, { i18nResources, knownLanguages } from "./i18n";
import { envBoolean, envEnum, envInteger, envJson, envString, frontendFilesPath } from "./util/config";

// Vite/Vitest sets BASE_URL. This conflicts with our config, but isn't used
// in tests, so just overwrite it.
if (process.env.VITEST) {
  process.env.BASE_URL = "http://localhost:3000/";
}

// Load environment variables from .env files (from the root of repository)
dotenvFlow.config({ path: path.resolve(__dirname, "../../..") });

// Check for no longer supported configuration options
if (process.env.CLEARDB_DATABASE_URL || (process.env.DB_DIALECT && process.env.DB_DIALECT !== "postgres")) {
  throw new Error(
    "Only PostgreSQL is supported by Ilmomasiina 3.0. MySQL migration tools will be provided in a future Ilmomasiina 2.x version.",
  );
}
if (process.env.EVENT_DETAILS_URL || process.env.EDIT_SIGNUP_URL || process.env.ADMIN_URL) {
  if (!process.env.FRONTENDS) {
    throw new Error(
      "EVENT_DETAILS_URL, EDIT_SIGNUP_URL and ADMIN_URL are no longer supported by Ilmomasiina 3.0. Use FRONTENDS instead.",
    );
  } else {
    console.warn(
      "EVENT_DETAILS_URL, EDIT_SIGNUP_URL and ADMIN_URL are no longer supported by Ilmomasiina 3.0 and should be removed from your configuration. Use FRONTENDS instead.",
    );
  }
}
if (process.env.EMAIL_BASE_URL) {
  if (!process.env.BASE_URL) {
    throw new Error("EMAIL_BASE_URL is not supported by Ilmomasiina 3.0. Use BASE_URL and/or FRONTENDS instead.");
  } else {
    console.warn(
      "EMAIL_BASE_URL is not supported by Ilmomasiina 3.0 and should be removed from your configuration. Use BASE_URL and/or FRONTENDS instead.",
    );
  }
}
if (process.env.MAIL_DEFAULT_LANG) {
  if (!process.env.DEFAULT_LANGUAGE) {
    throw new Error("MAIL_DEFAULT_LANG is not supported by Ilmomasiina 3.0. Use DEFAULT_LANGUAGE instead.");
  } else {
    console.warn(
      "MAIL_DEFAULT_LANG is not supported by Ilmomasiina 3.0 and should be removed from your configuration. Use DEFAULT_LANGUAGE instead.",
    );
  }
}

const baseUrl = envString("BASE_URL");

// Fill in default values in frontend config
const baseFrontends = envJson("FRONTENDS", frontendsSchema, {});
const frontends: FrontendsConfig = {
  ...baseFrontends,
  default: {
    ...baseFrontends.default,
    eventDetailsUrl: baseFrontends.default?.eventDetailsUrl ?? `${baseUrl}/events/{slug}`,
    editSignupUrl: baseFrontends.default?.editSignupUrl ?? `${baseUrl}/signup/{id}/{editToken}`,
    completePaymentUrl: baseFrontends.default?.completePaymentUrl ?? `${baseUrl}/payment/{id}/{editToken}`,
    adminUrl: baseFrontends.default?.adminUrl ?? `${baseUrl}/admin`,
  },
};

const config = {
  nodeEnv: envEnum("NODE_ENV", ["production", "development", "test", "bench"], "development"),
  /** Whether to log SQL queries from Sequelize. */
  debugDbLogging: envBoolean("DEBUG_DB_LOGGING", false),

  /** The host to run the backend server on. */
  host: envString("HOST", "localhost"),
  /** The port to run the backend server on. */
  // Check DEV_BACKEND_PORT first, then PORT, then default to 3000.
  port: envInteger("DEV_BACKEND_PORT", envInteger("PORT", 3000)),

  /** Whether an Azure App Service environment is detected. */
  isAzure: process.env.WEBSITE_SITE_NAME !== undefined,

  enforceHttps: envBoolean("ENFORCE_HTTPS", false),
  /** Whether or not to trust X-Forwarded-For headers for remote IP. Set to true IF AND ONLY IF
   * running behind a proxy that sets this header.
   */
  trustProxy: envBoolean("TRUST_PROXY", false),
  /** Location of the compiled frontend files. `null` to disable serving. */
  frontendFilesPath: frontendFilesPath(),
  /** Allowed origins for cross-site requests to API. Comma-separated, `*` for all. */
  allowOrigin: envString("ALLOW_ORIGIN", null),

  /** Version number added as a header to responses. */
  version: envString("VERSION", null),

  /** Hostname for the database. */
  dbHost: envString("DB_HOST"),
  /** Port for the database. */
  dbPort: envInteger("DB_PORT", null),
  /** Whether to use SSL for the database. */
  dbSsl: envBoolean("DB_SSL", false),
  /** Username for the database. */
  dbUser: envString("DB_USER"),
  /** Password for the database. */
  dbPassword: envString("DB_PASSWORD", null),
  /** Database name. */
  dbDatabase: envString("DB_DATABASE"),
  /** Required to run tests, as they reset the test database for every test. */
  allowTestsToResetDb: envBoolean("THIS_IS_A_TEST_DB_AND_CAN_BE_WIPED", false),

  /** Salt for generating legacy edit tokens. Used only to keep tokens valid from a previous installation. */
  oldEditTokenSalt: envString("EDIT_TOKEN_SALT", null),
  /** Secret for generating modern edit tokens. */
  newEditTokenSecret: envString("NEW_EDIT_TOKEN_SECRET"),
  /** Secret for Feathers' authentication module. */
  feathersAuthSecret: envString("FEATHERS_AUTH_SECRET"),

  /** From: address for emails. */
  mailFrom: envString("MAIL_FROM"),
  /** Text shown at the end of emails. */
  brandingMailFooterText: envString("BRANDING_MAIL_FOOTER_TEXT"),
  /** Link shown at the end of emails. */
  brandingMailFooterLink: envString("BRANDING_MAIL_FOOTER_LINK"),
  /** Calendar name included in iCalendar exports. */
  icalCalendarName: envString("BRANDING_ICAL_CALENDAR_NAME", "Ilmomasiina"),
  /** Default language for emails, iCalendar exports, and signups for which no language is known. */
  defaultLanguage: envEnum("DEFAULT_LANGUAGE", knownLanguages, "fi"),

  /** Domain name used for iCalendar UIDs. */
  icalUidDomain: envString("ICAL_UID_DOMAIN", null),

  /** Timezone used for emails. */
  timezone: envString("APP_TIMEZONE", "Europe/Helsinki"),

  /** Canonical base URL for the app. Includes $PATH_PREFIX, but NOT a final "/".
   *
   * @example "http://example.com"
   * @example "http://example.com/ilmo"
   */
  baseUrl,
  /** Alternate frontend URL definitions as JSON. Used by the backend for emails, iCalendar exports, and payment links.
   *
   * The "default" key is used when no frontend can be determined for the current operation.
   */
  frontends,

  /** SMTP server hostname. */
  smtpHost: envString("SMTP_HOST", null),
  /** SMTP server port. */
  smtpPort: envInteger("SMTP_PORT", null),
  /** Whether to use TLS for SMTP. */
  smtpTls: envBoolean("SMTP_TLS", false),
  /** SMTP username. */
  smtpUser: envString("SMTP_USER", null),
  /** SMTP password. */
  smtpPassword: envString("SMTP_PASSWORD", null),
  /** API key for Mailgun email sending. */
  mailgunApiKey: envString("MAILGUN_API_KEY", null),
  /** Domain for Mailgun email sending. */
  mailgunDomain: envString("MAILGUN_DOMAIN", null),
  /** Host for Mailgun API server. */
  mailgunHost: envString("MAILGUN_HOST", "api.eu.mailgun.net"),

  /** How long each user has to edit their signup after creation. */
  signupConfirmMins: envInteger("SIGNUP_CONFIRM_MINS", 30),
  /** Whether signups can be edited for SIGNUP_CONFIRM_MINS after creation, even if signups for the event have closed. */
  signupConfirmAfterClose: envBoolean("SIGNUP_CONFIRM_AFTER_CLOSE", false),

  /** How long after an event's date to remove signup details. */
  anonymizeAfterDays: envInteger("ANONYMIZE_AFTER_DAYS", 180),
  /** How long after an event's date it will become fully invisible to users. */
  hideEventAfterDays: envInteger("HIDE_EVENT_AFTER_DAYS", 180),
  /** How long items stay in the database after deletion, in order to allow restoring accidentally deleted items. */
  deletionGracePeriod: envInteger("DELETION_GRACE_PERIOD_DAYS", 14),

  /** The currency used for payments. */
  currency: envString("CURRENCY", "EUR"),

  /** Stripe secret key for payment processing. */
  stripeSecretKey: envString("STRIPE_SECRET_KEY", null),
  /** Stripe webhook signing secret for verifying webhook events. */
  stripeWebhookSecret: envString("STRIPE_WEBHOOK_SECRET", null),
  /** How long (in minutes) before a Stripe Checkout Session expires. Default: 30 minutes. */
  stripeCheckoutExpiryMins: envInteger("STRIPE_CHECKOUT_EXPIRY_MINS", 30),
  /** Stripe branding customization. */
  stripeBranding: envJson("STRIPE_BRANDING_JSON", stripeBrandingSchema, {}),
} as const;

if (!process.env.PORT && config.nodeEnv === "production") {
  throw new Error("Env variable PORT must be set in production");
}

if (config.frontendFilesPath === null) {
  if (process.env.FRONTEND_FILES_PATH === "") {
    console.info("Frontend serving disabled in backend.");
  } else if (config.nodeEnv === "production") {
    console.info("Compiled frontend not found. Frontend will not be served by backend.");
  }
}

if (config.newEditTokenSecret === "") {
  throw new Error("Env variable NEW_EDIT_TOKEN_SECRET must be set to a nonempty value.");
}

if (!config.feathersAuthSecret) {
  throw new Error("Env variable FEATHERS_AUTH_SECRET must be set to a nonempty value.");
}

if (config.oldEditTokenSalt === config.newEditTokenSecret) {
  throw new Error(
    "Don't use the same secret for EDIT_TOKEN_SALT and NEW_EDIT_TOKEN_SECRET.\n" +
      "If this is a new installation, leave EDIT_TOKEN_SALT empty. If this is an old installation, " +
      "leave EDIT_TOKEN_SALT as is and generate a new secret for NEW_EDIT_TOKEN_SECRET.",
  );
}

if (!URL.canParse(config.baseUrl)) {
  throw new Error("BASE_URL is invalid - make sure it is a full URL like http://example.com.");
}

if (config.stripeCheckoutExpiryMins < 30 || config.stripeCheckoutExpiryMins > 1440) {
  throw new Error("STRIPE_CHECKOUT_EXPIRY_MINS must be between 30 and 1440 (24 hours).");
}

if (config.stripeSecretKey && !config.stripeWebhookSecret) {
  console.warn("STRIPE_WEBHOOK_SECRET is not configured - ignoring webhooks.");
}

i18n.init({
  lng: config.defaultLanguage,
  fallbackLng: config.defaultLanguage,
  resources: i18nResources,
  interpolation: {
    // We only pass i18n strings to email subjects or Pug, which also does escaping
    escapeValue: false,
  },
});

export default config;

type AdminUrlParams = { lang: string; frontend?: string };

export function adminUrl({ lang, frontend = "default" }: AdminUrlParams) {
  const template = config.frontends[frontend]?.adminUrl ?? config.frontends.default.adminUrl;
  return template.replace(/\{lang\}/g, lang);
}

type EventDetailsUrlParams = { slug: string; lang: string; frontend: string | undefined };

export function eventDetailsUrl({ slug, lang, frontend = "default" }: EventDetailsUrlParams) {
  const template = config.frontends[frontend]?.eventDetailsUrl ?? config.frontends.default.eventDetailsUrl;
  return template.replace(/\{slug\}/g, slug).replace(/\{lang\}/g, lang);
}

type EditSignupUrlParams = { id: string; editToken: string; lang: string; frontend: string | undefined };

export function editSignupUrl({ id, editToken, lang, frontend = "default" }: EditSignupUrlParams) {
  const template = config.frontends[frontend]?.editSignupUrl ?? config.frontends.default.editSignupUrl;
  return template
    .replace(/\{id\}/g, id)
    .replace(/\{editToken\}/g, editToken)
    .replace(/\{lang\}/g, lang);
}

type CompletePaymentUrlParams = { id: string; editToken: string; lang: string; frontend: string | undefined };

export function completePaymentUrl({ id, editToken, lang, frontend = "default" }: CompletePaymentUrlParams) {
  const template = config.frontends[frontend]?.completePaymentUrl ?? config.frontends.default.completePaymentUrl;
  return template
    .replace(/\{id\}/g, id)
    .replace(/\{editToken\}/g, editToken)
    .replace(/\{lang\}/g, lang);
}
