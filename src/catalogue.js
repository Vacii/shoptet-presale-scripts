/**
 * Marking pre-sale products in a listing.
 *
 * Two things the previous version got wrong here. It found the availability element by
 * comparing the rendered text to the literal string `'Skladem'`, which matches nothing on
 * a Slovak or Hungarian shop and nothing on a Czech one showing `Skladem (3 ks)`. And it
 * put the product's guid straight into an attribute selector, so a guid containing a
 * quote broke the selector.
 */

import { atDeadline, parseInstant } from './countdown.js';
import { claim, el, escapeSelectorValue, labelOf, queryFirst, setLabel } from './dom.js';
import { installTheme } from './theme.js';

/**
 * @typedef {import('./config.js').PresaleCampaign} PresaleCampaign
 * @typedef {import('./config.js').StorefrontTheme} StorefrontTheme
 * @typedef {ReturnType<import('./i18n.js').translator>} Translate
 */

const AVAILABILITY_IN_TILE = ['.availability span', '.availability-label', '.availability'];

/**
 * Every tile for this product. Plural, because a product can appear more than once on a
 * page — in the listing and in a "related products" strip, for instance.
 *
 * @param {string} guid
 * @returns {ReadonlyArray<HTMLElement>}
 */
function tilesFor(guid) {
  const nodes = document.querySelectorAll(`[data-micro-identifier="${escapeSelectorValue(guid)}"]`);
  return Array.from(nodes).filter((node) => node instanceof HTMLElement);
}

/**
 * The tile's availability line says "pre-sale" instead. The line often carries a dot or
 * a stock icon alongside the word; `setLabel` replaces the word and leaves the rest.
 *
 * @param {HTMLElement} tile
 * @param {Translate} t
 * @returns {() => void} puts the original words back
 */
function relabelAvailability(tile, t) {
  const availability = queryFirst(tile, AVAILABILITY_IN_TILE);
  if (!availability) return () => {};

  const original = labelOf(availability);
  setLabel(availability, t('presale'));
  availability.classList.add('cfp-availability');
  return () => {
    setLabel(availability, original);
    availability.classList.remove('cfp-availability');
  };
}

/**
 * @param {PresaleCampaign} campaign
 * @param {Translate} t
 * @returns {HTMLElement}
 */
function buildBadge(campaign, t) {
  const badge = el('span', { className: 'cfp-badge', text: t('presale') });
  if (campaign.discountPercent) {
    badge.appendChild(
      el('span', { className: 'cfp-badge__extra', text: ` −${campaign.discountPercent} %` }),
    );
  }
  return badge;
}

/**
 * @param {HTMLElement} tile
 * @param {PresaleCampaign} campaign
 * @param {Translate} t
 */
function markTile(tile, campaign, t) {
  if (!claim(tile, 'tile')) return;

  const restoreAvailability = relabelAvailability(tile, t);
  const badge = buildBadge(campaign, t);
  const target = queryFirst(tile, ['.p-in-in', '.p-in', '.p-detail-inner']) ?? tile;
  target.insertAdjacentElement('afterbegin', badge);

  // A listing left open past the deadline gets its own words back, like the detail page.
  // The tile stays claimed, so a later update does not mark the finished campaign again.
  const ends = parseInstant(campaign.endsAt);
  if (ends === null) return;
  atDeadline(badge, ends, () => {
    badge.remove();
    restoreAvailability();
  });
}

/**
 * @param {ReadonlyArray<PresaleCampaign>} campaigns
 * @param {Translate} t
 * @param {StorefrontTheme} [theme]
 */
export function applyCatalogue(campaigns, t, theme) {
  for (const campaign of campaigns) {
    if (campaign.inStock) continue;
    for (const tile of tilesFor(campaign.productGuid)) {
      // Before the first tile, from the first tile, and never again — the palette is
      // published on the document root and inherited. Resolving it per tile meant five
      // `querySelector` calls and a `getComputedStyle` each, forcing a style flush on
      // every step of filtering and infinite scroll.
      installTheme(tile, theme);
      markTile(tile, campaign, t);
    }
  }
}
