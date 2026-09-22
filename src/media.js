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
 * @typedef {{ priority?: boolean }} MediaOptions
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
 * @returns {HTMLElement | null}
 */
function buildEmbed(media, className) {
  const src = embedUrl(media.url);
  if (!src) return null;
  return el('iframe', {
    className: `${className} cfp-landing__media--embed`,
    attrs: {
      src,
      title: media.alt ?? '',
      loading: 'lazy',
      referrerpolicy: 'strict-origin-when-cross-origin',
      allow: 'accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen',
      allowfullscreen: '',
    },
  });
}

/**
 * @param {Media | null | undefined} media
 * @param {string} className
 * @param {MediaOptions} [options]
 * @returns {HTMLElement | null}
 */
export function buildMedia(media, className, options = {}) {
  if (!media?.url) return null;

  if (media.kind === 'embed') return buildEmbed(media, className);

  if (media.kind === 'video') {
    const video = el('video', {
      className,
      // Autoplaying video needs controls: without them there is no way to stop it, which
      // is a WCAG 2.2.2 failure for anything that moves for more than five seconds.
      attrs: {
        muted: '',
        loop: '',
        playsinline: '',
        controls: '',
        preload: 'metadata',
        'aria-label': media.alt ?? '',
      },
    });
    return setUrl(video, 'src', media.url) ? video : null;
  }

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
 * @returns {HTMLElement}
 */
export function withLink(node, link) {
  if (!link.href) return node;
  const anchor = el('a', { className: 'cfp-landing__link' }, [node]);
  if (!setUrl(anchor, 'href', link.href)) return node;
  if (link.linkLabel) anchor.setAttribute('aria-label', link.linkLabel);
  return anchor;
}
