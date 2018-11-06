const path = require("path");

module.exports = {
  entry: './index.js',
  context: path.resolve(__dirname, 'frontend'),
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /\.\.\/node_modules/,
        resolve: { extensions: [".js", ".jsx"] },
        use: {
          loader: "babel-loader"
        }
      }
    ]
  },
    output: {
        path: path.resolve(__dirname, 'static/js/'),
        publicPath: "/js/"
    }
};
