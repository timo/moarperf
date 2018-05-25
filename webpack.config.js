const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: './frontend/index.js',
  output: {
    filename: 'index.js',
    chunkFilename: '[name].bundle.js',
    path: path.resolve(__dirname, 'static/js'),
    publicPath: '/js/',
  },
  watch: true,
  resolve: {
    extensions: ['.js', '.jsx'],
  },
  module: {
    loaders: [
      {
        test: /\.js/,
        include: path.resolve(__dirname, 'frontend'),
        loader: 'babel-loader',
      },
    ],
  },
  devtool: "source-map",
  plugins: [
    new HtmlWebpackPlugin({
      title: 'My App',
      filename: 'index.html',
    }),
  ],
};
