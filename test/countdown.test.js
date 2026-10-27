import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { formatRemaining, splitRemaining, startCountdown } from '../src/countdown.js';
import { translator } from '../src/i18n.js';

const t = translator('cs');
/** @param {'days' | 'hours' | 'minutes' | 'seconds'} key */
const unit = (key) => t(key);

describe('splitting the remaining time', () => {
  it('keeps seconds, which is what the last minute needs', () => {
    // The previous countdown refreshed every ten seconds and rendered only days, hours
    // and minutes, so a campaign's final minute read `0d 0h 0m` for a full sixty seconds.
    expect(splitRemaining(59_000)).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 59 });
    expect(splitRemaining(1_000)).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 1 });
  });

  it('never goes negative', () => {
    expect(splitRemaining(-5_000)).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  });

  it('carries correctly across every unit', () => {
    const total = 2 * 86_400_000 + 3 * 3_600_000 + 4 * 60_000 + 11_000;
    expect(splitRemaining(total)).toEqual({ days: 2, hours: 3, minutes: 4, seconds: 11 });
  });
});

describe('formatting', () => {
  it('drops the day when there is none left', () => {
    expect(formatRemaining({ days: 0, hours: 3, minutes: 4, seconds: 11 }, unit)).toBe('03:04:11');
  });

  it('pads to a fixed width, so the row does not jump every second', () => {
    expect(formatRemaining({ days: 2, hours: 3, minutes: 4, seconds: 1 }, unit)).toBe(
      '2 d 03:04:01',
    );
  });
});

describe('ticking', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-15T12:00:00Z'));
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders immediately, then once a second', () => {
    const node = document.createElement('span');
    document.body.appendChild(node);
    const render = vi.fn();

    startCountdown(node, Date.now() + 60_000, render);
    expect(render).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(3_000);
    expect(render).toHaveBeenCalledTimes(4);
  });

  it('renders before insertion and keeps ticking after insertion', () => {
    const node = document.createElement('span');
    const render = vi.fn();

    startCountdown(node, Date.now() + 60_000, render);
    expect(render).toHaveBeenCalledTimes(1);

    document.body.appendChild(node);
    vi.advanceTimersByTime(1_000);
    expect(render).toHaveBeenCalledTimes(2);
  });

  it('stops when the element is never inserted', () => {
    const node = document.createElement('span');
    const render = vi.fn();

    startCountdown(node, Date.now() + 60_000, render);
    vi.advanceTimersByTime(5_000);

    expect(render).toHaveBeenCalledTimes(1);
  });

  it('stops when the element leaves the document', () => {
    // Filtering a category replaces whole sections of the page. The previous version
    // kept its interval running against elements that no longer existed.
    const node = document.createElement('span');
    document.body.appendChild(node);
    const render = vi.fn();

    startCountdown(node, Date.now() + 60_000, render);
    node.remove();
    vi.advanceTimersByTime(5_000);

    expect(render).toHaveBeenCalledTimes(1);
  });

  it('reports the end once and then stops', () => {
    const node = document.createElement('span');
    document.body.appendChild(node);
    const render = vi.fn();

    startCountdown(node, Date.now() + 2_000, render);
    vi.advanceTimersByTime(10_000);

    expect(render).toHaveBeenLastCalledWith(null);
    expect(render.mock.calls.filter(([value]) => value === null)).toHaveLength(1);
  });

  it('starts no interval at all for a deadline already past', () => {
    const node = document.createElement('span');
    document.body.appendChild(node);
    const render = vi.fn();

    startCountdown(node, Date.now() - 1, render);
    vi.advanceTimersByTime(10_000);

    expect(render).toHaveBeenCalledExactlyOnceWith(null);
  });
});
