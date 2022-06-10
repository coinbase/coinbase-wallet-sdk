const webpack = require("webpack");

module.exports = function override(config, env) {
  config.resolve.fallback = {
    ...config.resolve.fallback,
    assert: require.resolve("assert/"),
    buffer: require.resolve("buffer/"),
    http: require.resolve("stream-http"),
    https: require.resolve("https-browserify"),
    os: require.resolve("os-browserify/browser"),
    stream: require.resolve("stream-browserify"),
    url: require.resolve("url/"),
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
    new webpack.ProvidePlugin({
      Buffer: ["buffer", "Buffer"],
    }),
    new webpack.DefinePlugin({
      "process.env.INFURA_ID": JSON.stringify(process.env.INFURA_ID),
    }),
  ];

  return config;
};
