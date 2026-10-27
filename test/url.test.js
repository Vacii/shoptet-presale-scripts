import { describe, expect, it } from 'vitest';

import { normalisePath, safeUrl } from '../src/url.js';

describe('deciding whether this is the pre-sale page', () => {
  it('treats every form of the same page as the same page', () => {
    // The previous version compared `soloLanding[0].url !== window.location.href`, an
    // exact match on the whole URL. Each of these broke it.
    const expected = '/predprodej';

    expect(normalisePath('/predprodej')).toBe(expected);
    expect(normalisePath('/predprodej/')).toBe(expected);
    expect(normalisePath('/predprodej?utm_source=facebook')).toBe(expected);
    expect(normalisePath('/predprodej#kotva')).toBe(expected);
    expect(normalisePath('https://shop.cz/predprodej')).toBe(expected);
    expect(normalisePath('http://www.shop.cz/predprodej/?a=1#b')).toBe(expected);
    expect(normalisePath('predprodej')).toBe(expected);
    expect(normalisePath('/PredProdej')).toBe(expected);
  });

  it('keeps distinct pages distinct', () => {
    expect(normalisePath('/predprodej-2')).not.toBe(normalisePath('/predprodej'));
    expect(normalisePath('/a/b')).toBe('/a/b');
  });

  it('reduces an empty or broken value to the root', () => {
    expect(normalisePath('')).toBe('/');
    expect(normalisePath('/')).toBe('/');
    expect(normalisePath('https://')).toBe('/');
  });
});

describe('URLs we are willing to put in the page', () => {
  it('refuses anything that can execute', () => {
    // `component.redirectUrl` went straight into `.href` in seven places.
    expect(safeUrl('javascript:alert(1)')).toBeNull();
    expect(safeUrl('JavaScript:alert(1)')).toBeNull();
    expect(safeUrl('data:text/html,<script>alert(1)</script>')).toBeNull();
    expect(safeUrl('vbscript:msgbox')).toBeNull();
  });

  it('accepts http and https, absolute or relative', () => {
    expect(safeUrl('https://cdn.example.com/a.jpg')).toBe('https://cdn.example.com/a.jpg');
    expect(safeUrl('http://example.com/a.jpg')).toBe('http://example.com/a.jpg');
    expect(safeUrl('/user/documents/a.jpg')).toContain('/user/documents/a.jpg');
  });

  it('refuses nothing at all', () => {
    expect(safeUrl('')).toBeNull();
    expect(safeUrl('   ')).toBeNull();
    expect(safeUrl(null)).toBeNull();
    expect(safeUrl(undefined)).toBeNull();
  });
});
