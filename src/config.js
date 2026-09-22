/**
 * Getting the merchant's configuration, without asking our server for it.
 *
 * The addon writes the configuration into the shop's own `<head>` through Shoptet's
 * template-include API, so the common case is reading a `<script type="application/json">`
 * that is already in the document: no request, no waiting, no layout shift. See
 * `docs/config-delivery.md`.
 *
 * The fetch is the fallback — the window right after an install, a failed write, or the
 * remainder of a configuration that did not fit the 8192-character snippet.
 */

import { normalisePath } from './url.js';

export const SNIPPET_ID = 'cfp-config';

/**
 * Where the fallback fetch goes.
 *
 * `__CFP_API_ORIGIN__` is substituted by DefinePlugin and is an empty string in a normal
 * build, so production needs no environment at all. Set `CFP_API_ORIGIN` to point a
 * development build at a local API:
 *
 *     CFP_API_ORIGIN=http://localhost:8000 pnpm --filter storefront dev
 */
const API_ORIGIN =
  (typeof __CFP_API_ORIGIN__ === 'string' && __CFP_API_ORIGIN__) || 'https://customerflow.cz';

const FETCH_TIMEOUT_MS = 3000;
const CACHE_KEY = 'cfp-config';
const CACHE_TTL_MS = 60 * 1000;

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
 */

/**
 * Accept either shape and give back one.
 *
 * The inline snippet carries `landingPath` — a string is all that fits in 8192 characters
 * alongside the campaigns. The API returns the whole `landing` object, blocks included.
 * Deriving one from the other here means nothing downstream has to know which source it
 * is looking at.
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
 * @param {number} eshopId
 * @returns {Promise<PresaleConfig | null>}
 */
async function fetchRemote(eshopId) {
  const cached = readCache();
  if (cached) return cached;

  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_ORIGIN}/public/v1/config/${eshopId}`, {
      signal: controller.signal,
      credentials: 'omit',
    });
    // The previous version's entire error strategy was `.catch(() => null)`, so a 500 or
    // an HTML error page parsed as "no campaigns" and the bar just vanished.
    if (!response.ok) return null;
    const parsed = asConfig(await response.json());
    if (parsed) writeCache(parsed);
    return parsed;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/** @returns {PresaleConfig | null} */
function readCache() {
  try {
    const raw = window.sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { at, config } = JSON.parse(raw);
    if (typeof at !== 'number' || Date.now() - at > CACHE_TTL_MS) return null;
    return asConfig(config);
  } catch {
    return null;
  }
}

/** @param {PresaleConfig} config */
function writeCache(config) {
  try {
    window.sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), config }));
  } catch {
    // Private mode and full quotas both throw here. The cache is an optimisation.
  }
}

/**
 * The configuration for this page, from the document if it is there and from the API if
 * it is not.
 *
 * @param {number | null} eshopId
 * @returns {Promise<PresaleConfig | null>}
 */
export async function load(eshopId) {
  const inline = readInline();
  // `partial` means the snippet hit its character limit and campaigns were trimmed off
  // the end, so the full list has to come from the API.
  if (inline && !inline.partial) return inline;
  if (eshopId === null) return inline;

  const remote = await fetchRemote(eshopId);
  return remote ?? inline;
}

/**
 * The landing page's blocks.
 *
 * These never fit the inline snippet — media URLs, FAQ answers and USP copy are far past
 * 8192 characters, and inflating every page of a shop to serve one page would be a poor
 * trade even if they did. So this is one request, on one page, only when a visitor is
 * actually standing on it.
 *
 * @param {number | null} eshopId
 * @returns {Promise<LandingConfig | null>}
 */
export async function loadLanding(eshopId) {
  const inline = readInline();
  if (inline?.landing) return inline.landing;
  if (eshopId === null) return null;
  return (await fetchRemote(eshopId))?.landing ?? null;
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
  const path = config?.landingPath;
  return typeof path === 'string' && path !== '' ? normalisePath(path) : null;
}
