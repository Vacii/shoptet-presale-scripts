import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { translator } from '../src/i18n.js';
import { applyLanding } from '../src/landing.js';

const t = translator('cs');

/** @typedef {import('../src/config.js').LandingEntry} LandingEntry */

/** @param {ReadonlyArray<LandingEntry>} blocks @param {string} [urlPath] */
const page = (blocks, urlPath = '/predprodej') => ({ urlPath, blocks });
/** @param {Record<string, unknown>} payload @returns {LandingEntry} */
const block = (payload) => ({ block: payload });
const image = (url = 'https://cdn.example.com/a.jpg') => ({ url, kind: 'image', alt: 'Popis' });

beforeEach(() => {
  document.body.innerHTML =
    '<article class="article-detail"><p id="own">Text obchodníka</p></article>';
});

describe('which article gets touched', () => {
  it('leaves every other article in the shop alone', () => {
    // The previous version added its layout class to *every* article page before it had
    // even looked at the configuration, so each blog post became centred and grey.
    applyLanding(page([block({ type: 'banner', media: image() })]), t, '/blog/novinka');

    expect(document.querySelector('.cfp-landing')).toBeNull();
    expect(document.body.getAttribute('data-cfp-landing')).toBeNull();
  });

  it('matches the configured page through utm parameters and a trailing slash', () => {
    expect(
      applyLanding(
        page([block({ type: 'banner', media: image() })], '/Predprodej/'),
        t,
        '/predprodej',
      ),
    ).not.toBeNull();
  });

  it('keeps the merchant’s own content', () => {
    // `aboutContainer.innerHTML = ''` used to wipe it before rebuilding.
    applyLanding(page([block({ type: 'banner', media: image() })]), t, '/predprodej');

    expect(document.getElementById('own')?.textContent).toBe('Text obchodníka');
  });

  it('renders once, however many times the DOM event fires', () => {
    applyLanding(page([block({ type: 'banner', media: image() })]), t, '/predprodej');
    applyLanding(page([block({ type: 'banner', media: image() })]), t, '/predprodej');

    expect(document.querySelectorAll('.cfp-landing')).toHaveLength(1);
  });

  it('adds nothing when every block turned out empty', () => {
    applyLanding(page([block({ type: 'usps', items: [] })]), t, '/predprodej');

    expect(document.querySelector('.cfp-landing')).toBeNull();
  });

  it('tries again on the next update when nothing could be rendered', () => {
    // The article is claimed only once blocks exist, so an empty or failed first pass
    // does not lock the page out for the rest of the visit.
    applyLanding(page([block({ type: 'usps', items: [] })]), t, '/predprodej');
    applyLanding(page([block({ type: 'banner', media: image() })]), t, '/predprodej');

    expect(document.querySelectorAll('.cfp-landing')).toHaveLength(1);
  });

  it('names the section after the page title', () => {
    const landing = {
      ...page([block({ type: 'banner', media: image() })]),
      title: 'Jarní kolekce',
    };

    applyLanding(landing, t, '/predprodej');

    expect(document.querySelector('.cfp-landing')?.getAttribute('aria-label')).toBe(
      'Jarní kolekce',
    );
  });
});

describe('when the pre-sale ends while the page is open', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('takes the blocks down and keeps the merchant’s article', () => {
    vi.useFakeTimers();
    const endsAt = new Date(Date.now() + 60_000).toISOString();

    applyLanding(
      { ...page([block({ type: 'banner', media: image() })]), endsAt },
      t,
      '/predprodej',
    );
    expect(document.querySelector('.cfp-landing')).not.toBeNull();

    vi.advanceTimersByTime(61_000);

    expect(document.querySelector('.cfp-landing')).toBeNull();
    expect(document.getElementById('own')?.textContent).toBe('Text obchodníka');
  });
});

describe('media', () => {
  it('renders a video as a video, whatever the URL ends with', () => {
    // The old renderer sniffed `.mp4` off the end of the URL, so a CDN link with `?v=2`
    // rendered nothing.
    applyLanding(
      page([
        block({
          type: 'banner',
          media: { url: 'https://cdn.example.com/clip?v=2', kind: 'video', alt: '' },
        }),
      ]),
      t,
      '/predprodej',
    );

    const video = document.querySelector('.cfp-landing video');
    expect(video).not.toBeNull();
    // The customer starts it: controls, and nothing that plays or loops on its own.
    expect(video?.hasAttribute('controls')).toBe(true);
    expect(video?.hasAttribute('autoplay')).toBe(false);
    expect(video?.hasAttribute('loop')).toBe(false);
    // Without a description, the player is still announced as a video.
    expect(video?.getAttribute('aria-label')).toBe('Video');
  });

  it('names a player with no description, so it is not an unnamed frame', () => {
    applyLanding(
      page([
        block({
          type: 'banner',
          media: { url: 'https://youtu.be/dQw4w9WgXcQ', kind: 'embed', alt: '' },
        }),
      ]),
      t,
      '/predprodej',
    );

    expect(document.querySelector('.cfp-landing iframe')?.getAttribute('title')).toBe('Video');
  });

  it('names a linked picture without a description after the block heading', () => {
    applyLanding(
      page([
        block({
          type: 'banner',
          heading: 'Nová kolekce',
          media: { url: 'https://cdn.example.com/a.jpg', kind: 'image', alt: '', href: '/kolekce' },
        }),
      ]),
      t,
      '/predprodej',
    );

    expect(document.querySelector('.cfp-landing a')?.getAttribute('aria-label')).toBe(
      'Nová kolekce',
    );
  });

  it('renders a YouTube link as the provider’s player, not as a bare link', () => {
    applyLanding(
      page([
        block({
          type: 'banner',
          media: { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', kind: 'embed', alt: 'Klip' },
        }),
      ]),
      t,
      '/predprodej',
    );

    const frame = document.querySelector('.cfp-landing iframe');
    expect(frame?.getAttribute('src')).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
    expect(frame?.getAttribute('title')).toBe('Klip');
  });

  it('drops an embed whose link is from neither provider', () => {
    // Better an empty slot the preview reports than a frame the visitor cannot load.
    applyLanding(
      page([block({ type: 'banner', media: { url: 'https://example.com/video', kind: 'embed' } })]),
      t,
      '/predprodej',
    );

    expect(document.querySelector('.cfp-landing')).toBeNull();
  });

  it('drops media pointing at something that could execute', () => {
    applyLanding(
      page([
        block({ type: 'banner', media: { url: 'javascript:alert(1)', kind: 'image', alt: '' } }),
      ]),
      t,
      '/predprodej',
    );

    expect(document.querySelector('.cfp-landing')).toBeNull();
  });

  it('refuses a javascript: link but keeps the picture', () => {
    applyLanding(
      page([block({ type: 'banner', media: { ...image(), href: 'javascript:alert(1)' } })]),
      t,
      '/predprodej',
    );

    expect(document.querySelector('.cfp-landing img')).not.toBeNull();
    expect(document.querySelector('.cfp-landing a')).toBeNull();
  });
});

describe('questions', () => {
  it('is a real accordion, not a div with a triangle', () => {
    applyLanding(
      page([
        block({
          type: 'faq',
          items: [{ question: 'Kdy odesíláte?', answer: 'Po skončení předprodeje.' }],
        }),
      ]),
      t,
      '/predprodej',
    );

    const button = document.querySelector('.cfp-landing__question');
    const panel = document.querySelector('.cfp-landing__answer');

    expect(button?.getAttribute('aria-expanded')).toBe('false');
    expect(button?.getAttribute('aria-controls')).toBe(panel?.id);
    expect(panel?.hasAttribute('hidden')).toBe(true);

    button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(button?.getAttribute('aria-expanded')).toBe('true');
    expect(panel?.hasAttribute('hidden')).toBe(false);
  });

  it('puts each question in a heading, so screen readers can jump between them', () => {
    applyLanding(
      page([block({ type: 'faq', items: [{ question: 'Kdy?', answer: 'Brzy.' }] })]),
      t,
      '/predprodej',
    );

    expect(document.querySelector('.cfp-landing__question')?.parentElement?.tagName).toBe('H3');
  });

  it('gives each item its own ids, so two accordions do not collide', () => {
    applyLanding(
      page([
        block({
          type: 'faq',
          items: [
            { question: 'A', answer: '1' },
            { question: 'B', answer: '2' },
          ],
        }),
      ]),
      t,
      '/predprodej',
    );

    const ids = Array.from(document.querySelectorAll('.cfp-landing__answer')).map((n) => n.id);
    expect(new Set(ids).size).toBe(2);
  });
});

describe('block content', () => {
  it('writes merchant text as text', () => {
    applyLanding(
      page([block({ type: 'sale', text: '<b>Sleva</b>', code: 'PRED10', percent: 10 })]),
      t,
      '/predprodej',
    );

    expect(document.querySelector('.cfp-landing__sale-text')?.textContent).toBe('<b>Sleva</b>');
    expect(document.querySelector('.cfp-landing b')).toBeNull();
  });

  it('skips a block type it does not know instead of failing the page', () => {
    // The server can be deployed before the bundle reaches the shops.
    applyLanding(
      page([block({ type: 'something-new' }), block({ type: 'banner', media: image() })]),
      t,
      '/predprodej',
    );

    expect(document.querySelectorAll('.cfp-landing__block')).toHaveLength(1);
  });

  it('shows no placeholder copy when a field is empty', () => {
    // `Sleva 10 % na předobjednávky` and `10DAYS` were hard-coded in the old markup and
    // stayed on screen whenever the real content was missing.
    applyLanding(page([block({ type: 'sale', text: 'Předprodej' })]), t, '/predprodej');

    const text = document.querySelector('.cfp-landing')?.textContent ?? '';
    expect(text).not.toContain('10DAYS');
    expect(document.querySelector('.cfp-bar__code')).toBeNull();
  });

  it('renders the landing countdown before its block is inserted', () => {
    applyLanding(
      page([block({ type: 'countdown', endsAt: '2099-01-01T00:00:00Z' })]),
      t,
      '/predprodej',
    );

    expect(document.querySelector('.cfp-landing__countdown')?.textContent).toMatch(
      /\d{2}:\d{2}:\d{2}/,
    );
  });

  it('prioritizes only the first title banner image', () => {
    applyLanding(
      page([
        block({ type: 'title_banner', media: image() }),
        block({ type: 'banner', media: image('https://cdn.example.com/second.jpg') }),
      ]),
      t,
      '/predprodej',
    );

    const images = document.querySelectorAll('.cfp-landing img');
    expect(images[0]?.getAttribute('loading')).toBe('eager');
    expect(images[0]?.getAttribute('fetchpriority')).toBe('high');
    expect(images[1]?.getAttribute('loading')).toBe('lazy');
    expect(images[1]?.hasAttribute('fetchpriority')).toBe(false);
  });

  it('includes the title image in the customer photo rail', () => {
    applyLanding(
      page([
        block({ type: 'title_banner', media: image('https://cdn.example.com/first.jpg') }),
        block({
          type: 'ugc',
          items: [
            image('https://cdn.example.com/second.jpg'),
            image('https://cdn.example.com/third.jpg'),
          ],
        }),
      ]),
      t,
      '/predprodej',
    );

    expect(document.querySelector('.cfp-landing__rail')?.getAttribute('aria-label')).toBe(
      'Fotky od zákazníků',
    );
    const images = document.querySelectorAll('.cfp-landing__ugc-media');
    expect(images).toHaveLength(3);
    expect(images[0]?.getAttribute('src')).toBe('https://cdn.example.com/first.jpg');
    expect(images[1]?.getAttribute('src')).toBe('https://cdn.example.com/second.jpg');
    expect(images[2]?.getAttribute('src')).toBe('https://cdn.example.com/third.jpg');
  });
});
