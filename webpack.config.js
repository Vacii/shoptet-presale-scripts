import path from 'node:path';
import { fileURLToPath } from 'node:url';

import CssMinimizerPlugin from 'css-minimizer-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';

const here = path.dirname(fileURLToPath(import.meta.url));

/*
 * This build is mirrored into the Shoptet-linked addon repository, where Shoptet's own
 * pipeline runs `yarn build` and ships `dist/` to the merchants' custom codes. Two things
 * follow: the config has to stay buildable on its own, and the output layout has to match
 * what the Codes tab expects — CSS in the header slot, JS in the footer slot.
 *
 * One bundle, not one per page type. Custom codes have no page targeting, so every file
 * we produce loads on every page of the shop; splitting it would only duplicate the
 * shared modules into both files. What decides the cost is the total, so there is one.
 */
export default (_env, argv) => ({
  entry: { 'cf-presale': './src/index.js' },
  output: {
    path: path.resolve(here, 'dist'),
    filename: 'footer/[name].js',
    // Cleaning the whole of dist, not just the JS directory. The previous config set
    // `output.path` to dist/footer, so the extracted CSS landed outside the cleaned
    // directory and stale files accumulated there forever.
    clean: true,
  },
  plugins: [new MiniCssExtractPlugin({ filename: 'header/[name].css' })],
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
  // `hidden-source-map`, not `source-map`: the map is generated, but no
  // `//# sourceMappingURL=` comment is appended to the bundle. Shoptet's pipeline copies
  // only `dist/` into the merchants' code slots, so that comment shipped into every page
  // of every installed shop pointing at a file that never followed it there.
  devtool: 'hidden-source-map',
});
