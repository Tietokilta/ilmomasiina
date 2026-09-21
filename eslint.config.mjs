import js from "@eslint/js";
import vitest from "@vitest/eslint-plugin";
import { defineConfig } from "eslint/config";
import {
  configs as airbnbConfigs,
  plugins as airbnbPlugins,
  rules as airbnbRules,
} from "eslint-config-airbnb-extended";
import prettier from "eslint-config-prettier/flat";
import { createTypeScriptImportResolver } from "eslint-import-resolver-typescript";
import react from "eslint-plugin-react";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig(
  {
    ignores: ["**/node_modules/**", "**/dist/**", "**/build/**", "**/coverage/**", "**/loadTest.js"],
  },

  // Plugins from eslint-config-airbnb-extended, excluding prettier which comes in last.
  airbnbPlugins.stylistic,
  airbnbPlugins.importX,
  airbnbPlugins.react,
  airbnbPlugins.reactHooks,
  airbnbPlugins.reactA11y,
  airbnbPlugins.typescriptEslint,

  // Configs and rules from eslint-config-airbnb-extended.
  // https://github.com/eslint-config/airbnb-extended/blob/master/apps/build-templates/templates/react/prettier/ts/strict/import-react-typescript/eslint.config.mjs

  // ESLint recommended config
  js.configs.recommended,
  // Airbnb base recommended config
  ...airbnbConfigs.base.recommended,
  // Strict import rules
  airbnbRules.base.importsStrict,

  // Airbnb React recommended config
  ...airbnbConfigs.react.recommended,
  // Strict React rules
  airbnbRules.react.strict,

  // Airbnb base TypeScript config
  ...airbnbConfigs.base.typescript,
  // Strict TypeScript rules
  airbnbRules.typescript.typescriptEslintStrict,
  // Airbnb React TypeScript config
  ...airbnbConfigs.react.typescript,

  // Add some type-checked rules that are not included in airbnb-extended.
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,

  // Custom plugins, language options, and settings.
  {
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      "simple-import-sort": simpleImportSort,
    },
    settings: {
      // Needed to follow the "paths" mappings between our packages.
      "import-x/resolver-next": [
        createTypeScriptImportResolver({ project: "packages/*/tsconfig.json", noWarnOnMultipleProjects: true }),
      ],
      "import-x/internal-regex": "^@tietokilta/",
      // Pinned rather than "detect": eslint-plugin-react's detection uses
      // context.getFilename(), which ESLint 10 removed.
      "react": { version: "19.2" },
      // Add any custom hooks here.
      "react-hooks": { additionalEffectHooks: "useAbortableEffect|useAbortablePromise" },
    },
  },

  // Tests.
  {
    files: ["**/test/**/*.{ts,tsx}", "**/*.test.{ts,tsx}"],
    extends: [vitest.configs.recommended],
  },

  // Allow console in the backend and tests.
  {
    files: ["packages/ilmomasiina-backend/**/*.{ts,tsx}", "**/test/**/*.{ts,tsx}", "**/*.test.{ts,tsx}"],
    rules: {
      "no-console": "off",
    },
  },

  // Backend uses jsx-runtime.
  // TODO: Enable and autofix for frontend, too.
  {
    files: ["packages/ilmomasiina-backend/**/*.{ts,tsx}"],
    extends: [react.configs.flat["jsx-runtime"]],
  },

  {
    rules: {
      // ...I know what I'm doing.
      "no-control-regex": "off",
      // Allow i++ in for loops.
      "no-plusplus": ["error", { allowForLoopAfterthoughts: true }],
      // In some cases, especially if you want to comment the logic, it's much
      // clearer to write it like a binary tree:
      // if { if { } else { } } else { if { } else { } }
      "no-lonely-if": "off",
      // With Prettier, nested ternary is basically always more readable than the if-else mess that would replace it.
      "no-nested-ternary": "off",
      // Void expressions are used to silence no-misused-promises.
      "no-void": "off",
      // We use non-null assertions heavily.
      "@typescript-eslint/no-non-null-assertion": "off",
      // || is used in many places where both null and "" are to be replaced.
      "@typescript-eslint/prefer-nullish-coalescing": "off",
      // Relax some insanely strict and harmful defaults in the ts-eslint strict config.
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true, allowNever: true }],
      "@typescript-eslint/no-unused-vars": ["error", { ignoreRestSiblings: true }],
      "@typescript-eslint/prefer-promise-reject-errors": ["error", { allowThrowingUnknown: true }],
      "@typescript-eslint/no-empty-object-type": ["error", { allowInterfaces: "with-single-extends" }],
      // More harmful than helpful.
      "@typescript-eslint/prefer-optional-chain": "off",
      // https://github.com/typescript-eslint/typescript-eslint/issues/8113
      "@typescript-eslint/no-invalid-void-type": "off",
      // Noops are generally obvious when used, and become 3 lines with prettier
      "@typescript-eslint/no-empty-function": "off",
      // TODOs to fix in further commits
      "@typescript-eslint/consistent-type-definitions": "off",
      "@typescript-eslint/no-misused-promises": "warn",
      "@typescript-eslint/no-unsafe-argument": "warn",
      "@typescript-eslint/no-unsafe-assignment": "warn",
      "@typescript-eslint/no-unsafe-call": "warn",
      "@typescript-eslint/no-unsafe-member-access": "warn",
      "@typescript-eslint/no-unsafe-return": "warn",
      "@typescript-eslint/consistent-type-imports": "off", // TODO: Enable, { fixStyle: "inline-type-imports" }
      "import-x/consistent-type-specifier-style": "off", // TODO: Enable, "prefer-inline"
      // Noisy, while technically a nice idea.
      "@typescript-eslint/promise-function-async": "off",
      // This reports, among other things, React components. Not very useful.
      "@typescript-eslint/explicit-module-boundary-types": "off",
      // Arrow functions are widespread and Prettier makes them massive with braces.
      "@typescript-eslint/no-confusing-void-expression": ["error", { ignoreArrowShorthand: true }],
      // These were previously enabled by eslint-config-airbnb and are still sensible to keep.
      "@typescript-eslint/no-shadow": ["error", { ignoreOnInitialization: true }],
      "no-restricted-syntax": [
        "error",
        {
          selector: "ForInStatement",
          message:
            "for..in loops iterate over the entire prototype chain, which is virtually never what you want. Use Object.{keys,values,entries}, and iterate over the resulting array.",
        },
        {
          selector: "LabeledStatement",
          message: "Labels are a form of GOTO; using them makes code confusing and hard to maintain and understand.",
        },
        {
          selector: "WithStatement",
          message: "`with` is disallowed in strict mode because it makes code impossible to predict and optimize.",
        },
      ],
      // Allow single-line members to hug each other.
      "@stylistic/lines-between-class-members": [
        "error",
        "always",
        { exceptAfterOverload: true, exceptAfterSingleLine: true },
      ],
      // Splitting 5-line classes doesn't make sense, especially when nothing
      // prevents tons of functions anyway.
      "max-classes-per-file": "off",
      // TypeScript validates prop types, no need for this.
      "react/require-default-props": "off",
      // Definitely a valid performance concern, but implementing this correctly is
      // a giant PITA - the default config ignores arrow functions but they don't solve
      // the problem at all, and useCallback is just plain ugly.
      // TODO: React compiler might help with this.
      "react/jsx-no-bind": "off",
      // Prefer arrow functions to functions expressions, as that's what was done
      // when this rule was introduced.
      "react/function-component-definition": [
        "error",
        {
          namedComponents: ["function-declaration", "arrow-function"],
          unnamedComponents: "arrow-function",
        },
      ],
      // Semantic > alphabetical
      "react/jsx-sort-props": "off",
      // Fragments are cleaner as <>
      "react/jsx-fragments": ["error", "syntax"],
      // We don't use React Native, and this flags lots of already-boolean values.
      "react/jsx-no-leaked-render": "off",
      // TypeScript already resolves and checks these, and understands esModuleInterop,
      // which the plugin does not - it flags every `import React from "react"`.
      "import-x/default": "off",
      // "import-x/namespace": "off",
      // Useful in some cases with a *ton* of imports, such as test API or backend schema.
      "import-x/no-namespace": "off",
      // This was always disabled manually every time it appears.
      "import-x/prefer-default-export": "off",
      // Allow dev deps in test files.
      "import-x/no-extraneous-dependencies": [
        "error",
        {
          devDependencies: ["**/test/**", "**/vite.config.mts", "**/vitest.config.mts", "**/eslint.config.mjs"],
        },
      ],
      // Sort imports: React first, then npm packages, then local files, then CSS.
      "simple-import-sort/imports": [
        "error",
        {
          groups: [
            ["^react$"],
            ["^@?\\w"],
            // Anything that does not start with a dot.
            ["^[^.]"],
            // Anything that starts with a dot, or is from one of our packages.
            ["^@tietokilta/", "^"],
            // Css
            ["css$"],
          ],
        },
      ],
      // Reconfigure import-x/order to mostly match simple-import-sort.
      // This is disabled for now, as simple-import-sort has the special case
      // that "@tietokilta/*" in the same group as "./*" sorts "@tietokilta/*"
      // first.
      // import-x/order only allows either sorting "@tietokilta/*" after "./*",
      // or separating those into two groups.
      // TODO: Migrate to import-x/order and autofix in a single commit.
      "import-x/order": [
        "off",
        {
          "groups": [["builtin", "external"], "internal", ["parent", "sibling", "index"], "object", "unknown"],
          "pathGroups": [
            {
              pattern: "react",
              group: "external",
              position: "before",
            },
            {
              pattern: "*.{css,scss}",
              patternOptions: { matchBase: true },
              group: "unknown",
              position: "after",
            },
          ],
          "pathGroupsExcludedImportTypes": [],
          "distinctGroup": true,
          "newlines-between": "always",
          "alphabetize": {
            order: "asc",
            orderImportKind: "asc",
            caseInsensitive: true,
          },
          "named": {
            enabled: true,
            import: true,
            export: true,
            require: true,
            cjsExports: true,
            types: "types-last",
          },
          "warnOnUnassignedImports": true,
          "sortTypesGroup": false,
        },
      ],
      // Prevent imports from "src/...". VS Code adds these automatically, but they
      // break when compiled.
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["src/*"],
              message:
                'This import will break when compiled by tsc. Use a relative path instead, or "../src/" in test files.',
            },
          ],
        },
      ],
    },
  },

  // Must be last, to turn off rules that conflict with Prettier.
  prettier,
);
