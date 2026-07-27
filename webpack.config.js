const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');

module.exports = {
  entry: {
    'cf-presale-single-page': './src/footer/cf-presale-single-page.js',
    'cf-presale-product-page': './src/footer/cf-presale-product-page.js',
  },
  output: {
    path: path.resolve(__dirname, 'dist/footer'),
    filename: '[name].js',
    clean: true,
  },
  plugins: [
    new MiniCssExtractPlugin({ filename: '../header/[name].css' }),
  ],
  optimization: {
    minimizer: ['...', new CssMinimizerPlugin()],
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader'],
      },
    ],
  },
};
