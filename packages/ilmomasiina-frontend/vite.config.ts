import react from "@vitejs/plugin-react";
import dotenvFlow from "dotenv-flow";
import path from "path";
import { defineConfig } from "vite";
import checker from "vite-plugin-checker";
import tsconfigPaths from "vite-tsconfig-paths";

/* eslint-disable no-console */

// Load environment variables from .env files (from the root of repository)
dotenvFlow.config({ path: path.resolve(__dirname, "../..") });

// Default to 127.0.0.1:3001 for the backend.
// Use the dev-only variable DEV_BACKEND_PORT for this, keeping PORT always for the user-facing port.
const HOST = process.env.HOST || "127.0.0.1";
const BACKEND_PORT = Number(process.env.DEV_BACKEND_PORT) || 3001;
const FRONTEND_PORT = Number(process.env.PORT) || 3000;

const PATH_PREFIX = process.env.PATH_PREFIX || "";
if (PATH_PREFIX.endsWith("/")) {
  console.error("PATH_PREFIX must omit the final /");
  process.exit(1);
}

const TIMEZONE = process.env.APP_TIMEZONE || "Europe/Helsinki";

/** config.define takes literal JavaScript code to be search-and-replaced into the build.
 *
 * Therefore we need to quote string values, which is easiest done using JSON.stringify.
 */
function quoteValues(values: Record<string, string | number | boolean>) {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, JSON.stringify(value)]));
}

export default defineConfig(({ mode }) => ({
  server: {
    host: HOST,
    port: FRONTEND_PORT,
    strictPort: true,
    proxy: {
      "/api": {
        target: `http://${HOST}:${BACKEND_PORT}`,
      },
    },
  },

  base: `${PATH_PREFIX}/`,

  build: {
    outDir: "build",
    sourcemap: true,
  },

  css: {
    preprocessorOptions: {
      scss: {
        // Silence deprecation warning spam from Bootstrap for now.
        // We will get rid of Bootstrap eventually.
        silenceDeprecations: [
          "mixed-decls",
          "slash-div",
          "abs-percent",
          "import",
          "legacy-js-api",
          "color-functions",
          "global-builtin",
        ],
      },
    },
  },

  define: quoteValues({
    DEV: mode === "development",
    PROD: mode === "production",
    TEST: mode === "test",

    SENTRY_DSN: process.env.SENTRY_DSN || "",

    PATH_PREFIX,
    API_URL: process.env.API_URL || "",
    BRANDING_HEADER_TITLE_TEXT: process.env.BRANDING_HEADER_TITLE_TEXT || "Ilmomasiina",
    BRANDING_HEADER_TITLE_TEXT_SHORT:
      process.env.BRANDING_HEADER_TITLE_TEXT_SHORT || process.env.BRANDING_HEADER_TITLE_TEXT || "Ilmomasiina",
    BRANDING_FOOTER_GDPR_TEXT: process.env.BRANDING_FOOTER_GDPR_TEXT || "",
    BRANDING_FOOTER_GDPR_LINK: process.env.BRANDING_FOOTER_GDPR_LINK || "",
    BRANDING_FOOTER_HOME_TEXT: process.env.BRANDING_FOOTER_HOME_TEXT || "",
    BRANDING_FOOTER_HOME_LINK: process.env.BRANDING_FOOTER_HOME_LINK || "",
    BRANDING_LOGIN_PLACEHOLDER_EMAIL: process.env.BRANDING_LOGIN_PLACEHOLDER_EMAIL || "admin@tietokilta.fi",
    TIMEZONE,
    DEFAULT_LANGUAGE: process.env.DEFAULT_LANGUAGE || "fi",
  }),

  plugins: [
    react(),
    tsconfigPaths(),
    checker({
      // We already do type checking & linting separately in CI
      enableBuild: false,
      // buildMode is necessary with composite projects
      typescript: {
        buildMode: true,
      },
      // TypeScript in build mode automatically typechecks all depended packages, but
      // ESLint needs to be told where to find our code
      eslint: {
        lintCommand: "eslint ../../packages",
      },
    }),
  ],
}));
