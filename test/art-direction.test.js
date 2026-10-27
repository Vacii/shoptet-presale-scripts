/**
 * The kill list from the art direction (README.md), enforced.
 *
 * A direction erodes one reasonable local decision at a time — a shadow here to lift a
 * card, a `!important` there to win against a theme, a sticky bar because it converts
 * better. Each is defensible alone. Together they are how the previous version ended up
 * overriding `main`, `.availability-value` and `.swiper*` in somebody else's shop.
 *
 * These read the shipped stylesheets, so they fail on the actual output rather than on
 * intent. Changing one of them is allowed — but it has to be a decision, taken in the
 * document first.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { blend, contrastRatio, ensureContrast, inkFor, readableForeground } from '../src/theme.js';

/** @typedef {[number, number, number]} Rgb */

// Deliberately not `new URL(path, import.meta.url)`: Vite treats that pattern as an
// asset reference and rewrites it, so the test ends up reading itself.
const STYLES = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'styles');

/** @param {string} name */
function stylesheet(name) {
  return readFileSync(join(STYLES, name), 'utf8');
}

const SHEETS = /** @type {const} */ ([
  ['bar.css', stylesheet('bar.css')],
  ['landing.css', stylesheet('landing.css')],
]);

/**
 * Strip comments, so prose about `!important` does not fail the check on `!important`.
 * @param {string} css
 */
function rules(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

for (const [name, css] of SHEETS) {
  describeSheet(name, css);
}

/**
 * @param {string} name
 * @param {string} css
 */
function describeSheet(name, css) {
  describe(`${name} stays inside the direction`, () => {
    const source = rules(css);

    it('never uses !important', () => {
      // We are a guest. Winning a specificity fight against the merchant's own stylesheet
      // is how an addon breaks a shop it was only supposed to add to.
      expect(source).not.toMatch(/!\s*important/);
    });

    it('never takes the viewport edges', () => {
      // The host theme owns those: a sticky bar of ours lands on their cart or their header.
      // The copy fallback's textarea is exempt: it is invisible and lives for one select().
      const visible = source.replace(/\.cfp-copy-buffer\s*\{[^}]*\}/, '');
      expect(visible).not.toMatch(/position:\s*(fixed|sticky)/);
    });

    it('paints no depth of its own', () => {
      // A shadow of ours would sit at the wrong elevation in half the themes on the platform.
      expect(source).not.toMatch(/(?:box|text)-shadow/);
      expect(source).not.toMatch(/gradient\(/);
    });

    it('ships no colour beyond the two declared fallbacks', () => {
      // Every real value is derived at runtime from the shop's own accent.
      const hexes = new Set(source.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []);
      for (const hex of hexes) {
        expect(['#1b1b1b', '#fff'], `unexpected hard-coded colour ${hex}`).toContain(hex);
      }
    });

    it('scopes every class to cfp-', () => {
      const matched = source.match(/\.[a-zA-Z][\w-]*/g) ?? [];
      const classes = new Set(matched.map(/** @param {string} c */ (c) => c.slice(1)));
      for (const name of classes) {
        expect(name.startsWith('cfp-'), `unscoped class .${name}`).toBe(true);
      }
    });

    it('never uses the fill accent as a foreground', () => {
      // The two tokens carry different guarantees. `--cfp-accent` is only ever proven
      // legible *underneath* black or white; using it as text, a border or a focus ring
      // on the shop's own page proves nothing at all — a pale yellow conversion button
      // lands at 1.5:1 that way. `--cfp-accent-ink` is the one corrected against the
      // surface it is painted on.
      const foreground =
        source.match(/(?:^|[;{\s])(?:color|border[\w-]*|outline[\w-]*):[^;]*/g) ?? [];
      for (const declaration of foreground) {
        // `color-mix(… var(--cfp-accent) N%, transparent)` is exempt: mixing towards
        // transparent is a tint of the surface, which is a decorative edge rather than a
        // foreground making a legibility claim. `.cfp-bar`'s outline is the one such
        // case, and the panel behind it carries the shape anyway.
        if (declaration.includes('color-mix')) continue;
        expect(
          declaration.includes('var(--cfp-accent)'),
          `${declaration.trim()} — use --cfp-accent-ink`,
        ).toBe(false);
      }
    });

    it('uses px only for the documented type floor', () => {
      // rem and em keep the scale responsive to the reader's browser setting. The deliberate
      // 16px floors protect both components from a host 10px root.
      const sizes =
        source.match(
          /(?:font-size|line-height|padding(?:-[\w-]+)?|margin(?:-[\w-]+)?|gap|border(?:-[\w-]+)?|outline(?:-[\w-]+)?|(?:min-)?(?:width|height)):[^;]*\d+(?:\.\d+)?px[^;]*/g,
        ) ?? [];
      expect(sizes).toEqual(['font-size: max(1rem, 16px)']);
    });
  });
}

describe("borrowing the shop's accent without borrowing its contrast", () => {
  // "No colour of our own" is the direction. The obligation that comes with it is that
  // whatever we inherit still clears AA — on the fill *and* as ink on the page, which
  // are different guarantees. This shipped with only the first one proven, and the
  // second was wrong by a factor of three on every pale conversion button on the
  // platform: corrected yellow read 1.53:1 as text on white.
  //
  // Sampled rather than exhaustive, but sampled over the shapes that actually break:
  // pale, saturated, and near-black accents against light and dark shop backgrounds.
  const ACCENTS = /** @type {const} */ ([
    ['pale yellow', [250, 204, 21]],
    ['light green', [190, 242, 100]],
    ['the Shoptet red', [235, 72, 62]],
    ['dark navy', [15, 23, 42]],
    ['a mid blue', [0, 122, 204]],
    ['a warm grey', [163, 155, 145]],
  ]);

  const SURFACES = /** @type {const} */ ([
    ['white', [255, 255, 255]],
    ['off-white', [246, 246, 246]],
    ['a dark theme', [17, 17, 17]],
  ]);

  for (const [accentName, accent] of ACCENTS) {
    for (const [surfaceName, surface] of SURFACES) {
      it(`reads ${accentName} on ${surfaceName} at 4.5:1 or better`, () => {
        const fill = ensureContrast(/** @type {Rgb} */ ([...accent]));
        // The fill: black or white on the corrected accent.
        expect(contrastRatio(fill, readableForeground(fill))).toBeGreaterThanOrEqual(4.5);

        // The ink: the accent as text on the shop's page, and on the 8% panel over it.
        const ink = inkFor(/** @type {Rgb} */ ([...accent]), /** @type {Rgb} */ ([...surface]));
        expect(
          ink,
          'no shade of this accent was usable — the CSS falls back to currentColor',
        ).not.toBeNull();
        const panel = blend(
          /** @type {Rgb} */ ([...accent]),
          /** @type {Rgb} */ ([...surface]),
          0.08,
        );
        expect(
          contrastRatio(/** @type {Rgb} */ (ink), /** @type {Rgb} */ ([...surface])),
        ).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(/** @type {Rgb} */ (ink), panel)).toBeGreaterThanOrEqual(4.5);
      });
    }
  }
});

describe('motion', () => {
  const bar = rules(stylesheet('bar.css'));
  const landing = rules(stylesheet('landing.css'));

  it('is additive, so reduced motion cannot hide the bar', () => {
    // The usual shape — `opacity: 0` in the base rule, animation switched off under
    // `prefers-reduced-motion: reduce` — leaves the element permanently invisible to
    // anyone with that setting on. So the animation is attached under `no-preference`
    // instead, and there is no blanket `reduce` block anywhere.
    expect(bar).toContain('prefers-reduced-motion: no-preference');
    expect(bar).not.toContain('prefers-reduced-motion: reduce');
    expect(landing).not.toContain('prefers-reduced-motion');
  });

  it('has exactly one animation in the whole bundle', () => {
    expect(bar.match(/@keyframes/g) ?? []).toHaveLength(1);
    expect(bar).toContain('@keyframes cfp-rise');
    expect(landing).not.toContain('@keyframes');
  });

  it('never animates the countdown', () => {
    // A number that pulses is the visual signature of manufactured urgency, and the
    // previous version ran an infinite blink on the countdown separators.
    for (const css of [bar, landing]) {
      const countdownRules = css.match(/\.cfp-[\w-]*(countdown|clock)[^{]*\{[^}]*\}/g) ?? [];
      expect(countdownRules.length).toBeGreaterThan(0);
      for (const rule of countdownRules) {
        expect(rule).not.toMatch(/animation|transition/);
      }
    }
  });
});

describe('the widget keeps secondary actions light', () => {
  const bar = rules(stylesheet('bar.css'));

  it('uses the accent as a tint for the badge, not as a solid chip', () => {
    expect(bar).toMatch(
      /\.cfp-badge\s*\{[\s\S]*background:\s*color-mix\(in srgb, var\(--cfp-accent\) 12%, var\(--cfp-surface\)\)/,
    );
    expect(bar).not.toMatch(/\.cfp-badge\s*\{[\s\S]*background:\s*var\(--cfp-accent\)/);
  });

  it('keeps the discount code as neutral text', () => {
    expect(bar).toMatch(/\.cfp-bar__code\s*\{[\s\S]*background:\s*transparent/);
    expect(bar).toMatch(/\.cfp-bar__code\s*\{[\s\S]*color:\s*inherit/);
  });
});

describe('the shop’s own markup', () => {
  it('is never styled by the widget', () => {
    // The purchase block, price and availability belong to the template, and Shoptet's
    // scripts and other addons rely on them looking and sitting the way it made them.
    // Attribute selectors were how the widget used to reach into them.
    for (const [, css] of SHEETS) {
      expect(rules(css)).not.toMatch(/\[class[~*^$|]?=/);
    }
  });
});
