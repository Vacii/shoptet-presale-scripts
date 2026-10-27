/**
 * The stand-alone pre-sale page, built out of an ordinary article in the shop.
 *
 * Two rules the previous version broke, both of which changed pages that had nothing to
 * do with the addon:
 *
 * 1. It added its layout class to *every* article page, before checking the
 *    configuration, so every blog post in the shop became centred and grey.
 * 2. It emptied the article's container with `innerHTML = ''` and rebuilt it.
 *
 * Here nothing happens unless the current path is the configured one, and the merchant's
 * own content is left exactly where it was — our blocks are appended in a container of
 * our own.
 */

import { atDeadline, parseInstant } from './countdown.js';
import { claim, el, isClaimed, queryFirst } from './dom.js';
import { renderBlock } from './landing-blocks.js';
import { installTheme } from './theme.js';
import { currentPath, normalisePath } from './url.js';

/** @typedef {ReturnType<import('./i18n.js').translator>} Translate */
/** @typedef {import('./config.js').StorefrontTheme} StorefrontTheme */
/** @typedef {import('./config.js').LandingConfig} LandingConfig */
/** @typedef {import('./config.js').LandingEntry} LandingEntry */
/** @typedef {import('./media.js').Media} Media */

/** Where an article's body lives, in preference order. */
const ARTICLE_ANCHORS = [
  '.article-detail .content',
  '.article-detail',
  '.news-item-detail',
  '#content .content',
  '#content',
  'main',
];

/**
 * The title image is also the first photo in the landing page's gallery. Keep it in the
 * gallery even when the editor stores the remaining photos in the UGC block.
 *
 * @param {ReadonlyArray<LandingEntry>} entries
 * @returns {Media | null}
 */
function galleryLead(entries) {
  for (const { block } of entries) {
    const media = /** @type {{ media?: Media }} */ (block).media;
    if (block.type === 'title_banner' && media?.kind === 'image') return media;
  }
  return null;
}

/**
 * @param {ReadonlyArray<LandingEntry>} entries
 * @param {Translate} t
 * @returns {HTMLElement[]}
 */
function renderBlocks(entries, t) {
  let titleBannerPending = true;
  const lead = galleryLead(entries);
  return entries
    .map(({ block }) => {
      const priority = titleBannerPending && block.type === 'title_banner';
      const node = renderBlock(block, t, { priority, galleryLead: lead });
      if (priority && node) titleBannerPending = false;
      return node;
    })
    .filter((node) => node !== null);
}

/**
 * @param {LandingConfig} landing
 * @param {Translate} t
 * @param {string} [path] the page we are on, for testing
 * @param {StorefrontTheme} [theme]
 * @returns {HTMLElement | null} the container, when one was inserted
 */
export function applyLanding(landing, t, path = currentPath(), theme) {
  if (normalisePath(landing.urlPath) !== path) return null;

  const anchor = queryFirst(document, ARTICLE_ANCHORS);
  if (!anchor || isClaimed(anchor, 'landing')) return null;

  // The article is claimed only once the blocks exist. A render that fails half way
  // leaves it unclaimed, so the next Shoptet update gets another try.
  const blocks = renderBlocks(landing.blocks, t);
  if (blocks.length === 0) return null;
  claim(anchor, 'landing');

  const attrs = landing.title ? { 'aria-label': landing.title } : undefined;
  const container = el('section', { className: 'cfp-landing', attrs }, blocks);
  installTheme(anchor, theme);
  anchor.appendChild(container);

  // Taken down at the moment the pre-sale ends, like the product widgets.
  const ends = parseInstant(landing.endsAt);
  if (ends !== null) atDeadline(container, ends, () => container.remove());
  return container;
}
