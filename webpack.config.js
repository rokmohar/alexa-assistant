const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");

const requiredProtoFiles = ['google/api/annotations.proto', 'google/api/http.proto', 'google/assistant/embedded/v1alpha2/embedded_assistant.proto', 'google/type/latlng.proto'];

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
    ],
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { from: "package.json", to: "package.json" },
        ...requiredProtoFiles.map((file) => ({
          from: path.resolve(__dirname, "node_modules/google-proto-files", file),
          to: file,
        })),
      ],
    }),
  ],
  externals: {},
};
