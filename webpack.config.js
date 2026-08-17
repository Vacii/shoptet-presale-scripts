const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');

/**
 * Output follows the Shoptet addon repository convention: a flat dist/ with
 * scripts.<slot>.min.js, styles.<slot>.min.css and an assets/ folder that is
 * copied to the addon CDN as-is. Assets are referenced through imports so
 * webpack rewrites their URLs; publicPath 'auto' resolves them at runtime from
 * the location of the deployed script itself.
 */
module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  const min = isProduction ? '.min' : '';

  return {
    entry: {
      [`scripts.footer${min}`]: [
        './src/footer/cf-presale-single-page.js',
        './src/footer/cf-presale-product-page.js',
      ],
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',
      publicPath: 'auto',
      clean: true,
    },
    plugins: [
      new MiniCssExtractPlugin({ filename: `styles.header${min}.css` }),
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
        {
          test: /\.(png|jpe?g|gif|svg|woff2?|ttf|eot)$/,
          type: 'asset/resource',
          generator: {
            filename: 'assets/[name][ext]',
          },
        },
      ],
    },
  };
};
