module.exports = {
  extends: ['preact', "../../.eslintrc.js"],
  settings: {
    react: {
      pragma: "h",
    },
  },
  rules: {
    'no-useless-constructor': 'off',
  },
};
