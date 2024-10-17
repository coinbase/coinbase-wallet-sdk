module.exports = {
  root: true,
  extends: [
    'preact',
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
  settings: {
    react: {
      pragma: 'h',
    },
  },
  env: {
    browser: true,
    es2021: true,
    node: true,
    commonjs: true,
  },
  plugins: ['@typescript-eslint', 'simple-import-sort', 'unused-imports', 'prettier'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    '@typescript-eslint/no-unused-vars': 'off',
    'simple-import-sort/imports': [
      'error',
      {
        groups: [['^\\u0000'], ['^@?\\w'], ['^src(/.*|$)']],
      },
    ],
    'simple-import-sort/exports': 'error',
    'no-unused-vars': 'off',
    'unused-imports/no-unused-imports': 'error',
    'unused-imports/no-unused-vars': [
      'error',
      {
        vars: 'all',
        varsIgnorePattern: '^_',
        args: 'after-used',
        argsIgnorePattern: '^_',
      },
    ],
    'no-console': [
      'error',
      {
        allow: ['warn', 'error', 'info'],
      },
    ],
    'prettier/prettier': [
      'error',
      {
        arrowParens: 'always',
        bracketSpacing: true,
        endOfLine: 'lf',
        htmlWhitespaceSensitivity: 'css',
        printWidth: 100,
        quoteProps: 'as-needed',
        semi: true,
        singleQuote: true,
        tabWidth: 2,
        trailingComma: 'es5',
        useTabs: false,
      },
    ],
    // TODO: change this back to error
    '@typescript-eslint/no-explicit-any': 'warn',
    'no-useless-constructor': 'off',
    'jest/no-deprecated-functions': 'off',
    'no-restricted-globals': [
      'error',
      {
        name: 'parseInt',
        message: 'Use Number.parseInt instead of parseInt.',
      },
    ],
  },
  overrides: [
    {
      files: ['**/*.test.*'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
  ],
};
