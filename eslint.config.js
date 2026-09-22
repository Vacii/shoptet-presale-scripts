import js from '@eslint/js';
import globals from 'globals';

/*
 * Mirrors the rules Shoptet's addon review tool runs, so a rejection surfaces here rather
 * than four weeks into their review queue. Their tool has `complexity` and
 * `max-lines-per-function` as warnings; they are errors here, because a warning nobody
 * reads is how the previous version ended up with a 300-line DOMContentLoaded callback.
 */
export default [
  { ignores: ['dist', 'coverage'] },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        // Shoptet defines these on the storefront. Declared so `no-undef` passes, but
        // every read of them goes through src/shoptet.js, which checks they exist —
        // referencing them directly is what killed the old listener on templates that
        // do not define them.
        shoptet: 'readonly',
        getShoptetDataLayer: 'readonly',
        // Substituted by DefinePlugin at build time; see src/globals.d.ts.
        __CFP_API_ORIGIN__: 'readonly',
      },
    },
    rules: {
      'no-console': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-unused-vars': 'error',
      complexity: ['error', 10],
      'max-lines-per-function': ['error', { max: 50, skipBlankLines: true, skipComments: true }],
      eqeqeq: 'error',
      'no-var': 'error',
      'prefer-const': 'error',
    },
  },
  {
    files: ['test/**/*.js', '*.config.js'],
    languageOptions: { globals: { ...globals.node } },
    rules: { 'max-lines-per-function': 'off', 'no-unused-vars': 'off' },
  },
];
