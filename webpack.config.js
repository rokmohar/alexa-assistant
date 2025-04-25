const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
  target: "node",
  mode: "production",
  entry: "./src/index.ts",
  resolve: {
    extensions: [".json", ".js", ".ts"],
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
        test: /\.(m?js|node)$/,
        parser: { amd: false },
        loader: "@vercel/webpack-asset-relocator-loader",
      },
    ],
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { from: "package.json", to: "package.json" },
        //{
        //  from: "node_modules/**/*.node",
        //  to: "[path][name][ext]",
        //}
      ],
    }),
  ],
  externals: {
    //"bindings": "commonjs bindings",
  }
};
