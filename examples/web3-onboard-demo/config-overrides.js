const webpack = require("webpack");

module.exports = function override(config, env) {
  config.resolve.fallback = {
    ...config.resolve.fallback,
    assert: require.resolve("assert/"),
    stream: require.resolve("stream-browserify"),
    util: require.resolve("util/"),
  };
  config.resolve.extensions = [
    ...config.resolve.extensions,
    ".ts",
    ".tsx",
    ".js",
  ];
  config.plugins = [
    ...config.plugins,
    new webpack.DefinePlugin({
      "process.env.INFURA_ID": JSON.stringify(process.env.INFURA_ID),
    }),
  ];

  return config;
};
