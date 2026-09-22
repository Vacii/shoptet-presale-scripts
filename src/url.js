/**
 * URL handling, on both sides: what we are willing to link to, and how we decide that
 * the visitor is on the pre-sale landing page.
 */

const ALLOWED_PROTOCOLS = ['http:', 'https:'];

/**
 * Accept a URL only if it can be resolved and uses a protocol that cannot execute.
 *
 * The API rejects anything else at the point of entry too, but a value can also come
 * from a stale inline snippet written before that validation existed. The previous
 * bundle assigned `component.redirectUrl` straight to `.href` in seven places, so a
 * `javascript:` value ran on click.
 *
 * @param {string | null | undefined} value
 * @returns {string | null}
 */
export function safeUrl(value) {
  if (typeof value !== 'string' || value.trim() === '') return null;
  try {
    const parsed = new URL(value, window.location.origin);
    return ALLOWED_PROTOCOLS.includes(parsed.protocol) ? parsed.href : null;
  } catch {
    return null;
  }
}

/**
 * Reduce a URL or path to something comparable.
 *
 * The previous version compared `soloLanding[0].url !== window.location.href` — an exact
 * match on the whole URL, which fails on a `?utm_source`, an `#anchor`, a trailing
 * slash, `www` versus the apex domain, and http versus https. All of those are the same
 * page. This mirrors `normalise_url_path` on the server, so both sides agree.
 *
 * @param {string} value
 * @returns {string}
 */
export function normalisePath(value) {
  let path = value.trim();

  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(path)) {
    try {
      path = new URL(path).pathname;
    } catch {
      return '/';
    }
  }

  const cut = path.search(/[?#]/);
  if (cut !== -1) path = path.slice(0, cut);
  if (!path.startsWith('/')) path = `/${path}`;
  if (path.length > 1) path = path.replace(/\/+$/, '');

  return (path || '/').toLowerCase();
}

/** @returns {string} */
export function currentPath() {
  return normalisePath(window.location.pathname);
}
