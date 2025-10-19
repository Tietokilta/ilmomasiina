module.exports = {
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "project": [
      "packages/ilmomasiina-models/tsconfig.json",
      "packages/ilmomasiina-client/tsconfig.json",
      "packages/ilmomasiina-frontend/tsconfig.json",
      "packages/ilmomasiina-backend/tsconfig.json"
    ],
    "tsconfigRootDir": __dirname,
    // https://github.com/typescript-eslint/typescript-eslint/issues/2094
    "EXPERIMENTAL_useSourceOfProjectReferenceRedirect": true
  },
  "ignorePatterns": [
    "**/node_modules/**",
    "**/dist/**",
    "**/build/**",
    ".eslintrc.js",
    "jest.config.js",
    "*.svg",
    "*.png",
    "*.md",
    "*.scss",
    "*.json"
  ],
  "settings": {
    "react": {
      "pragma": "React",
      "version": "16.12"
    },
  },
  "extends": [
    "airbnb",
    "airbnb/hooks",
    "airbnb-typescript",
    "prettier"
  ],
  "plugins": [
    "@typescript-eslint",
    "promise",
    "simple-import-sort",
    "jest"
  ],
  "env": {
    "browser": true
  },
  "rules": {
    // To allow grouping of class members - especially for Models.
    "@typescript-eslint/lines-between-class-members": "off",
    // Doesn't increase code quality with redux.
    "@typescript-eslint/default-param-last": "off",
    // Allow i++ in for loops.
    "no-plusplus": ["error", { allowForLoopAfterthoughts: true }],
    // We are targeting ES5 or higher.
    "radix": ["error", "as-needed"],
    // ...I know what I'm doing.
    "no-control-regex": "off",
    // In some cases, especially if you want to comment the logic, it's much
    // clearer to write it like a binary tree:
    // if { if { } else { } } else { if { } else { } }
    "no-lonely-if": "off",
    // Not usable with formik.
    "react/jsx-props-no-spreading": "off",
    // TypeScript validates prop types, no need for this.
    "react/require-default-props": "off",
    // Definitely a valid performance concern, but implementing this correctly is
    // a giant PITA - the default config ignores arrow functions but they don't solve
    // the problem at all, and useCallback is just plain ugly.
    "react/jsx-no-bind": "off",
    // Add any custom hooks here
    "react-hooks/exhaustive-deps": ["error", {
      additionalHooks: "useAbortableEffect|useAbortablePromise",
    }],
    // Prefer arrow functions to functions expressions, as that's what was done
    // when this rule was introduced.
    "react/function-component-definition": ["error", {
      namedComponents: ["function-declaration", "arrow-function"],
      unnamedComponents: "arrow-function",
    }],
    // Allow dev deps in test files.
    "import/no-extraneous-dependencies": ["error", {
      devDependencies: [
        "**/test/**",
        "**/vite.config.ts",
        "**/vitest.config.ts",
        "**/.eslintrc.js"
      ],
    }],
    // Sort imports: React first, then npm packages, then local files, then CSS.
    "simple-import-sort/imports": [
      "error",
      {
        "groups": [
          ["^react$"],
          ["^@?\\w"],
          // Anything that does not start with a dot.
          ["^[^.]"],
          // Anything that starts with a dot, or is from one of our packages.
          ["^@tietokilta/", "^"],
          // Css
          ["css$"]
        ]
      }
    ],
    // Prevent imports from "src/...". VS Code adds these automatically, but they
    // break when compiled.
    "no-restricted-imports": [
      "error",
      {
        "patterns": [{
          group: ["src/*"],
          message: "This import will break when compiled by tsc. Use a relative path instead, or \"../src/\" in test files."
        }],
      },
    ],
    // Removing for..of loops from this rule. Vite already targets modern browsers, so for..of doesn't require
    // transpilation. Array.forEach doesn't work at all with async.
    // Modified from https://github.com/airbnb/javascript/blob/master/packages/eslint-config-airbnb-base/rules/style.js
    "no-restricted-syntax": [
      "error",
      {
        "selector": "ForInStatement",
        "message": "for..in loops iterate over the entire prototype chain, which is virtually never what you want. Use Object.{keys,values,entries}, and iterate over the resulting array."
      },
      {
        "selector": "LabeledStatement",
        "message": "Labels are a form of GOTO; using them makes code confusing and hard to maintain and understand."
      },
      {
        "selector": "WithStatement",
        "message": "`with` is disallowed in strict mode because it makes code impossible to predict and optimize."
      }
    ],
  }
};
