module.exports = {
  presets: [
    ["@babel/preset-env", { targets: { node: "10" } }],
    "@babel/preset-typescript",
    "preact"
  ],
  targets: "> 0.25%, not dead",
  // TODO: Refactor from legacy decorators
  plugins: [["@babel/plugin-proposal-decorators", { legacy: true }]]
};
