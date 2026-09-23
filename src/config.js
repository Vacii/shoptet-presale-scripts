/**
 * Getting the merchant's configuration, without asking our server for it.
 *
 * The addon writes the configuration into the shop's own `<head>` through Shoptet's
 * template-include API, so the common case is reading a `<script type="application/json">`
 * that is already in the document: no request, no waiting, no layout shift. See
 * `docs/config-delivery.md`.
 *
 * Every page reads only the snippet Shoptet placed in the shop's own document. Missing,
 * partial or disabled snippets fail closed. The landing-page delivery is deferred until
 * it can be hosted by Shoptet as well.
 */

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
 * @typedef {object} PresaleConfig
 * @property {number} [v]
 * @property {number} [eshopId]
 * @property {ReadonlyArray<PresaleCampaign>} products
 * @property {string | null} [landingPath]
 * @property {StorefrontTheme} [theme]
 * @property {boolean} [partial]
 * @property {boolean} [disabled]
 */

/**
 * Validate the inline shape and give back one.
 *
 * The inline snippet may carry a landing path for backend compatibility, but landing
 * rendering is disabled until its delivery is redesigned for Shoptet.
 *
 * @param {unknown} value
 * @returns {PresaleConfig | null}
 */
function asConfig(value) {
  if (!value || typeof value !== 'object') return null;
  const record = /** @type {{ products?: unknown }} */ (value);
  if (!Array.isArray(record.products)) return null;

  return /** @type {PresaleConfig} */ (value);
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
 * The product-page configuration, from the document only.
 *
 * A partial snippet is not safe for a product page: it can omit a campaign that should
 * be shown, and fetching the rest would violate the product-page no-network contract.
 * Returning `null` fails closed until the backend publishes a complete replacement. The
 * disabled marker is also rejected explicitly so a future marker can omit `partial`
 * without accidentally becoming accepted product config.
 *
 * @returns {PresaleConfig | null}
 */
export function loadProduct() {
  const inline = readInline();
  return inline && !inline.partial && !inline.disabled ? inline : null;
}

/**
 * Read a complete inline configuration for catalogue pages.
 * @returns {PresaleConfig | null}
 */
export function load() {
  const inline = readInline();
  if (inline && !inline.partial && !inline.disabled) return inline;
  return null;
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
