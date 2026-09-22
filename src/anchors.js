/**
 * Deciding where the bar goes.
 *
 * The previous version had a map of six template names and `return`ed for anything else,
 * so Waterfall, Tokyo, Rock, Pop and every custom template got nothing — and worse, the
 * code after it dereferenced the element it had just failed to insert, so the script died
 * on a TypeError before the catalogue handling ran.
 *
 * What replaces it: the known templates keep their exact anchor, and everything else
 * falls through an ordered list of candidates. First match wins; no match means the bar
 * is not rendered and nothing else happens.
 */

import { queryFirst } from './dom.js';

/**
 * Anchors that produced the best placement on the templates we have seen.
 * @type {Record<string, string | undefined>}
 */
const TEMPLATE_ANCHORS = {
  Classic: '.add-to-cart',
  Samba: '.p-price-wrapper',
  Step: '.p-basic-info-block',
  Tango: '.p-short-description',
  Techno: '.detail-parameters.second',
  Disco: '.p-detail-inner .detail-parameters',
};

/**
 * Ordered from "closest to the buy button" outwards. Anything that gets us into the
 * product's information column is better than not rendering.
 */
export const PRODUCT_ANCHORS = [
  '.add-to-cart',
  '.p-price-wrapper',
  '.p-final-price-wrapper',
  '.p-basic-info-block',
  '.detail-parameters',
  '.p-short-description',
  '.p-detail-inner',
  '.p-detail',
];

/**
 * @param {string} template
 * @param {ParentNode} [root]
 * @returns {HTMLElement | null}
 */
export function resolveProductAnchor(template, root = document) {
  const preferred = TEMPLATE_ANCHORS[template];
  const candidates = preferred ? [preferred, ...PRODUCT_ANCHORS] : PRODUCT_ANCHORS;
  return queryFirst(root, candidates);
}

/** Where a product's availability is printed on a detail page. */
export const AVAILABILITY_ANCHORS = [
  '.availability-label',
  '.availability-value span',
  '.availability span',
  '.p-detail-info .availability',
];

/** The conversion button, whose label becomes "pre-order". */
export const ADD_TO_CART_ANCHORS = [
  'button.add-to-cart-button',
  '.add-to-cart button[type="submit"]',
  'button.btn-conversion',
];
