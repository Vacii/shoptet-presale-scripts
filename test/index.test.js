import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  activeCampaigns: vi.fn(() => []),
  load: vi.fn(
    /** @type {() => import('../src/config.js').PresaleConfig} */ (
      () => ({
        products: [],
        landing: null,
      })
    ),
  ),
  activeLanding: vi.fn(
    /** @type {(value: import('../src/config.js').PresaleConfig | null) => import('../src/config.js').LandingConfig | null} */ (
      (value) => value?.landing ?? null
    ),
  ),
  applyCatalogue: vi.fn(),
  translator: vi.fn(() => vi.fn()),
  applyLanding: vi.fn(),
  currentProductGuid: vi.fn(() => 'product-1'),
  onContentReady: vi.fn((handler) => handler()),
  pageType: vi.fn(),
  applyProductPage: vi.fn(),
  currentPath: vi.fn(() => '/'),
}));

vi.mock('../src/config.js', () => ({
  activeCampaigns: mocks.activeCampaigns,
  activeLanding: mocks.activeLanding,
  load: mocks.load,
}));
vi.mock('../src/catalogue.js', () => ({ applyCatalogue: mocks.applyCatalogue }));
vi.mock('../src/i18n.js', () => ({ translator: mocks.translator }));
vi.mock('../src/landing.js', () => ({ applyLanding: mocks.applyLanding }));
vi.mock('../src/product-page.js', () => ({ applyProductPage: mocks.applyProductPage }));
vi.mock('../src/shoptet.js', () => ({
  currentProductGuid: mocks.currentProductGuid,
  onContentReady: mocks.onContentReady,
  pageType: mocks.pageType,
}));
vi.mock('../src/url.js', () => ({ currentPath: mocks.currentPath }));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  mocks.load.mockReturnValue({ products: [], landing: null });
  mocks.activeLanding.mockReturnValue(null);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('the storefront entry point', () => {
  it.each(['productDetail', 'category', 'homepage', 'search', 'article', ''])(
    'does not fetch configuration on %s pages',
    async (type) => {
      mocks.pageType.mockReturnValue(type);
      const fetchMock = vi.spyOn(globalThis, 'fetch');

      await import('../src/index.js');

      expect(mocks.load).toHaveBeenCalledOnce();
      expect(mocks.applyLanding).not.toHaveBeenCalled();
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it('renders the inline landing config on its configured article path', async () => {
    const landing = { urlPath: '/predprodej', blocks: [{ block: { type: 'sale' } }] };
    const config = { products: [], landing, theme: { accentColor: '#123456' } };
    mocks.pageType.mockReturnValue('article');
    mocks.currentPath.mockReturnValue('/predprodej');
    mocks.load.mockReturnValue(config);
    mocks.activeLanding.mockImplementation((value) => value?.landing ?? null);
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    await import('../src/index.js');

    expect(mocks.activeLanding).toHaveBeenCalledWith(config);
    expect(mocks.applyLanding).toHaveBeenCalledWith(
      landing,
      expect.any(Function),
      '/predprodej',
      config.theme,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
