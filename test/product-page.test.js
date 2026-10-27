import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { applyCatalogue } from '../src/catalogue.js';
import { translator } from '../src/i18n.js';
import { applyProductPage } from '../src/product-page.js';

const t = translator('cs');

const campaign = (extra = {}) => ({
  productGuid: 'guid-1',
  endsAt: '2099-01-01T00:00:00Z',
  discountCode: 'PRED10',
  inStock: false,
  ...extra,
});

/**
 * The main product's area, as every template wraps it.
 * @param {string} inner
 */
const detail = (inner) => `<div class="p-detail"><div class="p-detail-inner">${inner}</div></div>`;

/** The purchase block as Disco, Samba and Step render it, inside the product form. */
const DISCO_FORM = `
  <form id="product-detail-form">
    <table class="detail-parameters">
      <tr><td><span class="availability-label">Skladem</span></td></tr>
    </table>
    <div class="p-to-cart-block">
      <div class="p-final-price-wrapper">
        <strong class="price-final"><span class="price-final-holder">350 Kč</span></strong>
      </div>
      <div class="add-to-cart">
        <span class="quantity"><input class="amount" name="amount" value="1"></span>
      </div>
      <button class="btn btn-conversion add-to-cart-button" type="submit">Do košíku</button>
    </div>
  </form>`;

/** @param {string} html */
const render = (html) => {
  document.body.innerHTML = html;
};

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('where the widget goes', () => {
  it('sits directly before the shop’s purchase block and leaves it untouched', () => {
    render(detail(DISCO_FORM));
    const block = document.querySelector('.p-to-cart-block');
    const form = document.getElementById('product-detail-form');

    applyProductPage([campaign()], 'guid-1', t);

    const bar = document.querySelector('.cfp-bar');
    expect(bar?.nextElementSibling).toBe(block);
    expect(block?.parentElement).toBe(form);
    expect(block?.className).toBe('p-to-cart-block');
    expect(bar?.contains(block ?? null)).toBe(false);
    expect(block?.querySelector('.amount')).not.toBeNull();
  });

  it('moves to the whole row when the block shares a row with the price', () => {
    // Tango puts `.add-to-cart` in a Bootstrap row beside the price; the widget would
    // be squeezed into a column there.
    render(
      detail(`
        <form id="product-detail-form">
          <div class="detail-parameters"></div>
          <div class="price row">
            <div class="p-final-price-wrapper col-xs-12"></div>
            <div class="add-to-cart col-xs-12">
              <button class="btn btn-conversion add-to-cart-button">Do košíku</button>
            </div>
          </div>
        </form>`),
    );

    applyProductPage([campaign()], 'guid-1', t);

    expect(document.querySelector('.cfp-bar')?.nextElementSibling?.className).toBe('price row');
  });

  it('goes before a variant table, and every variant’s button says pre-order', () => {
    render(`
      <div class="p-detail">
        <div class="p-detail-inner"></div>
        <div class="variant-table">
          <form><button class="add-to-cart-button">Do košíku</button></form>
          <form><button class="add-to-cart-button">Do košíku</button></form>
        </div>
      </div>`);

    applyProductPage([campaign()], 'guid-1', t);

    expect(document.querySelector('.cfp-bar')?.nextElementSibling?.className).toBe('variant-table');
    const labels = Array.from(document.querySelectorAll('.add-to-cart-button')).map(
      (button) => button.textContent,
    );
    expect(labels).toEqual(['Předobjednat', 'Předobjednat']);
  });

  it('falls back to the product details when there is no purchase block', () => {
    render(detail('<div class="detail-parameters"></div><p class="after"></p>'));

    applyProductPage([campaign()], 'guid-1', t);

    expect(document.querySelector('.cfp-bar')?.previousElementSibling?.className).toBe(
      'detail-parameters',
    );
  });

  it('does nothing at all, quietly, outside a product detail', () => {
    render('<div class="add-to-cart"><button class="add-to-cart-button">Do košíku</button></div>');

    expect(() => {
      applyProductPage([campaign()], 'guid-1', t);
    }).not.toThrow();
    expect(document.querySelector('.cfp-bar')).toBeNull();
    expect(document.querySelector('.add-to-cart-button')?.textContent).toBe('Do košíku');
  });

  it('never touches a related product’s tile on the same page', () => {
    // Step and Techno render related products inside `.p-detail`, each with its own
    // conversion button and availability.
    render(`
      <div class="p-detail">
        <div class="products">
          <div class="p" data-micro-identifier="guid-2">
            <span class="availability-label">Skladem</span>
            <div class="add-to-cart"><button class="add-to-cart-button">Do košíku</button></div>
          </div>
        </div>
      </div>`);

    applyProductPage([campaign()], 'guid-1', t);

    expect(document.querySelector('.cfp-bar')).toBeNull();
    expect(document.querySelector('.add-to-cart-button')?.textContent).toBe('Do košíku');
    expect(document.querySelector('.availability-label')?.textContent).toBe('Skladem');
  });

  it('offers no order button of its own; the shop’s button is the only one', () => {
    render(detail(DISCO_FORM));

    applyProductPage([campaign({ discountPercent: 10 })], 'guid-1', t);

    expect(document.querySelectorAll('.cfp-bar button:not(.cfp-bar__copy)')).toHaveLength(0);
    expect(document.querySelectorAll('button.add-to-cart-button')).toHaveLength(1);
  });
});

describe('running again after a Shoptet DOM update', () => {
  it('does not insert a second widget', () => {
    render(detail(DISCO_FORM));

    applyProductPage([campaign()], 'guid-1', t);
    applyProductPage([campaign()], 'guid-1', t);
    applyProductPage([campaign()], 'guid-1', t);

    expect(document.querySelectorAll('.cfp-bar')).toHaveLength(1);
  });

  it('replaces the widget when a variant update replaces the purchase block', () => {
    render(detail(DISCO_FORM));

    applyProductPage([campaign()], 'guid-1', t);
    const fresh = document.createElement('div');
    fresh.className = 'p-to-cart-block';
    document.querySelector('.p-to-cart-block')?.replaceWith(fresh);
    applyProductPage([campaign()], 'guid-1', t);

    expect(document.querySelectorAll('.cfp-bar')).toHaveLength(1);
    expect(document.querySelector('.cfp-bar')?.nextElementSibling).toBe(fresh);
  });

  it('keeps the availability row clean when the widget rendered', () => {
    render(detail(DISCO_FORM));

    applyProductPage([campaign()], 'guid-1', t);
    applyProductPage([campaign()], 'guid-1', t);

    expect(document.querySelectorAll('.cfp-hint')).toHaveLength(0);
    expect(document.querySelector('.cfp-bar__availability')?.textContent).toBe(
      'Zatím není skladem. Objednávku vyřídíme hned, jakmile bude zboží naskladněno.',
    );
  });

  it('does not add a fallback note when only availability was re-rendered', () => {
    render(detail(DISCO_FORM));

    applyProductPage([campaign()], 'guid-1', t);
    document.querySelector('.availability-label')?.replaceWith(
      Object.assign(document.createElement('span'), {
        className: 'availability-label',
        textContent: 'Skladem',
      }),
    );
    applyProductPage([campaign()], 'guid-1', t);

    expect(document.querySelectorAll('.cfp-bar')).toHaveLength(1);
    expect(document.querySelectorAll('.cfp-hint')).toHaveLength(0);
  });

  it('explains the pre-sale beside the availability when the widget has no place', () => {
    render(detail('<span class="availability-label">Skladem</span>'));

    applyProductPage([campaign()], 'guid-1', t);

    expect(document.querySelector('.cfp-bar')).toBeNull();
    expect(document.querySelector('.cfp-hint')?.getAttribute('role')).toBe('note');
  });
});

describe('what reaches the page', () => {
  it('renders merchant text as text, never as markup', () => {
    render(detail(DISCO_FORM));
    const nasty = '<img src=x onerror=alert(1)>';

    applyProductPage([campaign({ bannerText: nasty })], 'guid-1', t);

    const caption = document.querySelector('.cfp-bar__caption');
    expect(caption?.textContent).toBe(nasty);
    expect(document.querySelector('.cfp-bar img')).toBeNull();
  });

  it('relabels the conversion button and keeps the original label', () => {
    render(detail(DISCO_FORM));

    applyProductPage([campaign()], 'guid-1', t);

    const button = document.querySelector('.add-to-cart-button');
    expect(button?.textContent).toBe('Předobjednat');
    expect(button?.getAttribute('data-cfp-original-label')).toBe('Do košíku');
  });

  it('leaves the template’s icon inside the conversion button', () => {
    // Most Shoptet templates put an icon element in there. Writing `textContent`, which
    // is what this did, deleted it — so the button lost its cart glyph the moment a
    // campaign started.
    render(
      detail(`
        <div class="add-to-cart">
          <button class="add-to-cart-button"><i class="icon-cart"></i> Do košíku</button>
        </div>`),
    );

    applyProductPage([campaign()], 'guid-1', t);

    const button = document.querySelector('.add-to-cart-button');
    expect(button?.querySelector('.icon-cart')).not.toBeNull();
    expect(button?.textContent?.trim()).toBe('Předobjednat');
  });

  it('keeps the button’s spoken name in step with its words', () => {
    vi.useFakeTimers();
    render(
      detail(`
        <div class="add-to-cart">
          <button class="add-to-cart-button" aria-label="Do košíku Polštář">Do košíku</button>
        </div>`),
    );

    applyProductPage(
      [campaign({ endsAt: new Date(Date.now() + 60_000).toISOString() })],
      'guid-1',
      t,
    );
    const button = document.querySelector('.add-to-cart-button');
    expect(button?.getAttribute('aria-label')).toBe('Předobjednat Polštář');

    vi.advanceTimersByTime(61_000);
    vi.useRealTimers();

    expect(button?.getAttribute('aria-label')).toBe('Do košíku Polštář');
  });

  it('leaves a button that has only an icon alone', () => {
    render(
      detail(`
        <div class="add-to-cart">
          <button class="add-to-cart-button"><i class="icon-cart"></i></button>
        </div>`),
    );

    applyProductPage([campaign()], 'guid-1', t);

    expect(document.querySelector('.add-to-cart-button')?.textContent).toBe('');
  });

  it('renders the countdown as four labelled cells after its caption', () => {
    // The caption and fixed deadline come first for a screen reader. CSS places the
    // tabular cells below them, where the deadline is easy to scan without moving text.
    render(detail(DISCO_FORM));

    applyProductPage([campaign()], 'guid-1', t);

    const clock = document.querySelector('.cfp-bar__clock');
    expect(clock?.firstElementChild?.className).toBe('cfp-bar__caption');
    expect(clock?.lastElementChild?.className).toBe('cfp-bar__countdown');
    expect(clock?.querySelectorAll('.cfp-bar__unit')).toHaveLength(4);
    expect(clock?.querySelectorAll('.cfp-bar__value')).toHaveLength(4);
    expect(clock?.querySelectorAll('.cfp-bar__unit-label')).toHaveLength(4);
    expect(clock?.querySelector('.cfp-bar__countdown')?.getAttribute('role')).toBe('timer');
  });

  it('shows the fixed deadline, then the discount with one copy action last', () => {
    render(detail(DISCO_FORM));

    applyProductPage([campaign({ discountPercent: 20 })], 'guid-1', t);

    const expectedTime = new Intl.DateTimeFormat('cs-CZ', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date('2099-01-01T00:00:00Z'));
    expect(document.querySelector('.cfp-bar__date')?.textContent).toBe(
      `Končí 1. 1. 2099 v ${expectedTime}`,
    );
    const offer = document.querySelector('.cfp-bar')?.lastElementChild;
    if (!offer) throw new Error('the widget is empty');
    expect(offer.className).toBe('cfp-bar__offer');
    expect(offer.querySelector('.cfp-bar__benefit')?.textContent).toBe('Sleva 20 %');
    expect(offer.querySelectorAll('.cfp-bar__copy')).toHaveLength(1);
    const copy = offer.querySelector('.cfp-bar__copy');
    expect(copy?.getAttribute('aria-label')).toBe('Zkopírovat kód: PRED10');
    expect(offer.querySelector('.cfp-bar__code')?.textContent).toBe('PRED10');
  });

  it('prints the merchant’s note once, with the availability explanation', () => {
    render(detail(DISCO_FORM));
    const info = 'Odesíláme do tří dnů po skončení předprodeje.';

    applyProductPage([campaign({ infoText: info })], 'guid-1', t);

    const occurrences = (document.body.textContent ?? '').split(info).length - 1;
    expect(occurrences).toBe(1);
    expect(document.querySelector('.cfp-bar__availability .cfp-bar__info')?.textContent).toBe(info);
  });

  it('adds nothing extra to the widget when the merchant wrote nothing', () => {
    render(detail(DISCO_FORM));

    applyProductPage(
      [campaign({ infoText: null, discountCode: null, discountPercent: null })],
      'guid-1',
      t,
    );

    expect(document.querySelector('.cfp-bar__info')).toBeNull();
    expect(document.querySelector('.cfp-bar__offer')).toBeNull();
  });

  it('skips a product the shop can actually ship', () => {
    render(detail(DISCO_FORM));

    applyProductPage([campaign({ inStock: true })], 'guid-1', t);

    expect(document.querySelector('.cfp-bar')).toBeNull();
  });

  it('ignores a campaign for a different product', () => {
    render(detail(DISCO_FORM));

    applyProductPage([campaign()], 'another-guid', t);

    expect(document.querySelector('.cfp-bar')).toBeNull();
  });
});

describe('the catalogue listing', () => {
  it('finds the product by its identifier, not by reading the availability text', () => {
    // The previous version looked for a span whose text was exactly 'Skladem', which
    // matches nothing on a Slovak shop and nothing on `Skladem (3 ks)`.
    render(`
      <div class="p" data-micro-identifier="guid-1">
        <div class="p-in-in"><a href="/produkt"></a></div>
        <div class="availability"><span>Skladem (3 ks)</span></div>
      </div>`);

    applyCatalogue([campaign()], t);

    expect(document.querySelector('.cfp-badge')).not.toBeNull();
    expect(document.querySelector('.availability span')?.textContent).toBe('Předprodej');
  });

  it('survives a guid containing a quote', () => {
    render(`<div class="p" data-micro-identifier='a"b'></div>`);

    expect(() => {
      applyCatalogue([campaign({ productGuid: 'a"b' })], t);
    }).not.toThrow();
    expect(document.querySelector('.cfp-badge')).not.toBeNull();
  });

  it('marks every tile for a product that appears more than once', () => {
    render(`
      <div class="p" data-micro-identifier="guid-1"></div>
      <div class="p" data-micro-identifier="guid-1"></div>`);

    applyCatalogue([campaign()], t);

    expect(document.querySelectorAll('.cfp-badge')).toHaveLength(2);
  });

  it('does not mark the same tile twice when the listing re-renders', () => {
    render('<div class="p" data-micro-identifier="guid-1"></div>');

    applyCatalogue([campaign()], t);
    applyCatalogue([campaign()], t);

    expect(document.querySelectorAll('.cfp-badge')).toHaveLength(1);
  });
});

describe('when the campaign runs out while the page is open', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  /** @param {number} inMs */
  const ending = (inMs) => campaign({ endsAt: new Date(Date.now() + inMs).toISOString() });

  it('gives the conversion button its own label back', () => {
    vi.useFakeTimers();
    render(
      detail(`
        <div class="add-to-cart">
          <button class="add-to-cart-button"><i class="icon-cart"></i> Do košíku</button>
        </div>`),
    );

    applyProductPage([ending(60_000)], 'guid-1', t);
    const button = document.querySelector('.add-to-cart-button');
    expect(button?.textContent?.trim()).toBe('Předobjednat');

    vi.advanceTimersByTime(61_000);

    expect(button?.textContent?.trim()).toBe('Do košíku');
    expect(button?.querySelector('.icon-cart')).not.toBeNull();
  });

  it('takes the widget and the pre-sale wording down together', () => {
    vi.useFakeTimers();
    render(detail(DISCO_FORM));

    applyProductPage([ending(60_000)], 'guid-1', t);
    expect(document.querySelector('.cfp-bar')).not.toBeNull();

    vi.advanceTimersByTime(61_000);

    const label = document.querySelector('.availability-label');
    expect(label?.textContent).toBe('Skladem');
    expect(label?.classList.contains('cfp-availability')).toBe(false);
    expect(document.querySelector('.cfp-hint')).toBeNull();
    expect(document.querySelector('.cfp-bar')).toBeNull();
    expect(document.querySelector('.p-to-cart-block')).not.toBeNull();
  });

  it('does nothing to a campaign with no end date', () => {
    vi.useFakeTimers();
    render(detail(DISCO_FORM));

    applyProductPage([campaign({ endsAt: null })], 'guid-1', t);
    vi.advanceTimersByTime(10 * 24 * 60 * 60 * 1000);

    expect(document.querySelector('.add-to-cart-button')?.textContent).toBe('Předobjednat');
  });

  it('treats an end date it cannot read as no end date', () => {
    vi.useFakeTimers();
    render(detail(DISCO_FORM));

    applyProductPage([campaign({ endsAt: 'soon' })], 'guid-1', t);
    vi.advanceTimersByTime(1000);

    expect(document.querySelector('.add-to-cart-button')?.textContent).toBe('Předobjednat');
    expect(document.querySelector('.cfp-bar__clock')).toBeNull();
  });

  it('puts a listing tile back the way the shop rendered it', () => {
    vi.useFakeTimers();
    render(`
      <div class="p" data-micro-identifier="guid-1">
        <div class="p-in-in"></div>
        <div class="availability"><span>Skladem (3 ks)</span></div>
      </div>`);

    applyCatalogue([ending(60_000)], t);
    vi.advanceTimersByTime(61_000);
    applyCatalogue([ending(60_000)], t);

    expect(document.querySelector('.cfp-badge')).toBeNull();
    const availability = document.querySelector('.availability span');
    expect(availability?.textContent).toBe('Skladem (3 ks)');
    expect(availability?.classList.contains('cfp-availability')).toBe(false);
  });
});
