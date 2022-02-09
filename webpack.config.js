const path = require("path")
const webpack = require("webpack")
const {env} = process

const tsConfigPath = (exports.tsConfigPath = path.join(
    __dirname,
    "tsconfig.json"
))

module.exports = {
  target: "web",
  entry: [
    "core-js/stable",
    "regenerator-runtime/runtime",
    "whatwg-fetch",
    "./src/index.ts"
  ],
  // devtool: 'inline-source-map',
  mode: "production",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: "ts-loader",
          options: {
            configFile: tsConfigPath
          }
        },
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    fallback : {
      fs : false,
      "stream": require.resolve("stream-browserify")
    },
    extensions: [".ts", ".tsx", ".js"],
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
        NODE_ENV: JSON.stringify(env.NODE_ENV) || JSON.stringify('production'),
        WALLETLINK_URL: JSON.stringify(env.WALLETLINK_URL),
        WALLETLINK_VERSION: JSON.stringify(require("./package.json").version)
      }
    })
  ]
}
