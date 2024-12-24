const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
  target: "node",
  mode: "production",
  entry: "./src/index.ts",
  resolve: {
    extensions: [".json", ".js", ".ts"],
    alias: {
      punycode: 'tr46'
    }
  },
  optimization: {
    minimize: false,
  },
  output: {
    path: path.join(__dirname, "dist"),
    filename: "index.js",
  },
  module: {
    rules: [
      {
        test: /\.(ts|js)$/,
        parser: { amd: false },
        exclude: /node_modules/,
        loader: "babel-loader",
      },
      {
        test: /\.(m?js)$/,
        parser: { amd: false },
        use: {
          loader: "@vercel/webpack-asset-relocator-loader",
          options: {
            outputAssetBase: "native_modules",
            production: true,
          },
        },
      },
    ],
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { from: "package.json", to: "package.json" },
        { 
          from: "node_modules/**/*.node",
          to: "[path][name][ext]",
        }
      ],
    }),
  ],
  externals: {
    "bindings": "commonjs bindings",
    "tr46": "commonjs tr46"
  }
};
