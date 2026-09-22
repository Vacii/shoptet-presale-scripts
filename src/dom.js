/**
 * Building DOM without `innerHTML`.
 *
 * Every string in the configuration is typed by a merchant, and it lands in their own
 * shop's pages. The previous bundle had thirteen `innerHTML`/`insertAdjacentHTML` sinks
 * fed straight from that configuration, so a discount code containing markup executed.
 * Nothing here interpolates strings into HTML: structure comes from `createElement`,
 * content from `textContent`.
 */

import { safeUrl } from './url.js';

/**
 * @param {string} tag
 * @param {{ className?: string, text?: string, attrs?: Record<string, string> }} [options]
 * @param {ReadonlyArray<Node>} [children]
 * @returns {HTMLElement}
 */
export function el(tag, options = {}, children = []) {
  const node = document.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.text !== undefined) node.textContent = options.text;
  for (const [name, value] of Object.entries(options.attrs ?? {})) {
    node.setAttribute(name, value);
  }
  for (const child of children) node.appendChild(child);
  return node;
}

/**
 * Point an element at a URL, or leave it unlinked if the URL is not one we allow.
 *
 * @param {HTMLElement} node
 * @param {'href' | 'src'} attribute
 * @param {string | null | undefined} value
 * @returns {boolean} whether the URL was accepted
 */
export function setUrl(node, attribute, value) {
  const url = safeUrl(value);
  if (!url) return false;
  node.setAttribute(attribute, url);
  return true;
}

/**
 * Write text only when it actually differs.
 *
 * The countdown ticks every second; replacing identical text would still invalidate
 * layout and fight the screen reader that is in the middle of announcing it.
 *
 * @param {Element | null | undefined} node
 * @param {string} text
 */
export function setText(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

/**
 * Replace an element's own words while leaving its children alone.
 *
 * `setText` is `textContent`, which removes everything inside the node — including the
 * `<i class="icon-cart">` most templates put in their conversion button, and the price
 * span some put in the availability line. This rewrites the first non-empty text node
 * instead, keeping the whitespace around it so the icon does not end up glued to the
 * word, and blanks any further text nodes so nothing is left doubled.
 *
 * @param {Element | null | undefined} node
 * @param {string} text
 */
export function setLabel(node, text) {
  if (!node) return;

  const words = Array.from(node.childNodes).filter(
    (child) => child.nodeType === 3 && (child.textContent ?? '').trim() !== '',
  );

  if (words.length === 0) {
    node.appendChild(node.ownerDocument.createTextNode(text));
    return;
  }

  const [first, ...rest] = words;
  const original = /** @type {ChildNode} */ (first).textContent ?? '';
  const padding = original.match(/^(\s*)[\s\S]*?(\s*)$/);
  const next = `${padding?.[1] ?? ''}${text}${padding?.[2] ?? ''}`;
  if (original !== next) /** @type {ChildNode} */ (first).textContent = next;
  for (const extra of rest) extra.textContent = '';
}

/**
 * The words an element shows, without its children's.
 *
 * @param {Element} node
 * @returns {string}
 */
export function labelOf(node) {
  return Array.from(node.childNodes)
    .filter((child) => child.nodeType === 3)
    .map((child) => child.textContent ?? '')
    .join('')
    .trim();
}

/**
 * First element matching any of the selectors, in order of preference.
 *
 * @param {ParentNode} root
 * @param {ReadonlyArray<string>} selectors
 * @returns {HTMLElement | null}
 */
export function queryFirst(root, selectors) {
  for (const selector of selectors) {
    try {
      const found = root.querySelector(selector);
      if (found instanceof HTMLElement) return found;
    } catch {
      // A selector a given browser refuses to parse should not stop the ones after it.
    }
  }
  return null;
}

/**
 * Mark a node as handled, and report whether it already was.
 *
 * This is what makes the handlers safe to re-run after every Shoptet DOM update: the
 * work happens once per node, however many times the event fires.
 *
 * @param {HTMLElement} node
 * @param {string} flag
 * @returns {boolean} true when this call is the first
 */
export function claim(node, flag) {
  const attribute = `data-cfp-${flag}`;
  if (node.hasAttribute(attribute)) return false;
  node.setAttribute(attribute, '1');
  return true;
}

/**
 * Escape a value for use inside an attribute selector.
 *
 * A product guid goes straight into `[data-micro-identifier="…"]`. `CSS.escape` is not
 * available in every browser Shoptet supports, so fall back to escaping the quote.
 *
 * @param {string} value
 * @returns {string}
 */
export function escapeSelectorValue(value) {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value);
  }
  return value.replace(/["\\]/g, '\\$&');
}
