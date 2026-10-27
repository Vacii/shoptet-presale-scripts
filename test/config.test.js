import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { activeCampaigns, activeLanding, load, readInline, SNIPPET_ID } from '../src/config.js';

/** @param {unknown} payload */
function putSnippet(payload) {
  const node = document.createElement('script');
  node.type = 'application/json';
  node.id = SNIPPET_ID;
  node.textContent = JSON.stringify(payload);
  document.head.appendChild(node);
}

beforeEach(() => {
  document.head.innerHTML = '';
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('reading the configuration out of the page', () => {
  it('reads campaign and landing data from the inline snippet without a request', () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    putSnippet({
      v: 3,
      eshopId: 1,
      products: [{ productGuid: 'a' }],
      landing: {
        urlPath: '/predprodej',
        title: 'Předprodej',
        blocks: [{ block: { type: 'sale', text: '</script>100 Kč' } }],
      },
      theme: { accentColor: '#123456' },
    });

    const config = load();

    expect(config?.products).toHaveLength(1);
    expect(config?.theme?.accentColor).toBe('#123456');
    expect(activeLanding(config)?.urlPath).toBe('/predprodej');
    expect(activeLanding(config)?.blocks[0]?.block).toEqual({
      type: 'sale',
      text: '</script>100 Kč',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ['missing', null],
    ['partial', { eshopId: 1, products: [{ productGuid: 'a' }], partial: true }],
    ['disabled', { eshopId: 1, products: [], disabled: true }],
  ])('fails closed for a %s config without making a request', (_name, payload) => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    if (payload) putSnippet(payload);

    expect(load()).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('drops a malformed entry and keeps everything else', () => {
    // One `null` used to throw inside the handler, which then rendered no campaign and
    // no landing block at all.
    putSnippet({
      products: [null, { productGuid: 'a' }, { productGuid: 7 }, 'b'],
      landing: {
        urlPath: '/predprodej',
        blocks: [null, { block: null }, { block: { type: 'sale', text: 'x' } }, 'faq'],
      },
    });

    const config = load();

    expect(config?.products.map((campaign) => campaign.productGuid)).toEqual(['a']);
    expect(config?.landing?.blocks).toEqual([{ block: { type: 'sale', text: 'x' } }]);
  });

  it('treats landing blocks that are not a list as none', () => {
    putSnippet({ products: [], landing: { urlPath: '/predprodej', blocks: { type: 'sale' } } });

    expect(load()?.landing?.blocks).toEqual([]);
  });

  it('survives a snippet that is not valid JSON', () => {
    const node = document.createElement('script');
    node.type = 'application/json';
    node.id = SNIPPET_ID;
    node.textContent = '{ not json';
    document.head.appendChild(node);

    expect(readInline()).toBeNull();
  });
});

describe('which campaigns belong on screen', () => {
  const now = new Date('2026-06-15T12:00:00Z');
  /** @param {Record<string, unknown>} [extra] */
  const campaign = (extra) => ({ productGuid: 'a', ...extra });

  it('shows one with no dates at all', () => {
    expect(activeCampaigns({ products: [campaign({})] }, now)).toHaveLength(1);
  });

  it('holds back one that has not started', () => {
    const scheduled = campaign({ startsAt: '2026-07-01T00:00:00Z' });
    expect(activeCampaigns({ products: [scheduled] }, now)).toHaveLength(0);

    const later = new Date('2026-07-02T00:00:00Z');
    expect(activeCampaigns({ products: [scheduled] }, later)).toHaveLength(1);
  });

  it('drops one that has ended, in a page nobody reloaded', () => {
    const ending = campaign({ endsAt: '2026-06-15T12:00:01Z' });
    expect(activeCampaigns({ products: [ending] }, now)).toHaveLength(1);

    const after = new Date('2026-06-15T12:00:02Z');
    expect(activeCampaigns({ products: [ending] }, after)).toHaveLength(0);
  });

  it('ignores an unparseable date rather than hiding the campaign', () => {
    expect(activeCampaigns({ products: [campaign({ endsAt: 'soon' })] }, now)).toHaveLength(1);
  });
});

describe('the landing page', () => {
  const now = new Date('2026-06-15T12:00:00Z');
  /** @param {Record<string, unknown>} [extra] */
  const config = (extra) => ({
    products: [],
    landing: { urlPath: '/predprodej', blocks: [], ...extra },
  });

  it('is shown while its pre-sale runs, or when it has no end', () => {
    expect(activeLanding(config({ endsAt: '2026-06-16T00:00:00Z' }), now)).not.toBeNull();
    expect(activeLanding(config({ endsAt: null }), now)).not.toBeNull();
  });

  it('is gone once its pre-sale has ended, in a page nobody reloaded', () => {
    expect(activeLanding(config({ endsAt: '2026-06-15T11:59:59Z' }), now)).toBeNull();
  });

  it('is absent when the shop has no landing page', () => {
    expect(activeLanding({ products: [] })).toBeNull();
    expect(activeLanding(null)).toBeNull();
  });
});
