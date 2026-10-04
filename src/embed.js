/**
 * YouTube and Vimeo links, turned into something an iframe will actually load.
 *
 * Merchants have their videos on YouTube, not as an .mp4 on their own domain, and the
 * link they copy is the page they were looking at — a watch URL, a `youtu.be` share link
 * or a Shorts URL. None of those load in an iframe: YouTube refuses to frame them. So the
 * configuration keeps the URL exactly as it was pasted and the mapping to the player URL
 * happens here, at render time, where a change on the provider's side is one edit.
 *
 * Anything not recognised returns null, and the caller renders nothing rather than an
 * empty frame — the same rule the rest of the renderer follows.
 */

/** @type {RegExp[]} Ordered: the more specific path forms first. */
const YOUTUBE_PATHS = [
  /^\/(?:embed|shorts|live|v)\/([\w-]{6,})/,
  /^\/([\w-]{6,})$/, // youtu.be/<id>
];

const VIMEO_PATH = /(?:^|\/)(\d{6,})(?:$|[/?])/;

/**
 * @param {URL} parsed
 * @returns {string | null}
 */
function youtubeId(parsed) {
  const fromQuery = parsed.searchParams.get('v');
  if (fromQuery) return fromQuery;
  for (const pattern of YOUTUBE_PATHS) {
    const match = pattern.exec(parsed.pathname);
    if (match) return match[1] ?? null;
  }
  return null;
}

/**
 * @param {string} hostname
 * @returns {string}
 */
function bareHost(hostname) {
  return hostname.toLowerCase().replace(/^(?:www|m)\./, '');
}

const YOUTUBE_HOSTS = ['youtube.com', 'youtube-nocookie.com', 'youtu.be'];
const VIMEO_HOSTS = ['vimeo.com', 'player.vimeo.com'];

/**
 * @param {string} value
 * @returns {URL | null}
 */
function parseHttpUrl(value) {
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * The provider's player URL for a pasted link, or null if it is neither provider's.
 *
 * @param {string | null | undefined} value
 * @returns {string | null}
 */
export function embedUrl(value) {
  if (typeof value !== 'string' || value.trim() === '') return null;

  const parsed = parseHttpUrl(value);
  if (!parsed) return null;

  const host = bareHost(parsed.hostname);

  if (YOUTUBE_HOSTS.includes(host)) {
    const id = youtubeId(parsed);
    // The no-cookie host is the one that does not write tracking cookies before the
    // visitor presses play, which is what the merchant's consent banner assumes.
    return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : null;
  }

  if (VIMEO_HOSTS.includes(host)) {
    const match = VIMEO_PATH.exec(parsed.pathname);
    return match?.[1] ? `https://player.vimeo.com/video/${match[1]}` : null;
  }

  return null;
}

/** Extensions that mean a file the browser plays itself, rather than a player page. */
const VIDEO_FILE = /\.(?:mp4|webm|ogv|ogg|mov|m4v)$/i;

/**
 * What a pasted URL most likely is, used to preselect the media type in the settings UI.
 *
 * A guess here is harmless: the merchant sees the choice and can change it. The renderer
 * never guesses — it uses the stored `kind`.
 *
 * @param {string | null | undefined} value
 * @returns {'image' | 'video' | 'embed'}
 */
export function detectMediaKind(value) {
  if (embedUrl(value)) return 'embed';
  const parsed = parseHttpUrl(String(value ?? ''));
  return parsed && VIDEO_FILE.test(parsed.pathname) ? 'video' : 'image';
}
