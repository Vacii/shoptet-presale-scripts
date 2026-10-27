/**
 * Everything this bundle knows about the shop it is running inside.
 *
 * Shoptet defines `getShoptetDataLayer` on every storefront page before custom codes run,
 * so it is called directly. This module is the only place that reads it, which keeps the
 * rest of the bundle testable without a shop around it.
 */

/** @type {ReadonlyArray<string>} */
const SUPPORTED_LANGUAGES = ['cs', 'sk', 'en', 'hu'];

/** @returns {string} */
export function pageType() {
  const value = getShoptetDataLayer('pageType');
  return typeof value === 'string' ? value : '';
}

/** The guid of the product whose detail page is open, if this is one. @returns {string} */
export function currentProductGuid() {
  const product = getShoptetDataLayer('product');
  if (product && typeof product === 'object' && 'guid' in product) {
    const guid = /** @type {{ guid?: unknown }} */ (product).guid;
    if (typeof guid === 'string') return guid;
  }
  return '';
}

/**
 * The shop's language, for our own strings. A language we have no strings for gets
 * English, which a German or Polish customer is far more likely to read than Czech.
 *
 * @returns {'cs' | 'sk' | 'en' | 'hu'}
 */
export function language() {
  const candidate = String(getShoptetDataLayer('language') ?? '')
    .slice(0, 2)
    .toLowerCase();
  return /** @type {'cs' | 'sk' | 'en' | 'hu'} */ (
    SUPPORTED_LANGUAGES.includes(candidate) ? candidate : 'en'
  );
}

/**
 * Run `handler` now if the document is ready, and again after every Shoptet DOM update.
 *
 * Filtering the catalogue, infinite scroll and changing a variant all replace parts of
 * the page, and Shoptet announces each of them with `ShoptetDOMContentLoaded`. Handlers
 * therefore have to be idempotent — see `claim` in dom.js.
 *
 * @param {() => void} handler
 */
export function onContentReady(handler) {
  const safely = () => {
    try {
      handler();
    } catch {
      // One broken template must not stop the handler from running after the next
      // update, and it must never surface in the merchant's console.
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', safely, { once: true });
  } else {
    safely();
  }

  document.addEventListener('ShoptetDOMContentLoaded', safely);
}
