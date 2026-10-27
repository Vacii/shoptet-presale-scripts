import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  blend,
  contrastRatio,
  ensureContrast,
  inkFor,
  installTheme,
  parseColour,
  parseLayer,
  readableForeground,
  relativeLuminance,
  resetTheme,
  surfaceUnder,
} from '../src/theme.js';

/** @typedef {[number, number, number]} Rgb */
/** @type {Rgb} */
const WHITE = [255, 255, 255];
/** @type {Rgb} */
const BLACK = [0, 0, 0];

afterEach(() => {
  vi.restoreAllMocks();
  resetTheme();
  document.documentElement.removeAttribute('style');
  document.body.innerHTML = '';
});

/**
 * Stand in for the canvas the browser gives us, so the normalisation path can be tested
 * without a canvas implementation. `fillStyle` keeps its previous value when assigned
 * something it cannot parse, which is the behaviour the trick depends on.
 *
 * @param {Record<string, string>} known
 */
function stubCanvas(known) {
  const ctx = {
    _value: '#000000',
    set fillStyle(value) {
      const resolved = known[value] ?? (/^#[0-9a-f]{6}$/i.test(value) ? value : null);
      if (resolved !== null) this._value = resolved;
    },
    get fillStyle() {
      return this._value;
    },
  };
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    /** @type {never} */ (/** @type {unknown} */ (ctx)),
  );
  resetTheme();
}

describe('reading a colour out of a computed style', () => {
  it('handles the forms a browser actually reports', () => {
    expect(parseColour('rgb(235, 72, 62)')).toEqual([235, 72, 62]);
    expect(parseColour('rgba(235, 72, 62, 1)')).toEqual([235, 72, 62]);
    expect(parseColour('#EB483E')).toEqual([235, 72, 62]);
    expect(parseColour('#fff')).toEqual([255, 255, 255]);
  });

  it('treats a transparent colour as no answer', () => {
    // A transparent button says nothing about the template's accent; the next candidate
    // should get a turn rather than the bar rendering against nothing.
    expect(parseColour('rgba(0, 0, 0, 0)')).toBeNull();
  });

  it('keeps the alpha when the caller needs it', () => {
    expect(parseLayer('rgba(0, 0, 0, 0.5)')).toEqual({ rgb: [0, 0, 0], alpha: 0.5 });
    expect(parseLayer('#fff')).toEqual({ rgb: [255, 255, 255], alpha: 1 });
  });

  it('understands whatever the browser understands, not whatever the regex does', () => {
    // The point of routing through a canvas. Chrome reports oklch() back from
    // getComputedStyle unchanged, so the regex-only version fell back to the hard-coded
    // grey on any template using modern colour syntax — silently, on every page.
    stubCanvas({ 'oklch(0.7 0.15 250)': '#3b82f6' });
    expect(parseColour('oklch(0.7 0.15 250)')).toEqual([59, 130, 246]);
  });

  it('still returns null for something the browser rejects too', () => {
    // Both sentinel reads disagree, which is how a rejected value is told apart from a
    // real one that happens to equal the sentinel.
    stubCanvas({});
    expect(parseColour('inherit')).toBeNull();
    expect(parseColour('not-a-colour')).toBeNull();
  });

  it('falls back to the regex where there is no canvas at all', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    resetTheme();
    expect(parseColour('rgb(1, 2, 3)')).toEqual([1, 2, 3]);
    expect(parseColour('oklch(0.7 0.15 250)')).toBeNull();
  });
});

describe('contrast', () => {
  it('agrees with the WCAG reference values', () => {
    expect(contrastRatio(WHITE, BLACK)).toBeCloseTo(21, 5);
    expect(contrastRatio(WHITE, WHITE)).toBeCloseTo(1, 5);
    expect(relativeLuminance(WHITE)).toBeCloseTo(1, 5);
    expect(relativeLuminance(BLACK)).toBeCloseTo(0, 5);
  });

  it("confirms the previous bundle's palette failed AA", () => {
    // White on #EB483E was the bar's colour on every shop. 3.9:1, below the 4.5 minimum.
    expect(contrastRatio(/** @type {Rgb} */ ([235, 72, 62]), WHITE)).toBeLessThan(4.5);
  });

  it('picks the foreground that reads better', () => {
    expect(readableForeground(WHITE)).toEqual(BLACK);
    expect(readableForeground(/** @type {Rgb} */ ([10, 10, 10]))).toEqual(WHITE);
  });
});

describe('making an inherited accent legible', () => {
  /** @type {Array<[string, Rgb]>} */
  const cases = [
    ['the old brand red', [235, 72, 62]],
    ['mid grey, where neither foreground passes', [128, 128, 128]],
    ['a bright yellow', [255, 214, 0]],
    ['a mid blue', [0, 122, 204]],
    ['near-white', [250, 250, 250]],
    ['near-black', [12, 12, 12]],
  ];

  it.each(cases)('clears 4.5:1 for %s', (_name, colour) => {
    const corrected = ensureContrast(colour);
    expect(contrastRatio(corrected, readableForeground(corrected))).toBeGreaterThanOrEqual(4.5);
  });

  it('leaves a colour alone when it already passes', () => {
    /** @type {Rgb} */
    const already = [12, 12, 12];
    expect(ensureContrast(already)).toEqual(already);
  });

  it('stays inside the byte range', () => {
    for (const [, colour] of cases) {
      for (const channel of ensureContrast(colour)) {
        expect(channel).toBeGreaterThanOrEqual(0);
        expect(channel).toBeLessThanOrEqual(255);
      }
    }
  });
});

describe('ink: the accent as text on the shop', () => {
  /** @type {Array<[string, Rgb]>} */
  const accents = [
    ['pale yellow', [250, 204, 21]],
    ['light green', [190, 242, 100]],
    ['the Shoptet red', [235, 72, 62]],
    ['dark navy', [15, 23, 42]],
    ['a mid blue', [0, 122, 204]],
    ['mid grey', [128, 128, 128]],
  ];

  /** @type {Array<[string, Rgb]>} */
  const surfaces = [
    ['white', [255, 255, 255]],
    ['off-white', [246, 246, 246]],
    ['a dark theme', [17, 17, 17]],
    ['near-black', [8, 10, 14]],
  ];

  for (const [surfaceName, surface] of surfaces) {
    it.each(accents)(`clears 4.5:1 on ${surfaceName} for %s`, (_name, accent) => {
      const ink = inkFor(accent, surface);
      // null is the honest answer, and the caller renders currentColor instead.
      if (ink === null) return;
      expect(contrastRatio(ink, surface)).toBeGreaterThanOrEqual(4.5);
      // The bar and the sale block paint the accent over the page at 8%, so the ink has
      // to clear AA on the tinted surface too, not only the bare one.
      expect(contrastRatio(ink, blend(accent, surface, 0.08))).toBeGreaterThanOrEqual(4.5);
    });
  }

  it('answers for every accent on the surfaces a shop actually uses', () => {
    for (const [, accent] of accents) {
      for (const [, surface] of surfaces) {
        expect(inkFor(accent, surface)).not.toBeNull();
      }
    }
  });

  it('gives up rather than paint black and call it the brand', () => {
    // A mid-grey page is reachable only by pushing the accent ~90% of the way to black,
    // at which point it is not the shop's colour any more. The caller falls back to
    // currentColor, which the theme has already made legible.
    expect(inkFor(/** @type {Rgb} */ ([200, 30, 30]), /** @type {Rgb} */ ([128, 128, 128]))).toBe(
      null,
    );
  });

  it('leaves an accent that already passes exactly as it is', () => {
    /** @type {Rgb} */
    const navy = [15, 23, 42];
    expect(inkFor(navy, WHITE)).toEqual(navy);
  });

  it('moves the accent the way the surface needs, not the way the fill did', () => {
    // The bug this token exists for: `ensureContrast` pushes a pale yellow *lighter*,
    // because white was already the winning foreground against it. As ink on a white
    // page it has to go the other way.
    /** @type {Rgb} */
    const paleYellow = [250, 204, 21];
    const ink = /** @type {Rgb} */ (inkFor(paleYellow, WHITE));
    expect(relativeLuminance(ink)).toBeLessThan(relativeLuminance(paleYellow));
    expect(relativeLuminance(ensureContrast(paleYellow))).toBeGreaterThanOrEqual(
      relativeLuminance(paleYellow),
    );
  });

  it('keeps the hue, so the shop still recognises its own colour', () => {
    /** @type {Rgb} */
    const red = [235, 72, 62];
    const [r, g, b] = /** @type {Rgb} */ (inkFor(red, WHITE));
    expect(r).toBeGreaterThan(g);
    expect(g).toBeGreaterThanOrEqual(b);
  });
});

describe('the surface an element is painted on', () => {
  it('composites translucent layers down to the first opaque one', () => {
    document.body.innerHTML = '<div id="outer"><div id="inner"></div></div>';
    const outer = /** @type {HTMLElement} */ (document.getElementById('outer'));
    const inner = /** @type {HTMLElement} */ (document.getElementById('inner'));
    outer.style.backgroundColor = 'rgb(0, 0, 0)';
    inner.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';

    const surface = surfaceUnder(inner);
    for (const channel of surface) expect(channel).toBeCloseTo(127.5, 1);
  });

  it('assumes white when nothing in the tree paints a background', () => {
    document.body.innerHTML = '<div id="plain"></div>';
    expect(surfaceUnder(document.getElementById('plain'))).toEqual(WHITE);
  });
});

describe('publishing the palette', () => {
  it('writes the colour tokens onto the document root, once', () => {
    document.body.innerHTML = '<a class="btn-conversion">Buy</a><div id="anchor"></div>';
    const button = /** @type {HTMLElement} */ (document.querySelector('.btn-conversion'));
    button.style.backgroundColor = 'rgb(250, 204, 21)';

    installTheme(document.getElementById('anchor'));

    const root = document.documentElement.style;
    expect(root.getPropertyValue('--cfp-accent')).not.toBe('');
    expect(root.getPropertyValue('--cfp-accent-ink')).not.toBe('');
    expect(root.getPropertyValue('--cfp-surface')).toBe('rgb(255, 255, 255)');

    // The ink and the fill are different answers for the same accent — which is the
    // whole point of there being two tokens.
    expect(root.getPropertyValue('--cfp-accent-ink')).not.toBe(
      root.getPropertyValue('--cfp-accent'),
    );
  });

  it('prefers the merchant accent over the shop button', () => {
    document.body.innerHTML = '<a class="btn-conversion">Buy</a><div id="anchor"></div>';
    const button = /** @type {HTMLElement} */ (document.querySelector('.btn-conversion'));
    button.style.backgroundColor = 'rgb(250, 204, 21)';

    installTheme(document.getElementById('anchor'), { accentColor: '#123456' });

    expect(document.documentElement.style.getPropertyValue('--cfp-accent')).toBe('rgb(18, 52, 86)');
  });

  it('ignores an invalid merchant accent and keeps looking for the shop colour', () => {
    document.body.innerHTML = '<a class="btn-conversion">Buy</a><div id="anchor"></div>';
    const button = /** @type {HTMLElement} */ (document.querySelector('.btn-conversion'));
    button.style.backgroundColor = 'rgb(0, 122, 204)';

    installTheme(document.getElementById('anchor'), { accentColor: '#123' });

    expect(document.documentElement.style.getPropertyValue('--cfp-accent')).toBe(
      'rgb(0, 122, 204)',
    );
  });

  it('does not lock in the fallback when the template has not rendered yet', () => {
    document.body.innerHTML = '<div id="anchor"></div>';
    installTheme(document.getElementById('anchor'));
    const fallback = document.documentElement.style.getPropertyValue('--cfp-accent');

    // The conversion button appears later, as Shoptet finishes rendering the page.
    document.body.innerHTML = '<a class="btn-conversion">Buy</a><div id="anchor"></div>';
    const button = /** @type {HTMLElement} */ (document.querySelector('.btn-conversion'));
    button.style.backgroundColor = 'rgb(0, 122, 204)';
    installTheme(document.getElementById('anchor'));

    expect(document.documentElement.style.getPropertyValue('--cfp-accent')).not.toBe(fallback);
  });

  it('falls back to currentColor rather than to an illegible colour', () => {
    document.body.innerHTML = '<a class="btn-conversion">Buy</a><div id="anchor"></div>';
    const button = /** @type {HTMLElement} */ (document.querySelector('.btn-conversion'));
    button.style.backgroundColor = 'rgb(200, 30, 30)';
    const anchor = /** @type {HTMLElement} */ (document.getElementById('anchor'));
    anchor.style.backgroundColor = 'rgb(128, 128, 128)';

    installTheme(anchor);

    expect(document.documentElement.style.getPropertyValue('--cfp-accent-ink')).toBe(
      'currentColor',
    );
  });
});
