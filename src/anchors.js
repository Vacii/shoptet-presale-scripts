/**
 * Finding the main product's own elements on a detail page, and deciding where the
 * widget goes.
 *
 * Checked against the product detail markup of Classic, Disco, Samba, Step, Tango and
 * Techno. Two things hold across all of them:
 *
 * - Related and alternative products are rendered inside `.p-detail` too, as tiles with
 *   their own conversion button. A tile always carries `data-micro-identifier`, so
 *   anything inside one belongs to another product and is skipped.
 * - The price, quantity and conversion button sit together in one purchase block. The
 *   widget goes directly before that block and never inside it, so the template's own
 *   layout, Shoptet's variant and price scripts, and other addons find the block exactly
 *   where they left it.
 */

/** The detail page's product area. Nothing outside it is touched. */
const PRODUCT_SCOPE = '.p-detail';

/** Marks a product tile; anything inside one belongs to a different product. */
const TILE = '[data-micro-identifier]';

/**
 * The purchase block, from the most specific wrapper to the bare button. Disco, Samba and
 * Step use `.p-to-cart-block`, Techno lists variants in `.variant-table`, and Classic and
 * Tango have only `.add-to-cart`.
 */
const PURCHASE_BLOCKS = ['.p-to-cart-block', '.variant-table', '.add-to-cart'];

/**
 * Where the widget goes when the product has no purchase block at all, for instance
 * because it cannot be ordered. It is inserted after the first match.
 */
const FALLBACK_ANCHORS = ['.p-price-wrapper', '.detail-parameters', '.p-short-description'];

/** Where the product's availability is printed. */
const AVAILABILITY_ANCHORS = [
  '.availability-label',
  '.availability-value span',
  '.availability span',
];

/** The conversion button, whose label becomes "pre-order". */
const CONVERSION_BUTTONS = [
  'button.add-to-cart-button',
  '.add-to-cart button[type="submit"]',
  'button.btn-conversion',
];

/**
 * @param {Element} node
 * @returns {boolean}
 */
function isOwn(node) {
  return node.closest(TILE) === null;
}

/**
 * Every element of the main product matching one of the selectors, in document order.
 *
 * @param {ReadonlyArray<string>} selectors
 * @returns {HTMLElement[]}
 */
function ownElements(selectors) {
  const scope = document.querySelector(PRODUCT_SCOPE);
  if (!scope) return [];
  return Array.from(scope.querySelectorAll(selectors.join(','))).filter(
    /** @returns {node is HTMLElement} */ (node) => node instanceof HTMLElement && isOwn(node),
  );
}

/**
 * The first element of the main product for the first selector that has one.
 *
 * @param {ReadonlyArray<string>} selectors
 * @returns {HTMLElement | null}
 */
function firstOwn(selectors) {
  for (const selector of selectors) {
    const [found] = ownElements([selector]);
    if (found) return found;
  }
  return null;
}

/**
 * Whether `node` lays its children out side by side. The widget is a full-width block,
 * and dropping it into such a row would squeeze it next to the price.
 *
 * @param {HTMLElement} node
 * @returns {boolean}
 */
function isRow(node) {
  if (node.classList.contains('row')) return true;
  const style = window.getComputedStyle(node);
  if (style.display.endsWith('grid')) return true;
  return style.display.endsWith('flex') && !style.flexDirection.startsWith('column');
}

/**
 * The purchase block as one unit. Tango puts `.add-to-cart` in a Bootstrap `.row` beside
 * the price, so the unit grows to that row; the product form itself is never crossed.
 *
 * @param {HTMLElement} block
 * @returns {HTMLElement}
 */
function purchaseUnit(block) {
  let unit = block;
  let parent = unit.parentElement;
  while (parent && parent.tagName !== 'FORM' && !parent.matches(PRODUCT_SCOPE) && isRow(parent)) {
    unit = parent;
    parent = unit.parentElement;
  }
  return unit;
}

/**
 * Where the widget goes: directly before the purchase block, or after a fallback anchor.
 *
 * @returns {{ node: HTMLElement, position: 'beforebegin' | 'afterend' } | null}
 */
export function widgetPlacement() {
  const block = firstOwn(PURCHASE_BLOCKS);
  if (block) return { node: purchaseUnit(block), position: 'beforebegin' };
  const anchor = firstOwn(FALLBACK_ANCHORS);
  return anchor ? { node: purchaseUnit(anchor), position: 'afterend' } : null;
}

/** @returns {HTMLElement | null} */
export function availabilityLabel() {
  return firstOwn(AVAILABILITY_ANCHORS);
}

/**
 * All of the product's conversion buttons. Tango renders one for wide and one for narrow
 * screens, and Techno one per variant row.
 *
 * @returns {HTMLElement[]}
 */
export function conversionButtons() {
  return ownElements(CONVERSION_BUTTONS);
}
