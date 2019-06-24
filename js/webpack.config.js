const path = require("path")
const webpack = require("webpack")
const { env } = process

const tsConfigPath = (exports.tsConfigPath = path.join(
  __dirname,
  "tsconfig.json"
))

module.exports = {
  target: "web",
  entry: [
    "core-js/shim",
    "core-js/modules/es7.object.entries",
    "core-js/modules/es7.object.values",
    "regenerator-runtime/runtime",
    "./src/index.ts"
  ],
  // devtool: 'inline-source-map',
  mode: "production",
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: {
          loader: "ts-loader",
          options: {
            configFile: tsConfigPath
          }
        },
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: "raw-loader"
      }
    ]
  },
  resolve: {
    extensions: [".ts", ".js"],
    plugins: [],
    symlinks: false
  },
  output: {
    filename: "walletlink.js",
    path: path.resolve(__dirname, "build")
  },
  performance: {
    hints: false
  },
  plugins: [
    new webpack.DefinePlugin({
      "process.env": {
        NODE_ENV: JSON.stringify(env.NODE_ENV),
        WALLETLINK_WEB_URL: JSON.stringify(env.WALLETLINK_WEB_URL)
      }
    })
  ]
}
