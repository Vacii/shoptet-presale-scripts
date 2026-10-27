/**
 * Turning a configured picture or video into an element.
 *
 * The media type comes from the configuration, not from the file extension. The previous
 * renderer looked for `.mp4` at the end of the URL, so a CDN link with `?v=2` — or any
 * link without an extension — rendered nothing at all.
 *
 * A URL we will not link to means no element, rather than a broken one.
 */

import { el, setUrl } from './dom.js';
import { embedUrl } from './embed.js';

/**
 * @typedef {object} Media
 * @property {string} url
 * @property {'image' | 'video' | 'embed'} [kind]
 * @property {string} [alt]
 */

/**
 * @typedef {object} MediaOptions
 * @property {boolean} [priority] the image is above the fold and should load first
 * @property {string} [label] accessible name for a video or player whose merchant left
 *   the description empty
 */

/**
 * @param {Media} media
 * @param {MediaOptions} options
 * @returns {Record<string, string>}
 */
function imageAttributes(media, options) {
  const attrs = /** @type {Record<string, string>} */ ({
    alt: media.alt ?? '',
    loading: options.priority ? 'eager' : 'lazy',
    decoding: 'async',
  });
  if (options.priority) attrs.fetchpriority = 'high';
  return attrs;
}

/**
 * A YouTube or Vimeo player. Null when the link is neither, so an unrecognised paste
 * leaves the slot empty — and the preview in the settings UI says so before publishing.
 *
 * @param {Media} media
 * @param {string} className
 * @param {string} title
 * @returns {HTMLElement | null}
 */
function buildEmbed(media, className, title) {
  const src = embedUrl(media.url);
  if (!src) return null;
  return el('iframe', {
    className: `${className} cfp-landing__media--embed`,
    attrs: {
      src,
      title,
      loading: 'lazy',
      referrerpolicy: 'strict-origin-when-cross-origin',
      allow: 'accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen',
      allowfullscreen: '',
    },
  });
}

/**
 * Not autoplayed: the customer starts it, with the controls the browser provides.
 *
 * @param {Media} media
 * @param {string} className
 * @param {string} name
 * @returns {HTMLElement | null}
 */
function buildVideo(media, className, name) {
  const video = el('video', {
    className,
    attrs: { playsinline: '', controls: '', preload: 'metadata' },
  });
  if (name) video.setAttribute('aria-label', name);
  return setUrl(video, 'src', media.url) ? video : null;
}

/**
 * @param {Media | null | undefined} media
 * @param {string} className
 * @param {MediaOptions} [options]
 * @returns {HTMLElement | null}
 */
export function buildMedia(media, className, options = {}) {
  if (!media?.url) return null;

  // A player without a name is announced as an unnamed frame or video, so an empty
  // description falls back to the generic one the caller passes in.
  const name = media.alt || options.label || '';
  if (media.kind === 'embed') return buildEmbed(media, className, name);

  if (media.kind === 'video') return buildVideo(media, className, name);

  const image = el('img', {
    className,
    attrs: imageAttributes(media, options),
  });
  return setUrl(image, 'src', media.url) ? image : null;
}

/**
 * Wrap media in a link, when the configuration asks for one and the URL is acceptable.
 *
 * @param {HTMLElement} node
 * @param {{ href?: string | null, linkLabel?: string | null }} link
 * @param {string | null} [fallbackLabel] the link's name when the merchant gave it none
 *   and the content cannot name it either, such as a picture without a description
 * @returns {HTMLElement}
 */
export function withLink(node, link, fallbackLabel) {
  if (!link.href) return node;
  const anchor = el('a', { className: 'cfp-landing__link' }, [node]);
  if (!setUrl(anchor, 'href', link.href)) return node;
  const label = link.linkLabel || fallbackLabel;
  if (label) anchor.setAttribute('aria-label', label);
  return anchor;
}
