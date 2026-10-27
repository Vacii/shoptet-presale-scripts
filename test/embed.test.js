import { describe, expect, it } from 'vitest';

import { embedUrl } from '../src/embed.js';

describe('embedUrl', () => {
  it('accepts every shape of YouTube link a merchant can copy', () => {
    const player = 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ';
    expect(embedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(player);
    expect(embedUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(player);
    expect(embedUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe(player);
    expect(embedUrl('https://m.youtube.com/watch?v=dQw4w9WgXcQ&t=30s')).toBe(player);
    expect(embedUrl('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')).toBe(player);
  });

  it('accepts Vimeo page and player links', () => {
    expect(embedUrl('https://vimeo.com/123456789')).toBe(
      'https://player.vimeo.com/video/123456789',
    );
    expect(embedUrl('https://player.vimeo.com/video/123456789')).toBe(
      'https://player.vimeo.com/video/123456789',
    );
    expect(embedUrl('https://vimeo.com/channels/staffpicks/123456789')).toBe(
      'https://player.vimeo.com/video/123456789',
    );
  });

  it('refuses anything that is not one of the two providers', () => {
    expect(embedUrl('https://example.com/video')).toBeNull();
    expect(embedUrl('https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ')).toBeNull();
    expect(embedUrl('javascript:alert(1)')).toBeNull();
    expect(embedUrl('')).toBeNull();
    expect(embedUrl(undefined)).toBeNull();
  });
});
