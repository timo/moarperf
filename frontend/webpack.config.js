const path = require("path");

module.exports = {
  entry: [
    "core-js/modules/es6.promise",
    "core-js/modules/es6.array.iterator",
    './index.js'
  ],
  context: path.resolve(__dirname),
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        resolve: { extensions: [".js", ".jsx"] },
        use: {
          loader: "babel-loader"
        }
      }
    ]
  },
  devtool: "eval-source-map",
    output: {
        path: path.resolve(__dirname, '../static/js/'),
        publicPath: "/js/"
    }
};
