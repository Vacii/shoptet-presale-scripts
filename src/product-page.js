/**
 * Applying a campaign to a product detail page.
 *
 * The shop's own purchase block stays exactly where the template put it. The widget is
 * inserted before it, and the only changes inside the shop's markup are the words of the
 * conversion button and of the availability label, both put back when the campaign ends.
 *
 * Every step is guarded and idempotent. Shoptet re-renders parts of the page when a
 * variant is chosen, so this runs again and has to be a no-op the second time.
 */

import { availabilityLabel, conversionButtons, widgetPlacement } from './anchors.js';
import { buildBar } from './bar.js';
import { atDeadline, parseInstant } from './countdown.js';
import { claim, labelOf, setLabel } from './dom.js';
import { installTheme } from './theme.js';

/**
 * @typedef {import('./config.js').PresaleCampaign} PresaleCampaign
 * @typedef {import('./config.js').StorefrontTheme} StorefrontTheme
 * @typedef {ReturnType<import('./i18n.js').translator>} Translate
 */

const ORIGINAL_LABEL = 'data-cfp-original-label';

/**
 * Swap an element's own words for ours, remembering the original for the deadline.
 *
 * @param {HTMLElement} node
 * @param {string} text
 * @param {number | null} ends
 * @param {() => void} [restoreMore] anything else to undo at the deadline
 */
function relabel(node, text, ends, restoreMore) {
  node.setAttribute(ORIGINAL_LABEL, labelOf(node));
  setLabel(node, text);
  if (ends === null) return;
  atDeadline(node, ends, () => {
    setLabel(node, node.getAttribute(ORIGINAL_LABEL) ?? '');
    restoreMore?.();
  });
}

/**
 * Shoptet names its conversion buttons with `aria-label="Do košíku <product>"`, which a
 * screen reader announces instead of the visible words. The same words are swapped there,
 * so the spoken name keeps matching what the button says.
 *
 * @param {HTMLElement} button
 * @param {string} original the visible words before the swap
 * @param {string} text
 * @returns {() => void} puts the original name back
 */
function relabelName(button, original, text) {
  const name = button.getAttribute('aria-label');
  if (!name || !original || !name.includes(original)) return () => {};
  button.setAttribute('aria-label', name.replace(original, text));
  return () => button.setAttribute('aria-label', name);
}

/**
 * Only the button's own words are replaced; the icon most templates put inside it stays.
 * A button without words of its own (Tango's narrow-screen cart icon) is left alone.
 *
 * @param {number | null} ends
 * @param {Translate} t
 */
function relabelButtons(ends, t) {
  for (const button of conversionButtons()) {
    const original = labelOf(button);
    if (original === '' || !claim(button, 'cta')) continue;
    const restoreName = relabelName(button, original, t('preorder'));
    relabel(button, t('preorder'), ends, restoreName);
  }
}

/**
 * @param {number | null} ends
 * @param {Translate} t
 * @param {boolean} showFallbackHint
 */
function relabelAvailability(ends, t, showFallbackHint) {
  const label = availabilityLabel();
  if (!label || !claim(label, 'availability')) return;

  // The widget carries this explanation when it rendered. Keep a small fallback beside
  // the availability value on a page where it could not be placed, so the product never
  // loses the reason customers can order it now.
  const hint = showFallbackHint ? document.createElement('span') : null;
  if (hint) {
    hint.className = 'cfp-hint';
    hint.textContent = `${t('presaleInfoLead')} ${t('presaleInfoTail')}`;
    hint.setAttribute('role', 'note');
    label.insertAdjacentElement('afterend', hint);
  }

  label.classList.add('cfp-availability');
  relabel(label, t('presaleLabel'), ends, () => {
    label.classList.remove('cfp-availability');
    hint?.remove();
  });
}

/**
 * Shoptet can replace the purchase block during a variant update while leaving the
 * widget before it in the DOM. Claiming the new block alone would then leave two widgets
 * (and two hints) on the page. Only call this when the block is genuinely new.
 */
function removeStaleDecorations() {
  document.querySelectorAll('.cfp-bar, .cfp-hint').forEach((node) => node.remove());
}

/**
 * @param {PresaleCampaign} campaign
 * @param {Translate} t
 * @returns {boolean} whether the widget is on the page
 */
function insertBar(campaign, t) {
  const placement = widgetPlacement();
  if (!placement || !claim(placement.node, 'anchor')) return false;

  removeStaleDecorations();
  const bar = buildBar(campaign, t, () => bar.remove());
  return placement.node.insertAdjacentElement(placement.position, bar) !== null;
}

/**
 * @param {ReadonlyArray<PresaleCampaign>} campaigns
 * @param {string} productGuid
 * @param {Translate} t
 * @param {StorefrontTheme} [theme]
 */
export function applyProductPage(campaigns, productGuid, t, theme) {
  const campaign = campaigns.find((entry) => entry.productGuid === productGuid);
  if (!campaign) return;

  // A product the shop can actually ship is not in a pre-sale, whatever the campaign
  // says. The snippet carries availability from the Shoptet API, so this no longer means
  // comparing the rendered availability text against the Czech word for "in stock".
  if (campaign.inStock) return;

  // Once, before anything is inserted, and resolved from where the widget goes. It is a
  // sibling of the purchase block, so the surface its ink has to be legible against is
  // the parent's, not whatever the template paints behind the price.
  installTheme(widgetPlacement()?.node.parentElement ?? document.body, theme);

  const barInserted = insertBar(campaign, t);
  const ends = parseInstant(campaign.endsAt);
  relabelButtons(ends, t);
  // A variant update can replace only the availability node while the widget stays in
  // place. In that case this run did not insert a widget, but the page already has one,
  // so adding the fallback note would recreate the duplicate removed above.
  const hasBar = document.querySelector('.cfp-bar') !== null;
  relabelAvailability(ends, t, !barInserted && !hasBar);
}
