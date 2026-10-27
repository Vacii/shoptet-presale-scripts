/**
 * Getting the merchant's configuration, without asking our server for it.
 *
 * The addon writes the configuration into the shop's own `<head>` through Shoptet's
 * template-include API, so the common case is reading a `<script type="application/json">`
 * that is already in the document: no request, no waiting, no layout shift. README.md
 * describes the payload.
 *
 * The complete configuration, including the published landing page, must fit in the
 * 8192-character snippet. The admin API rejects saves that would exceed that limit.
 */

import { parseInstant } from './countdown.js';

export const SNIPPET_ID = 'cfp-config';

/**
 * @typedef {object} StorefrontTheme
 * @property {string | null} [accentColor]
 */

/**
 * @typedef {object} PresaleCampaign
 * @property {string} productGuid
 * @property {string | null} [startsAt]
 * @property {string | null} [endsAt]
 * @property {string | null} [bannerText]
 * @property {string | null} [infoText]
 * @property {string | null} [discountCode]
 * @property {number | null} [discountPercent]
 * @property {boolean} [inStock]
 */

/**
 * @typedef {{ block: { type?: string } & Record<string, unknown> }} LandingEntry
 */

/**
 * @typedef {object} LandingConfig
 * @property {string} urlPath
 * @property {string | null} [title]
 * @property {string | null} [endsAt]
 * @property {ReadonlyArray<LandingEntry>} blocks
 */

/**
 * @typedef {object} PresaleConfig
 * @property {ReadonlyArray<PresaleCampaign>} products
 * @property {LandingConfig | null} [landing]
 * @property {StorefrontTheme} [theme]
 * @property {boolean} [partial]
 * @property {boolean} [disabled]
 */

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * @param {unknown} entry
 * @returns {entry is PresaleCampaign}
 */
function isCampaign(entry) {
  return isRecord(entry) && typeof entry.productGuid === 'string' && entry.productGuid !== '';
}

/**
 * @param {unknown} entry
 * @returns {entry is LandingEntry}
 */
function isLandingEntry(entry) {
  return isRecord(entry) && isRecord(entry.block);
}

/**
 * @param {unknown} value
 * @returns {LandingConfig | null}
 */
function asLanding(value) {
  if (!isRecord(value) || typeof value.urlPath !== 'string' || value.urlPath === '') {
    return null;
  }
  const blocks = Array.isArray(value.blocks) ? value.blocks.filter(isLandingEntry) : [];
  return { .../** @type {LandingConfig} */ (value), blocks };
}

/**
 * The one place the payload's shape is checked. A malformed entry is dropped here, so a
 * single `null` campaign or block costs only itself and the rest of the code can rely
 * on what it gets.
 *
 * @param {unknown} value
 * @returns {PresaleConfig | null}
 */
function asConfig(value) {
  if (!isRecord(value) || !Array.isArray(value.products)) return null;
  return {
    .../** @type {PresaleConfig} */ (value),
    products: value.products.filter(isCampaign),
    landing: asLanding(value.landing),
  };
}

/**
 * Read the configuration the addon put into this page.
 * @returns {PresaleConfig | null}
 */
export function readInline() {
  const node = document.getElementById(SNIPPET_ID);
  if (!node || !node.textContent) return null;
  try {
    return asConfig(JSON.parse(node.textContent));
  } catch {
    return null;
  }
}

/**
 * Read the complete configuration from the document. Missing, partial and disabled
 * snippets fail closed without making a request to CustomerFlow.
 * @returns {PresaleConfig | null}
 */
export function load() {
  const inline = readInline();
  return inline && !inline.partial && !inline.disabled ? inline : null;
}

/**
 * Campaigns that should be on screen right now.
 *
 * The snippet ships campaigns that have not started yet, because it may be sitting in a
 * page that was cached before one began. Deciding here is what lets a campaign start and
 * end at the right moment inside a page nobody reloaded.
 *
 * @param {PresaleConfig | null} config
 * @param {Date} [now]
 * @returns {ReadonlyArray<PresaleCampaign>}
 */
export function activeCampaigns(config, now = new Date()) {
  if (!config) return [];
  const at = now.getTime();
  return config.products.filter((campaign) => {
    const starts = parseInstant(campaign.startsAt);
    const ends = parseInstant(campaign.endsAt);
    if (starts !== null && starts > at) return false;
    if (ends !== null && ends <= at) return false;
    return true;
  });
}

/**
 * The landing page, unless its pre-sale is over. The server stops publishing a page once
 * it ends; this covers the snippet that is still cached in a page after that moment.
 *
 * @param {PresaleConfig | null} config
 * @param {Date} [now]
 * @returns {LandingConfig | null}
 */
export function activeLanding(config, now = new Date()) {
  const landing = config?.landing ?? null;
  if (!landing) return null;
  const ends = parseInstant(landing.endsAt);
  return ends !== null && ends <= now.getTime() ? null : landing;
}
