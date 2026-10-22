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

import { claim, el, queryFirst } from './dom.js';
import { renderBlock } from './landing-blocks.js';
import { installTheme } from './theme.js';
import { currentPath, normalisePath } from './url.js';

/** @typedef {ReturnType<import('./i18n.js').translator>} Translate */
/** @typedef {import('./config.js').StorefrontTheme} StorefrontTheme */
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
 * @param {ReadonlyArray<{ block: unknown }>} blocks
 * @returns {Media | null}
 */
function galleryLead(blocks) {
  for (const entry of blocks) {
    const block = /** @type {{ type?: string, media?: Media }} */ (entry.block);
    if (block.type === 'title_banner' && block.media?.kind === 'image') return block.media;
  }
  return null;
}

/**
 * @param {{ urlPath?: string, blocks?: ReadonlyArray<{ block: unknown }> }} landing
 * @param {Translate} t
 * @param {string} [path] the page we are on, for testing
 * @param {StorefrontTheme} [theme]
 * @returns {HTMLElement | null} the container, when one was inserted
 */
export function applyLanding(landing, t, path = currentPath(), theme) {
  if (!landing.urlPath) return null;
  if (normalisePath(landing.urlPath) !== path) return null;

  const anchor = queryFirst(document, ARTICLE_ANCHORS);
  if (!anchor || !claim(anchor, 'landing')) return null;

  let titleBannerPending = true;
  const lead = galleryLead(landing.blocks ?? []);
  const blocks = (landing.blocks ?? [])
    .map((entry) => {
      const block = /** @type {{ type?: string }} */ (entry.block);
      const priority = titleBannerPending && block.type === 'title_banner';
      const node = renderBlock(block, t, { priority, galleryLead: lead });
      if (priority && node) titleBannerPending = false;
      return node;
    })
    .filter((node) => node !== null);

  if (blocks.length === 0) return null;

  const container = el('section', { className: 'cfp-landing' }, blocks);
  installTheme(anchor, theme);
  anchor.appendChild(container);
  return container;
}
