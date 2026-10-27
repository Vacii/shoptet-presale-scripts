/**
 * The countdown.
 *
 * Second precision, redrawn every second. The previous one ticked every ten seconds and
 * showed only days, hours and minutes, so the last minute of a campaign read `0d 0h 0m`
 * for a full minute — during the one moment the number matters most.
 */

const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = MS_PER_SECOND * 60;
const MS_PER_HOUR = MS_PER_MINUTE * 60;
const MS_PER_DAY = MS_PER_HOUR * 24;

/**
 * @typedef {object} Remaining
 * @property {number} days
 * @property {number} hours
 * @property {number} minutes
 * @property {number} seconds
 */

//: `setTimeout` silently fires immediately past this, so a deadline further out than
//: about 24 days gets no timer at all. No page stays open that long.
const MAX_TIMEOUT_MS = 2 ** 31 - 1;

/**
 * A configured moment as epoch milliseconds, or null when there is none or it does not
 * parse. Every deadline in the bundle goes through here, so an invalid date means "no
 * deadline" everywhere instead of a timer that fires at once.
 *
 * @param {string | null | undefined} value
 * @returns {number | null}
 */
export function parseInstant(value) {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * Run something once, when the campaign ends.
 *
 * A single timer rather than a second ticking interval, because the caller does not need
 * the intervening seconds — only the moment. Like `startCountdown` it is tied to a node,
 * so nothing runs against markup Shoptet has since replaced.
 *
 * @param {HTMLElement} node
 * @param {number} endsAt epoch milliseconds
 * @param {() => void} run
 * @returns {() => void} cancel
 */
export function atDeadline(node, endsAt, run) {
  if (!Number.isFinite(endsAt)) return () => {};
  const delay = endsAt - Date.now();
  if (delay <= 0) {
    run();
    return () => {};
  }
  if (delay > MAX_TIMEOUT_MS) return () => {};

  const timer = window.setTimeout(() => {
    if (node.isConnected) run();
  }, delay);
  return () => window.clearTimeout(timer);
}

/**
 * @param {number} milliseconds
 * @returns {Remaining}
 */
export function splitRemaining(milliseconds) {
  const total = Math.max(0, milliseconds);
  return {
    days: Math.floor(total / MS_PER_DAY),
    hours: Math.floor((total % MS_PER_DAY) / MS_PER_HOUR),
    minutes: Math.floor((total % MS_PER_HOUR) / MS_PER_MINUTE),
    seconds: Math.floor((total % MS_PER_MINUTE) / MS_PER_SECOND),
  };
}

/**
 * `2 d 03:04:11`, dropping the units that are still zero at the front.
 *
 * @param {Remaining} remaining
 * @param {(key: 'days' | 'hours' | 'minutes' | 'seconds') => string} unit
 * @returns {string}
 */
export function formatRemaining(remaining, unit) {
  /** @param {number} value */
  const pad = (value) => String(value).padStart(2, '0');
  const clock = `${pad(remaining.hours)}:${pad(remaining.minutes)}:${pad(remaining.seconds)}`;
  return remaining.days > 0 ? `${remaining.days} ${unit('days')} ${clock}` : clock;
}

/**
 * Tick until the deadline passes or the element leaves the document.
 *
 * `isConnected` is the stop condition because Shoptet replaces whole sections of the page
 * on filtering and pagination. The previous version left its interval running against
 * elements that no longer existed, for as long as the tab stayed open.
 *
 * @param {HTMLElement} node the element the countdown lives in
 * @param {number} endsAt epoch milliseconds
 * @param {(remaining: Remaining | null) => void} render called with null once it is over
 * @returns {() => void} stop
 */
export function startCountdown(node, endsAt, render) {
  if (!Number.isFinite(endsAt)) return () => {};
  let timer = 0;
  let finished = false;

  const stop = () => {
    finished = true;
    if (timer) window.clearInterval(timer);
    timer = 0;
  };

  const renderCurrent = () => {
    const remaining = endsAt - Date.now();
    if (remaining <= 0) {
      render(null);
      stop();
      return;
    }
    render(splitRemaining(remaining));
  };

  const tick = () => {
    if (!node.isConnected) {
      stop();
      return;
    }
    renderCurrent();
  };

  // Render once immediately, before insertion as well, so callers can build a complete
  // subtree before attaching it. Later ticks still stop when Shoptet replaces that subtree.
  renderCurrent();
  if (!finished) timer = window.setInterval(tick, MS_PER_SECOND);
  return stop;
}
