/**
 * Everything this bundle knows about the shop it is running inside.
 *
 * Every global here is optional. The previous version called `getShoptetDataLayer(...)`
 * and read `shoptet.design.template.name` directly, so on any template or page that does
 * not define them the whole listener died on a ReferenceError before it rendered
 * anything — silently, from the merchant's point of view.
 */

/** @type {ReadonlyArray<string>} */
const SUPPORTED_LANGUAGES = ['cs', 'sk', 'en', 'hu'];

/**
 * @param {string} key
 * @returns {unknown}
 */
function dataLayerValue(key) {
  const read = /** @type {undefined | ((k: string) => unknown)} */ (
    /** @type {any} */ (window).getShoptetDataLayer
  );
  if (typeof read !== 'function') return undefined;
  try {
    return read(key);
  } catch {
    // Shoptet's own helper throwing is not something we can do anything about, and it
    // must not take the rest of the bundle down with it.
    return undefined;
  }
}

/** @returns {string} */
export function pageType() {
  const value = dataLayerValue('pageType');
  return typeof value === 'string' ? value : '';
}

/** @returns {number | null} */
export function projectId() {
  const value = dataLayerValue('projectId');
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

/** The guid of the product whose detail page is open, if this is one. @returns {string} */
export function currentProductGuid() {
  const product = dataLayerValue('product');
  if (product && typeof product === 'object' && 'guid' in product) {
    const guid = /** @type {{ guid?: unknown }} */ (product).guid;
    if (typeof guid === 'string') return guid;
  }
  return '';
}

/** @returns {string} */
export function templateName() {
  const design = /** @type {any} */ (window).shoptet?.design;
  const name = design?.template?.name;
  return typeof name === 'string' ? name : '';
}

/**
 * The shop's language, for our own strings.
 * @returns {'cs' | 'sk' | 'en' | 'hu'}
 */
export function language() {
  const fromShoptet = /** @type {any} */ (window).shoptet?.config?.language;
  const fromDocument = document.documentElement.lang;
  const candidate = String(fromShoptet || fromDocument || '')
    .slice(0, 2)
    .toLowerCase();
  return /** @type {'cs' | 'sk' | 'en' | 'hu'} */ (
    SUPPORTED_LANGUAGES.includes(candidate) ? candidate : 'cs'
  );
}

/**
 * Run `handler` now if the document is ready, and again after every Shoptet DOM update.
 *
 * Filtering the catalogue, infinite scroll and changing a variant all replace parts of
 * the page. The previous version listened only for `DOMContentLoaded`, so anything it had
 * inserted disappeared on the first interaction and never came back. Handlers therefore
 * have to be idempotent — see `markProcessed` in dom.js.
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

  for (const event of ['ShoptetDOMContentLoaded', 'ShoptetDOMPageContentLoaded']) {
    document.addEventListener(event, safely);
  }
}
