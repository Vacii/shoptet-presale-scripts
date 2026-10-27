/**
 * Taking the shop's own colours by default, with an optional merchant-selected accent.
 *
 * The bar belongs to the merchant's page, not to us, so the accent is read from whatever
 * their template paints the conversion button with. What we do not inherit is their
 * contrast.
 *
 * The accent does two different jobs and needs two different guarantees, which is the
 * thing this file got wrong for a while:
 *
 *   --cfp-accent      a fill, mixed into the surface at low strength behind the
 *                     countdown cells, the badge and the discount. It is nudged until
 *                     black or white text would clear AA on it at full strength, so a
 *                     neon conversion colour does not turn into a glaring tint.
 *   --cfp-accent-ink  text, a border or a focus ring *on the shop's own page*. Nothing
 *                     about the first guarantee says anything about this one: a pale
 *                     yellow conversion button clears AA against black and lands at
 *                     1.5:1 as text on a white page. Worse, the fill correction runs the
 *                     wrong way here — it pushes a pale button lighter, because white
 *                     was already the winning foreground against it.
 *
 * So the ink is corrected separately, against the surface it is actually painted on,
 * which is read by walking up from the insertion point. When 4.5:1 is unreachable — a
 * mid-grey page, where no colour passes — it falls back to `currentColor` and the text
 * is simply the theme's own, which is always legible by construction.
 *
 * Colours are normalised through a canvas `fillStyle` rather than by a regex over the
 * computed value. Chrome reports `oklch()` and `color()` back unchanged, so the regex
 * version failed on any template using modern colour syntax and silently fell back to
 * the hard-coded grey. The canvas understands whatever the browser's CSS parser does,
 * which keeps this correct as the syntax keeps growing.
 */

const ACCENT_SOURCES = [
  '.btn-conversion',
  '.add-to-cart-button',
  '.btn-cart',
  '.btn-primary',
  '.p-final-price-wrapper .price-final',
];

const FALLBACK_ACCENT = [27, 27, 27];
const MIN_CONTRAST = 4.5;

//: `.cfp-bar` and `.cfp-landing__block--sale` paint the accent over the page at this
//: strength, so ink inside them sits on a slightly tinted surface rather than the page's
//: own. Both are checked, and the ink has to clear AA on both.
const PANEL_TINT = 0.08;

//: How far the ink may be pushed from the accent, and how finely.
//:
//: The cap is the interesting number. Every surface is reachable if the ink is allowed
//: to go all the way — black clears AA on anything down to 0.175 luminance and white on
//: anything above 0.183, so between them they cover every colour there is. But an accent
//: pushed 90% of the way to black is not the shop's colour any more, it is black. Past
//: this point `currentColor` is the more honest answer: it is the theme's own text
//: colour, legible by construction, and it does not pretend to be a brand. In practice
//: real surfaces need 0.55 at the very worst; only a mid-grey page goes past the cap.
const MAX_INK_SHIFT = 0.7;
const INK_STEP = 0.05;

/** @typedef {[number, number, number]} Rgb */
/** @typedef {{ rgb: Rgb, alpha: number }} Layer */
/** @typedef {{ accentColor?: string | null }} StorefrontTheme */

const BLACK = /** @type {Rgb} */ ([0, 0, 0]);
const WHITE = /** @type {Rgb} */ ([255, 255, 255]);

// --- reading a colour ---------------------------------------------------------------

/** @type {CanvasRenderingContext2D | null | undefined} */
let normaliser;

/**
 * A 1×1 canvas used only for its colour parser. Absent in a test environment without a
 * canvas implementation, in which case the regex below is all there is.
 *
 * @returns {CanvasRenderingContext2D | null}
 */
function colourNormaliser() {
  if (normaliser !== undefined) return normaliser;
  try {
    // `?? null` matters: a jsdom without a canvas implementation returns undefined, and
    // caching that would re-enter this every single time a colour is read.
    normaliser = document.createElement('canvas').getContext('2d') ?? null;
  } catch {
    normaliser = null;
  }
  return normaliser;
}

/**
 * Reduce any CSS colour the browser understands to `#rrggbb` or `rgba(...)`.
 *
 * `fillStyle` keeps its previous value when assigned something it cannot parse, so two
 * different sentinels tell a rejected value apart from an accepted one: on a rejection
 * the two reads disagree.
 *
 * @param {string} value
 * @returns {string} the normalised colour, or `value` unchanged when it was not one
 */
function normalise(value) {
  const ctx = colourNormaliser();
  if (!ctx) return value;

  ctx.fillStyle = '#000000';
  ctx.fillStyle = value;
  const first = String(ctx.fillStyle);

  ctx.fillStyle = '#ffffff';
  ctx.fillStyle = value;
  const second = String(ctx.fillStyle);

  return first === second ? first : value;
}

/**
 * @param {string} body the inside of `rgb(...)` / `rgba(...)`
 * @returns {Layer | null}
 */
function parseFunctional(body) {
  const [r, g, b, a] = body
    .split(/[\s,/]+/)
    .filter(Boolean)
    .map(Number);
  if (r === undefined || g === undefined || b === undefined) return null;
  if ([r, g, b].some(Number.isNaN)) return null;
  return { rgb: [r, g, b], alpha: a === undefined || Number.isNaN(a) ? 1 : a };
}

/**
 * @param {string} digits three or six hex digits, without the hash
 * @returns {Rgb}
 */
function parseHex(digits) {
  const full =
    digits.length === 3
      ? digits
          .split('')
          .map((d) => d + d)
          .join('')
      : digits;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

/**
 * Any CSS colour, with its alpha kept.
 *
 * @param {string} value
 * @returns {Layer | null}
 */
export function parseLayer(value) {
  const text = normalise(value.trim()).trim().toLowerCase();

  const functional = text.match(/^rgba?\(([^)]+)\)$/);
  if (functional?.[1]) return parseFunctional(functional[1]);

  const hex = text.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (hex?.[1]) return { rgb: parseHex(hex[1]), alpha: 1 };

  return null;
}

/**
 * An opaque-enough colour, or nothing.
 *
 * A transparent button tells us nothing about the template's accent, so it is treated as
 * no answer and the next candidate gets a turn.
 *
 * @param {string} value any CSS colour a computed style may report
 * @returns {Rgb | null}
 */
export function parseColour(value) {
  const layer = parseLayer(value);
  if (!layer || layer.alpha < 0.1) return null;
  return layer.rgb;
}

// --- contrast ------------------------------------------------------------------------

/**
 * WCAG relative luminance.
 * @param {Rgb} rgb
 * @returns {number}
 */
export function relativeLuminance([r, g, b]) {
  /** @param {number} value */
  const channel = (value) => {
    const v = value / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/**
 * @param {Rgb} a
 * @param {Rgb} b
 * @returns {number}
 */
export function contrastRatio(a, b) {
  const first = relativeLuminance(a);
  const second = relativeLuminance(b);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Black or white, whichever reads better on this background.
 * @param {Rgb} background
 * @returns {Rgb}
 */
export function readableForeground(background) {
  return contrastRatio(background, BLACK) >= contrastRatio(background, WHITE) ? BLACK : WHITE;
}

/**
 * Nudge a colour away from mid-grey until black or white clears AA against it.
 *
 * This is the *fill* guarantee, and it says nothing about the colour's legibility as
 * text on the merchant's page — see `inkFor` for that.
 *
 * @param {Rgb} colour
 * @returns {Rgb}
 */
export function ensureContrast(colour) {
  let current = colour;
  // Which way to move: whichever foreground is already ahead is the one to help.
  const towardsDark = contrastRatio(colour, WHITE) >= contrastRatio(colour, BLACK);
  const step = towardsDark ? -8 : 8;

  for (let i = 0; i < 32; i += 1) {
    if (contrastRatio(current, readableForeground(current)) >= MIN_CONTRAST) return current;
    current = /** @type {Rgb} */ (
      current.map((channel) => Math.min(255, Math.max(0, channel + step)))
    );
  }
  return current;
}

// --- surfaces and ink -----------------------------------------------------------------

/**
 * `top` painted over `bottom` at `alpha`.
 *
 * @param {Rgb} top
 * @param {Rgb} bottom
 * @param {number} alpha
 * @returns {Rgb}
 */
export function blend([tr, tg, tb], [br, bg, bb], alpha) {
  /**
   * @param {number} t
   * @param {number} b
   */
  const mix = (t, b) => t * alpha + b * (1 - alpha);
  return /** @type {Rgb} */ ([mix(tr, br), mix(tg, bg), mix(tb, bb)]);
}

/**
 * The colour actually behind an element.
 *
 * Walks up from the insertion point compositing translucent layers until it reaches one
 * that is opaque, and assumes white if it never does — which is what a browser paints
 * when nothing in the tree sets a background.
 *
 * @param {Element | null} node
 * @returns {Rgb}
 */
export function surfaceUnder(node) {
  /** @type {Layer[]} */
  const translucent = [];
  let surface = WHITE;

  for (let current = node; current; current = current.parentElement) {
    const layer = parseLayer(window.getComputedStyle(current).backgroundColor);
    if (!layer || layer.alpha <= 0) continue;
    if (layer.alpha >= 1) {
      surface = layer.rgb;
      break;
    }
    translucent.push(layer);
  }

  for (let i = translucent.length - 1; i >= 0; i -= 1) {
    const layer = /** @type {Layer} */ (translucent[i]);
    surface = blend(layer.rgb, surface, layer.alpha);
  }
  return surface;
}

/**
 * @param {Rgb} colour
 * @param {number} amount 0 leaves it alone, 1 is black
 * @returns {Rgb}
 */
function darken(colour, amount) {
  return /** @type {Rgb} */ (colour.map((c) => c * (1 - amount)));
}

/**
 * @param {Rgb} colour
 * @param {number} amount 0 leaves it alone, 1 is white
 * @returns {Rgb}
 */
function lighten(colour, amount) {
  return /** @type {Rgb} */ (colour.map((c) => c + (255 - c) * amount));
}

/**
 * The accent, made legible *as text* on a given surface.
 *
 * Pushed towards black or white — whichever the surface has headroom for — in even
 * steps, keeping the channel ratios so the hue survives. The panel tint is checked as
 * well as the bare surface, because the bar and the sale block paint the accent over the
 * page at 8% and the ink inside them sits on that.
 *
 * @param {Rgb} accent the accent as read, *not* the fill-corrected one
 * @param {Rgb} surface
 * @returns {Rgb | null} null when no shade of it clears AA without ceasing to be the
 *   shop's colour, and the caller should defer to the theme's own text colour
 */
export function inkFor(accent, surface) {
  const surfaces = [surface, blend(accent, surface, PANEL_TINT)];
  const towardsBlack = contrastRatio(surface, BLACK) >= contrastRatio(surface, WHITE);

  for (let amount = 0; amount <= MAX_INK_SHIFT + 1e-9; amount += INK_STEP) {
    const candidate = towardsBlack ? darken(accent, amount) : lighten(accent, amount);
    if (surfaces.every((s) => contrastRatio(candidate, s) >= MIN_CONTRAST)) return candidate;
  }
  return null;
}

/**
 * @param {Rgb} rgb
 * @returns {string}
 */
export function toCss([r, g, b]) {
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

// --- publishing the palette ------------------------------------------------------------

/**
 * The colour this template uses for "buy".
 *
 * @returns {{ accent: Rgb, found: boolean }} `found` is false when nothing on the page
 *   answered, which happens before Shoptet has rendered the product block
 */
function readAccent() {
  for (const selector of ACCENT_SOURCES) {
    const node = document.querySelector(selector);
    if (!node) continue;
    const style = window.getComputedStyle(node);
    const colour = parseColour(style.backgroundColor) ?? parseColour(style.color);
    if (colour) return { accent: colour, found: true };
  }
  return { accent: /** @type {Rgb} */ (FALLBACK_ACCENT), found: false };
}

/**
 * Prefer the merchant's explicit choice, but keep a malformed or legacy value from
 * reaching the CSS custom properties. A bad value falls through to the shop's button.
 *
 * @param {StorefrontTheme | null | undefined} theme
 * @returns {{ accent: Rgb, found: boolean } | null}
 */
function configuredAccent(theme) {
  if (!theme || typeof theme.accentColor !== 'string') return null;
  if (!/^#[0-9a-f]{6}$/i.test(theme.accentColor.trim())) return null;
  const accent = parseColour(theme.accentColor);
  return accent ? { accent, found: true } : null;
}

/**
 * @param {Element | null} reference an element already in the document, near where ours
 *   will go, so the surface is read from the right place
 * @param {StorefrontTheme} [theme] the merchant's explicit visual choice
 * @returns {{ accent: Rgb, ink: Rgb | null, surface: Rgb, found: boolean }}
 */
export function resolveTheme(reference, theme) {
  const { accent, found } = configuredAccent(theme) ?? readAccent();
  const surface = surfaceUnder(reference);
  return {
    accent: ensureContrast(accent),
    // From the accent as read, never from the fill-corrected one: the fill correction
    // moves a pale colour further away from a white page, which is backwards here.
    ink: inkFor(accent, surface),
    surface,
    found,
  };
}

let installed = false;

/**
 * Publish the palette once, as custom properties on the document root, so the stylesheet
 * can use it without any of this logic leaking into CSS.
 *
 * Once, not per component: this is the only place in the bundle that calls
 * `getComputedStyle`, and doing it per catalogue tile forced a style flush on every step
 * of filtering and infinite scroll. Every component reads the same inherited tokens.
 *
 * @param {Element | null} [reference]
 * @param {StorefrontTheme} [theme]
 */
export function installTheme(reference = document.body, theme) {
  if (installed || !reference) return;

  const resolved = resolveTheme(reference, theme);
  const root = document.documentElement;
  root.style.setProperty('--cfp-accent', toCss(resolved.accent));
  root.style.setProperty('--cfp-accent-ink', resolved.ink ? toCss(resolved.ink) : 'currentColor');
  root.style.setProperty('--cfp-surface', toCss(resolved.surface));

  // Only lock it in once the accent came from the template. Running before Shoptet has
  // rendered the conversion button would otherwise cache the fallback grey for the life
  // of the page.
  installed = resolved.found;
}

/** Test seam: forget the resolved palette. */
export function resetTheme() {
  installed = false;
  normaliser = undefined;
}
