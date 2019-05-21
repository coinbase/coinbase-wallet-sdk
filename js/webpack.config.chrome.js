const path = require("path")
const CopyWebpackPlugin = require("copy-webpack-plugin")
const defaultWebpackConfig = require("./webpack.config")

module.exports = {
  ...defaultWebpackConfig,
  entry: "./chrome/contentScript.ts",
  // devtool: 'inline-source-map',
  module: {
    rules: [
      {
        test: /\/(walletlink|web3-0.20.7.min)\.js$/,
        use: "raw-loader"
      },
      ...defaultWebpackConfig.module.rules
    ]
  },
  output: {
    filename: "contentScript.js",
    path: path.resolve(__dirname, "build", "chrome")
  },
  plugins: [
    ...defaultWebpackConfig.plugins,
    new CopyWebpackPlugin([
      {
        from: path.resolve(__dirname, "chrome", "manifest.json"),
        to: path.resolve(__dirname, "build", "chrome")
      }
    ])
  ],
  optimization: {
    minimizer: []
  }
}
