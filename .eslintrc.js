module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
    commonjs: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:prettier/recommended",
    "plugin:@next/next/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  plugins: [
    "@typescript-eslint",
    "simple-import-sort",
    "unused-imports",
    "prettier",
    "react-hooks",
  ],
  rules: {
    "@typescript-eslint/no-unused-vars": "off",
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": [
      "error",
      {
        additionalHooks: "(useRecoilCallback|useRecoilTransaction_UNSTABLE)",
      },
    ],
    "simple-import-sort/imports": [
      "error",
      {
        groups: [["^\\u0000"], ["^@?\\w"], ["^src(/.*|$)"]],
      },
    ],
    "simple-import-sort/exports": "error",
    "no-unused-vars": "off",
    "unused-imports/no-unused-imports": "error",
    "unused-imports/no-unused-vars": [
      "error",
      {
        vars: "all",
        varsIgnorePattern: "^_",
        args: "after-used",
        argsIgnorePattern: "^_",
      },
    ],
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
  },
};
