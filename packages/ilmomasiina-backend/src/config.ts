import dotenvFlow from "dotenv-flow";
import path from "path";

import { envBoolean, envEnum, envInteger, envString, frontendFilesPath } from "./util/config";

// Vite/Vitest sets BASE_URL. This conflicts with our config, but isn't used
// in tests, so just overwrite it.
if (process.env.VITEST) {
  process.env.BASE_URL = "http://localhost:3000/";
}

// Load environment variables from .env files (from the root of repository)
dotenvFlow.config({ path: path.resolve(__dirname, "../../..") });

// Compatibility for older configs
if (!process.env.BASE_URL && process.env.EMAIL_BASE_URL) {
  process.env.BASE_URL = envString("EMAIL_BASE_URL") + envString("PATH_PREFIX", "");
  console.warn(
    "BASE_URL is not set - assuming based on EMAIL_BASE_URL and PATH_PREFIX:\n" +
      `${process.env.BASE_URL}\n` +
      "This behavior is DEPRECATED and may be removed in a future Ilmomasiina version.",
  );
}

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

  /** ClearDB connection string. */
  clearDbUrl: envString("CLEARDB_DATABASE_URL", null),
  /** `mysql` and `postgres` are supported. */
  dbDialect: envString("DB_DIALECT", null),
  /** Hostname for the database. */
  dbHost: envString("DB_HOST", null),
  /** Port for the database. */
  dbPort: envInteger("DB_PORT", null),
  /** Whether to use SSL for the database. */
  dbSsl: envBoolean("DB_SSL", false),
  /** Username for the database. */
  dbUser: envString("DB_USER", null),
  /** Password for the database. */
  dbPassword: envString("DB_PASSWORD", null),
  /** Database name. */
  dbDatabase: envString("DB_DATABASE", null),
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
  /** Default language for emails, if no language is known for the signup.
   *
   * Also used for URLs in iCalendar.
   */
  mailDefaultLang: envString("MAIL_DEFAULT_LANG", "fi"),

  /** Domain name used for iCalendar UIDs. */
  icalUidDomain: envString("ICAL_UID_DOMAIN", null),

  /** Timezone used for emails. */
  timezone: envString("APP_TIMEZONE", "Europe/Helsinki"),

  /** Canonical base URL for the app. Includes $PATH_PREFIX, but NOT a final "/".
   *
   * @example "http://example.com"
   * @example "http://example.com/ilmo"
   */
  baseUrl: envString("BASE_URL"),
  /** URL template for an event details page. Used for iCalendar exports. Contains `{slug}`, may contain `{lang}`.
   *
   * This is intended for custom frontends; the default is for the frontend included in the repo.
   *
   * @example "http://example.com/events/{slug}"
   */
  eventDetailsUrl: envString("EVENT_DETAILS_URL", `${envString("BASE_URL")}/events/{slug}`),
  /** URL template for a signup edit page. Used for emails. Contains `{id}` and `{editToken}`, may contain `{lang}`.
   *
   * This is intended for custom frontends; the default is for the frontend included in the repo.
   *
   * @example "http://example.com/signup/{id}/{editToken}"
   */
  editSignupUrl: envString("EDIT_SIGNUP_URL", `${envString("BASE_URL")}/signup/{id}/{editToken}`),
  /** URL template for the admin main page. Used for emails. May contain `{lang}`.
   *
   * This is intended for custom frontends; the default is for the frontend included in the repo.
   *
   * @example "http://example.com/{lang}/admin"
   */
  adminUrl: envString("ADMIN_URL", `${envString("BASE_URL")}/admin`),

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
  /** How long items stay in the database after deletion, in order to allow restoring accidentally deleted items. */
  deletionGracePeriod: envInteger("DELETION_GRACE_PERIOD_DAYS", 14),
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

try {
  // Node only supports URL.canParse since 18.17.0
  // eslint-disable-next-line no-new
  new URL(config.baseUrl);
} catch (err) {
  throw new Error("BASE_URL is invalid - make sure it is a full URL like http://example.com.");
}

if (!config.eventDetailsUrl.includes("{slug}")) {
  throw new Error("EVENT_DETAILS_URL must contain {slug} if set.");
}

if (!config.editSignupUrl.includes("{id}") || !config.editSignupUrl.includes("{editToken}")) {
  throw new Error("EDIT_SIGNUP_URL must contain {id} and {editToken} if set.");
}

export default config;
