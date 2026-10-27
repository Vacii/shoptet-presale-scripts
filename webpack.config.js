import path from 'node:path';
import { fileURLToPath } from 'node:url';

import CssMinimizerPlugin from 'css-minimizer-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';

const here = path.dirname(fileURLToPath(import.meta.url));

/*
 * This build is mirrored into the Shoptet-linked addon repository, where Shoptet's own
 * pipeline runs `yarn build` and ships `dist/` to the merchants' custom codes. Two things
 * follow: the config has to stay buildable on its own, and the output has to use the names
 * the Addon Repository deploys from a flat `dist/`: `styles.header.min.css` for the header
 * slot and `scripts.footer.min.js` for the footer slot. Any other name is not deployed.
 * See https://github.com/shoptet/create-visual-addon-boilerplate.
 *
 * One bundle, not one per page type. Custom codes have no page targeting, so every file
 * we produce loads on every page of the shop; splitting it would only duplicate the
 * shared modules into both files. What decides the cost is the total, so there is one.
 */
export default (_env, argv) => ({
  entry: { 'cf-presale': './src/index.js' },
  output: {
    path: path.resolve(here, 'dist'),
    filename: 'scripts.footer.min.js',
    // Cleaning the whole of dist, not just the JS directory. The previous config set
    // `output.path` to dist/footer, so the extracted CSS landed outside the cleaned
    // directory and stale files accumulated there forever.
    clean: true,
  },
  plugins: [new MiniCssExtractPlugin({ filename: 'styles.header.min.css' })],
  optimization: { minimizer: ['...', new CssMinimizerPlugin()] },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            babelrc: false,
            configFile: false,
            // Keep the shipped syntax within the webpack target. In particular, webpack's
            // `target` does not transpile optional chaining or nullish coalescing itself.
            presets: [
              [
                '@babel/preset-env',
                {
                  bugfixes: true,
                  modules: false,
                  targets: {
                    chrome: '58',
                    edge: '15',
                    firefox: '54',
                    safari: '10.1',
                  },
                },
              ],
            ],
          },
        },
      },
      { test: /\.css$/, use: [MiniCssExtractPlugin.loader, 'css-loader'] },
    ],
  },
  target: ['web', 'es2017'],
  performance: {
    // Only in the build that ships. An unminified development bundle is three times the
    // size by construction, and failing the watch build on that says nothing.
    hints: argv?.mode === 'production' ? 'error' : false,
    // This runs on every page of somebody else's shop. The previous bundle pulled in
    // Swiper for three carousels — 166 kB of JS and 24 kB of CSS on every page view of
    // every installed e-shop.
    maxAssetSize: 40 * 1024,
    maxEntrypointSize: 60 * 1024,
  },
  // No source maps. Shoptet's pipeline uploads the whole of `dist/`, so a map would only
  // publish the original source next to the bundle. Debug with `--mode development`.
  devtool: false,
});
