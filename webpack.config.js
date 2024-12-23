const path = require("path");

module.exports = {
  target: "node",
  mode: "production",
  entry: "./src/index.ts",
  //devtool: 'source-map',
  resolve: {
    extensions: [".json", ".js", ".ts", "...", ".node"],
  },
  optimization: {
    minimize: false
  },
  node: {
    __dirname: false,
  },
  output: {
    path: path.join(__dirname, "dist"),
    filename: "index.js"
  },
  module: {
    rules: [
      {
        test: /\.(ts|js)$/,
        exclude: /node_modules/,
        loader: "babel-loader",
      },
      {
        test: /\.node$/,
        loader: "node-loader",
      },
      {
        test: /\.(m?js|node|gyp)$/,
        loader: '@vercel/webpack-asset-relocator-loader',
      }
    ],
  },
};
