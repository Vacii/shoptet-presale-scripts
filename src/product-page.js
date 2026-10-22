/**
 * Applying a campaign to a product detail page.
 *
 * Every step is guarded and every step is idempotent. Shoptet re-renders parts of the
 * page when a variant is chosen, so this runs again and has to be a no-op the second
 * time. The previous version inserted the bar and then immediately dereferenced
 * `querySelector('.presale-first-bar-content')` — on any template where the insert had
 * silently failed, that was a TypeError that stopped the rest of the script.
 */

import { ADD_TO_CART_ANCHORS, AVAILABILITY_ANCHORS, resolveProductAnchor } from './anchors.js';
import { buildBar } from './bar.js';
import { atDeadline } from './countdown.js';
import { claim, labelOf, queryFirst, setLabel } from './dom.js';
import { installTheme } from './theme.js';

/**
 * @typedef {import('./config.js').PresaleCampaign} PresaleCampaign
 * @typedef {import('./config.js').StorefrontTheme} StorefrontTheme
 * @typedef {ReturnType<import('./i18n.js').translator>} Translate
 */

const ORIGINAL_LABEL = 'data-cfp-original-label';

/**
 * When the campaign ends, or never.
 *
 * @param {PresaleCampaign} campaign
 * @returns {number | null}
 */
function deadline(campaign) {
  const endsAt = campaign.endsAt ? Date.parse(campaign.endsAt) : NaN;
  return Number.isNaN(endsAt) ? null : endsAt;
}

/**
 * @param {PresaleCampaign} campaign
 * @param {Translate} t
 */
function relabelAddToCart(campaign, t) {
  const button = queryFirst(document, ADD_TO_CART_ANCHORS);
  if (!button || !claim(button, 'cta')) return;

  // Only the button's own words are replaced. Most templates put an icon element inside
  // the conversion button, and writing `textContent` — as this used to — deleted it.
  button.setAttribute(ORIGINAL_LABEL, labelOf(button));
  setLabel(button, t('preorder'));

  const ends = deadline(campaign);
  if (ends === null) return;

  // And the restore this attribute was written for actually happens. A customer sitting
  // on the page as the campaign runs out was being offered a pre-order that no longer
  // existed, with a countdown next to it reading "ended".
  atDeadline(button, ends, () => {
    setLabel(button, button.getAttribute(ORIGINAL_LABEL) ?? '');
  });
}

/**
 * @param {PresaleCampaign} campaign
 * @param {Translate} t
 * @param {boolean} showFallbackHint
 */
function relabelAvailability(campaign, t, showFallbackHint) {
  const label = queryFirst(document, AVAILABILITY_ANCHORS);
  if (!label || !claim(label, 'availability')) return;

  label.setAttribute(ORIGINAL_LABEL, labelOf(label));
  setLabel(label, t('presaleLabel'));
  label.classList.add('cfp-availability');

  // The compact bar carries this explanation when it rendered successfully. Keep a
  // small fallback beside the availability value on a template where no insertion point
  // exists, so the product never loses the reason customers can order it now.
  const hint = showFallbackHint ? document.createElement('span') : null;
  if (hint) {
    hint.className = 'cfp-hint';
    hint.textContent = `${t('presaleInfoLead')} ${t('presaleInfoTail')}`;
    hint.setAttribute('role', 'note');
    label.insertAdjacentElement('afterend', hint);
  }

  const ends = deadline(campaign);
  if (ends === null) return;

  atDeadline(label, ends, () => {
    setLabel(label, label.getAttribute(ORIGINAL_LABEL) ?? '');
    label.classList.remove('cfp-availability');
    hint?.remove();
  });
}

/**
 * Shoptet can replace the anchor during a variant update while leaving injected siblings
 * in the DOM. Claiming the new anchor alone would therefore leave two bars (and two hints)
 * on the page. Only call this when the anchor is genuinely new; a normal re-run must keep
 * the existing decoration in place.
 */
function removeStaleDecorations() {
  document.querySelectorAll('.cfp-bar, .cfp-hint').forEach((node) => node.remove());
}

/**
 * @param {HTMLElement | null} button
 * @returns {HTMLElement | null}
 */
function purchaseBlock(button) {
  if (!button) return null;
  return button.closest('.add-to-cart') ?? button.closest('form') ?? button;
}

/**
 * Move the shop's own purchase block into the widget, leaving a recoverable marker in its
 * original position. The marker matters when the deadline expires: the product controls
 * must return to the host page instead of disappearing with the widget.
 *
 * @param {HTMLElement} bar
 * @param {HTMLElement} purchase
 * @returns {() => void}
 */
function mountPurchase(bar, purchase) {
  const slot = bar.querySelector('.cfp-bar__purchase');
  if (!slot) return () => {};

  const marker = document.createComment('cfp-purchase-position');
  purchase.replaceWith(marker);
  slot.append(purchase);
  purchase.classList.add('cfp-bar__native-purchase');

  return () => {
    if (marker.isConnected) marker.replaceWith(purchase);
    else if (bar.isConnected) bar.replaceWith(purchase);
    purchase.classList.remove('cfp-bar__native-purchase');
  };
}

/**
 * @param {HTMLElement} anchor
 * @param {HTMLElement | null} purchase
 * @param {PresaleCampaign} campaign
 * @param {Translate} t
 * @returns {boolean}
 */
function insertBar(anchor, purchase, campaign, t) {
  let restorePurchase = () => {};
  const bar = buildBar(
    campaign,
    t,
    undefined,
    () => {
      restorePurchase();
      bar.remove();
    },
    purchase === null,
  );

  if (purchase === anchor) {
    anchor.replaceWith(bar);
    restorePurchase = mountPurchase(bar, purchase);
    return true;
  }

  const inserted = anchor.insertAdjacentElement('afterend', bar) !== null;
  if (inserted && purchase && !bar.contains(purchase)) {
    restorePurchase = mountPurchase(bar, purchase);
  }
  return inserted;
}

/**
 * @param {ReadonlyArray<PresaleCampaign>} campaigns
 * @param {string} productGuid
 * @param {string} template
 * @param {Translate} t
 * @param {StorefrontTheme} [theme]
 */
export function applyProductPage(campaigns, productGuid, template, t, theme) {
  const campaign = campaigns.find((entry) => entry.productGuid === productGuid);
  if (!campaign) return;

  // A product the shop can actually ship is not in a pre-sale, whatever the campaign
  // says. The snippet carries availability from the Shoptet API, so this no longer means
  // comparing the rendered availability text against the Czech word for "in stock".
  if (campaign.inStock) return;

  let anchor = resolveProductAnchor(template);

  const button = queryFirst(document, ADD_TO_CART_ANCHORS);
  const purchase = purchaseBlock(button);
  // Some templates place the preferred price anchor inside the purchase block. The
  // block is the useful unit in that case, because it already owns the form, quantity
  // and conversion button we want to keep together.
  if (anchor && purchase?.contains(anchor)) anchor = purchase;

  // Once, before anything is inserted, and resolved from the anchor: the surface the ink
  // has to be legible against is whatever the template paints *there*, not whatever
  // `body` happens to be. The availability label below is themed too, so this cannot
  // hang off the bar being inserted successfully.
  installTheme(anchor ?? document.body, theme);

  let barInserted = false;
  if (anchor && claim(anchor, 'anchor')) {
    removeStaleDecorations();
    barInserted = insertBar(anchor, purchase, campaign, t);
  }

  relabelAddToCart(campaign, t);
  // A variant update can replace only the availability node while the original anchor and
  // strip stay in place. In that case the current run did not insert a bar, but the page
  // already has one, so adding the fallback note would recreate the duplicate we removed.
  const hasBar = document.querySelector('.cfp-bar') !== null;
  relabelAvailability(campaign, t, !barInserted && !hasBar);
}
