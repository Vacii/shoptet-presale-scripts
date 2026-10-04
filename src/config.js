/**
 * Getting the merchant's configuration, without asking our server for it.
 *
 * The addon writes the configuration into the shop's own `<head>` through Shoptet's
 * template-include API, so the common case is reading a `<script type="application/json">`
 * that is already in the document: no request, no waiting, no layout shift. See
 * `docs/config-delivery.md`.
 *
 * The complete configuration, including the published landing page, must fit in the
 * 8192-character snippet. The admin API rejects saves that would exceed that limit.
 */

import { normalisePath } from './url.js';

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
 * @property {string | null} [availabilityLabel]
 */

/**
 * @typedef {object} LandingConfig
 * @property {string} urlPath
 * @property {string | null} [title]
 * @property {string | null} [endsAt]
 * @property {ReadonlyArray<{ block: unknown }>} [blocks]
 */

/**
 * @typedef {object} PresaleConfig
 * @property {number} [v]
 * @property {number} [eshopId]
 * @property {ReadonlyArray<PresaleCampaign>} products
 * @property {string | null} [landingPath]
 * @property {LandingConfig | null} [landing]
 * @property {StorefrontTheme} [theme]
 * @property {boolean} [partial]
 * @property {boolean} [disabled]
 */

/**
 * Validate the inline payload and derive a path for existing callers.
 *
 * @param {unknown} value
 * @returns {PresaleConfig | null}
 */
function asConfig(value) {
  if (!value || typeof value !== 'object') return null;
  const record = /** @type {{ products?: unknown, landing?: LandingConfig | null }} */ (value);
  if (!Array.isArray(record.products)) return null;

  const config = /** @type {PresaleConfig} */ (value);
  if (!config.landingPath && record.landing?.urlPath) {
    config.landingPath = record.landing.urlPath;
  }
  return config;
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
 * The landing page's blocks.
 *
 * Landing pages are included in the same bounded inline payload as the campaign bars.
 * @param {PresaleConfig | null} config
 * @returns {LandingConfig | null}
 */
export function loadLanding(config) {
  return config?.landing ?? null;
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
    const starts = campaign.startsAt ? Date.parse(campaign.startsAt) : null;
    const ends = campaign.endsAt ? Date.parse(campaign.endsAt) : null;
    if (starts !== null && !Number.isNaN(starts) && starts > at) return false;
    if (ends !== null && !Number.isNaN(ends) && ends <= at) return false;
    return true;
  });
}

/**
 * @param {PresaleConfig | null} config
 * @returns {string | null}
 */
export function landingPath(config) {
  const path = config?.landingPath ?? config?.landing?.urlPath;
  return typeof path === 'string' && path !== '' ? normalisePath(path) : null;
}
