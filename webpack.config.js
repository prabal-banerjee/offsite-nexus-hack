const path = require('path');

module.exports = {
  context: __dirname,
  entry: {
    duckhunt: './main.js',
  },
  output: {
    path: path.join(__dirname, 'dist'),
    filename: '[name].js',
    clean: false,
  },
  devtool: 'source-map',
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
            cacheDirectory: true,
          },
        },
      },
      {
        test: /\.png$/,
        type: 'asset/resource',
      },
      {
        test: /\.json$/,
        type: 'json',
      },
      {
        test: /\.(mp3|ogg)$/,
        type: 'asset/resource',
      }
    ]
  },
  resolve: {
    modules: ['node_modules'],
    extensions: ['.js', '.min.js'],
  },
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist'),
    },
    compress: true,
    port: 8080,
    hot: true,
  },
};