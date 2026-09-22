/**
 * One renderer per block type.
 *
 * The block union comes from the server, which validates each type against its own model,
 * so nothing here has to sniff the shape of a field before touching it. The previous
 * model had a single `Component` class with `src?: string | Usp[] | Ugc[] | null`, and
 * every card began with a runtime shape check that was easy to get wrong.
 *
 * A block that cannot render anything useful — no media, no items — returns null and is
 * simply absent, rather than leaving an empty framed box on the merchant's page.
 */

import { buildCodeRow } from './code-row.js';
import { formatRemaining, startCountdown } from './countdown.js';
import { el, setText } from './dom.js';
import { buildMedia, withLink } from './media.js';

/**
 * @typedef {ReturnType<import('./i18n.js').translator>} Translate
 * @typedef {import('./media.js').Media} Media
 * @typedef {import('./media.js').MediaOptions} MediaOptions
 * @typedef {MediaOptions & { galleryLead?: Media | null }} RenderOptions
 * @typedef {Media & { href?: string | null, linkLabel?: string | null }} LinkedMedia
 * @typedef {{ media?: Media, title?: string, text?: string | null,
 *             href?: string | null, linkLabel?: string | null }} UspItem
 * @typedef {{ question: string, answer: string }} FaqItem
 */

/**
 * @param {{ heading?: string | null, subheading?: string | null, text?: string | null }} block
 * @returns {HTMLElement[]}
 */
function textParts(block) {
  const parts = [];
  if (block.heading)
    parts.push(el('h2', { className: 'cfp-landing__heading', text: block.heading }));
  if (block.subheading) {
    parts.push(el('p', { className: 'cfp-landing__subheading', text: block.subheading }));
  }
  if (block.text) parts.push(el('p', { className: 'cfp-landing__text', text: block.text }));
  return parts;
}

/**
 * @param {any} block
 * @param {Translate} _t
 * @param {RenderOptions} [options]
 * @returns {HTMLElement | null}
 */
function renderBanner(block, _t, options) {
  const media = buildMedia(block.media, 'cfp-landing__media', options);
  if (!media) return null;
  const children = [withLink(media, block.media ?? {}), ...textParts(block)];
  return el('div', { className: `cfp-landing__block cfp-landing__block--${block.type}` }, children);
}

/**
 * @param {any} block
 * @returns {HTMLElement | null}
 */
function renderCompare(block) {
  const desktop = buildMedia(block.desktop, 'cfp-landing__media cfp-landing__media--desktop');
  const mobile = buildMedia(block.mobile, 'cfp-landing__media cfp-landing__media--mobile');
  if (!desktop && !mobile) return null;

  // Both are in the DOM and CSS chooses; the previous stylesheet tried to hide one with
  // a class that lost to a `!important` rule elsewhere, so both showed on desktop.
  const children = [desktop, mobile].filter((node) => node !== null);
  return el('div', { className: 'cfp-landing__block cfp-landing__block--compare' }, children);
}

/**
 * @param {any} block
 * @param {Translate} t
 * @returns {HTMLElement | null}
 */
function renderSale(block, t) {
  if (!block.text) return null;
  const children = [el('p', { className: 'cfp-landing__sale-text', text: block.text })];
  if (block.percent) {
    children.push(el('p', { className: 'cfp-landing__sale-percent', text: `−${block.percent} %` }));
  }
  if (block.code) children.push(buildCodeRow(block.code, t, 'cfp-landing__code-row'));
  return el('div', { className: 'cfp-landing__block cfp-landing__block--sale' }, children);
}

/**
 * @param {any} block
 * @returns {HTMLElement | null}
 */
function renderUsps(block) {
  const items = (block.items ?? []).map(
    /** @param {UspItem} item */ (item) => {
      const media = buildMedia(item.media, 'cfp-landing__usp-media');
      const parts = media ? [media] : [];
      parts.push(el('h3', { className: 'cfp-landing__usp-title', text: item.title ?? '' }));
      if (item.text) parts.push(el('p', { className: 'cfp-landing__usp-text', text: item.text }));
      return el('li', { className: 'cfp-landing__usp' }, [withLink(el('div', {}, parts), item)]);
    },
  );
  if (items.length === 0) return null;
  return el('div', { className: 'cfp-landing__block cfp-landing__block--usps' }, [
    el('ul', { className: 'cfp-landing__usps' }, items),
  ]);
}

/**
 * @param {any} block
 * @param {Translate} _t
 * @param {RenderOptions} [options]
 * @returns {HTMLElement | null}
 */
function renderUgc(block, _t, options) {
  const lead = options?.galleryLead;
  const sourceItems = lead?.kind === 'image' ? [lead, ...(block.items ?? [])] : (block.items ?? []);
  const seen = new Set();
  const items = sourceItems
    .filter(
      /** @param {Media} item */ (item) => {
        if (seen.has(item.url)) return false;
        seen.add(item.url);
        return true;
      },
    )
    .map(/** @param {Media} item */ (item) => buildMedia(item, 'cfp-landing__ugc-media'))
    .filter(/** @param {HTMLElement | null} node */ (node) => node !== null)
    .map(
      /** @param {HTMLElement} node */ (node) =>
        el('li', { className: 'cfp-landing__ugc' }, [node]),
    );
  if (items.length === 0) return null;

  // Scroll-snap, not a carousel library. Three carousels were the entire reason the old
  // bundle shipped 166 kB of Swiper to every page of every shop.
  return el('div', { className: 'cfp-landing__block cfp-landing__block--ugc' }, [
    el('ul', { className: 'cfp-landing__rail', attrs: { tabindex: '0', role: 'list' } }, items),
  ]);
}

let accordionSeq = 0;

/**
 * @param {{ question: string, answer: string }} item
 * @returns {HTMLElement}
 */
function renderFaqItem(item) {
  accordionSeq += 1;
  const panelId = `cfp-faq-panel-${accordionSeq}`;
  const buttonId = `cfp-faq-button-${accordionSeq}`;

  const panel = el('div', {
    className: 'cfp-landing__answer',
    text: item.answer,
    attrs: { id: panelId, role: 'region', 'aria-labelledby': buttonId, hidden: '' },
  });
  const button = el('button', {
    className: 'cfp-landing__question',
    text: item.question,
    attrs: { type: 'button', id: buttonId, 'aria-expanded': 'false', 'aria-controls': panelId },
  });

  button.addEventListener('click', () => {
    const open = button.getAttribute('aria-expanded') === 'true';
    button.setAttribute('aria-expanded', open ? 'false' : 'true');
    panel.toggleAttribute('hidden', open);
  });

  return el('div', { className: 'cfp-landing__faq-item' }, [button, panel]);
}

/**
 * @param {any} block
 * @returns {HTMLElement | null}
 */
function renderFaq(block) {
  const items = (block.items ?? []).filter(
    /** @param {FaqItem} item */ (item) => item.question && item.answer,
  );
  if (items.length === 0) return null;
  return el(
    'div',
    { className: 'cfp-landing__block cfp-landing__block--faq' },
    items.map(renderFaqItem),
  );
}

/**
 * @param {any} block
 * @param {Translate} t
 * @returns {HTMLElement | null}
 */
function renderCountdown(block, t) {
  const endsAt = block.endsAt ? Date.parse(block.endsAt) : NaN;
  if (Number.isNaN(endsAt)) return null;

  const value = el('time', {
    className: 'cfp-landing__countdown',
    attrs: { datetime: block.endsAt },
  });
  // Keep the caption first in the DOM for a sensible spoken order. The stand-alone landing
  // block still reverses the stack visually, and remains the one place it breaks its grid.
  const caption = el('span', { className: 'cfp-landing__caption', text: t('endsIn') });
  const clock = el('p', { className: 'cfp-landing__clock' }, [caption, value]);

  startCountdown(value, endsAt, (remaining) => {
    if (remaining === null) {
      setText(value, t('ended'));
      clock.classList.add('cfp-landing__clock--ended');
      return;
    }
    setText(
      value,
      formatRemaining(remaining, (u) => t(u)),
    );
  });

  return el('div', { className: 'cfp-landing__block cfp-landing__block--countdown' }, [
    ...textParts(block),
    clock,
  ]);
}

/** @type {Record<string, (block: any, t: Translate, options?: RenderOptions) => HTMLElement | null>} */
const RENDERERS = {
  title_banner: renderBanner,
  benefit: renderBanner,
  banner: renderBanner,
  compare: renderCompare,
  sale: renderSale,
  usps: renderUsps,
  ugc: renderUgc,
  faq: renderFaq,
  countdown: renderCountdown,
};

/**
 * @param {{ type?: string }} block
 * @param {Translate} t
 * @param {RenderOptions} [options]
 * @returns {HTMLElement | null}
 */
export function renderBlock(block, t, options) {
  const renderer = RENDERERS[block.type ?? ''];
  // An unknown type means the server is newer than this bundle. Skipping it is the only
  // reasonable answer; the merchant's page must not break because of a deploy order.
  return renderer ? renderer(block, t, options) : null;
}
