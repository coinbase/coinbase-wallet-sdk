module.exports = {
  root: true,
  extends: ['preact'],
  env: {
    browser: true,
    es2021: true,
    node: true,
    commonjs: true,
  },
  plugins: [
    "@typescript-eslint",
    "simple-import-sort",
    "prettier",
  ],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:prettier/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  settings: {
    react: {
      pragma: "h",
    },
  },
  rules: {
    "@typescript-eslint/no-unused-vars": "off",
    "simple-import-sort/imports": [
      "error",
      {
        groups: [["^\\u0000"], ["^@?\\w"], ["^src(/.*|$)"]],
      },
    ],
    "simple-import-sort/exports": "error",
    "no-unused-vars": "off",
    "no-console": [
      "error",
      {
        allow: ["warn", "error", "info"],
      },
    ],
    "prettier/prettier": [
      "error",
      {
        arrowParens: "always",
        bracketSpacing: true,
        endOfLine: "lf",
        htmlWhitespaceSensitivity: "css",
        printWidth: 100,
        quoteProps: "as-needed",
        semi: true,
        singleQuote: true,
        tabWidth: 2,
        trailingComma: "es5",
        useTabs: false,
      },
    ],
    // TODO: change this back to error
    "@typescript-eslint/no-explicit-any": "warn",
  },
  overrides: [
    {
      files: ["**/*.test.*"],
      rules: {
        "@typescript-eslint/no-explicit-any": "off"
      }
    }
  ]
};
