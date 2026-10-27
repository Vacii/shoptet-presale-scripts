/**
 * The pre-sale widget on a product detail page.
 *
 * One compact card placed directly before the shop's own purchase block: the deadline,
 * why the product can be ordered although it is not in stock, and the discount. The
 * purchase itself stays the shop's — price, quantity and the conversion button are not
 * part of this card.
 */

import { buildCodeRow } from './code-row.js';
import { formatRemaining, parseInstant, startCountdown } from './countdown.js';
import { el, setText } from './dom.js';

/**
 * @typedef {import('./config.js').PresaleCampaign} PresaleCampaign
 * @typedef {ReturnType<import('./i18n.js').translator>} Translate
 */

const COUNTDOWN_UNITS = /** @type {const} */ ([
  ['days', 'daysLong'],
  ['hours', 'hoursLong'],
  ['minutes', 'minutesLong'],
  ['seconds', 'secondsLong'],
]);

/**
 * @param {number} endsAt
 * @param {Translate} t
 * @returns {string}
 */
function formatDeadline(endsAt, t) {
  const locale = t('locale');
  const date = new Date(endsAt);
  const formattedDate = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  }).format(date);
  const formattedTime = new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);

  return t('endsAt', { date: formattedDate, time: formattedTime });
}

/**
 * @param {HTMLElement[]} values
 * @param {import('./countdown.js').Remaining} remaining
 * @param {Translate} t
 * @param {HTMLElement} countdown
 * @param {string} caption
 */
function renderCountdown(values, remaining, t, countdown, caption) {
  const numbers = [remaining.days, remaining.hours, remaining.minutes, remaining.seconds];
  numbers.forEach((number, index) => {
    setText(values[index], index === 0 ? String(number) : String(number).padStart(2, '0'));
  });
  countdown.setAttribute(
    'aria-label',
    `${caption}: ${formatRemaining(remaining, (unit) => t(unit))}`,
  );
}

/**
 * @param {Translate} t
 * @returns {{ node: HTMLElement, value: HTMLElement }[]}
 */
function createCountdownUnits(t) {
  return COUNTDOWN_UNITS.map(([, labelKey]) => {
    const value = el('span', { className: 'cfp-bar__value', text: '00' });
    const label = el('span', { className: 'cfp-bar__unit-label', text: t(labelKey) });
    return {
      node: el('span', { className: 'cfp-bar__unit' }, [value, label]),
      value,
    };
  });
}

/**
 * @param {PresaleCampaign} campaign
 * @param {Translate} t
 * @param {number} endsAt
 * @returns {{ caption: HTMLElement, date: HTMLElement, countdown: HTMLElement, units: { node: HTMLElement, value: HTMLElement }[] }}
 */
function createCountdownView(campaign, t, endsAt) {
  const caption = el(
    'span',
    {
      className: 'cfp-bar__caption',
    },
    [
      el('span', {
        className: 'cfp-bar__icon cfp-bar__icon--clock',
        attrs: { 'aria-hidden': 'true' },
      }),
      el('span', { className: 'cfp-bar__caption-text', text: campaign.bannerText || t('endsIn') }),
    ],
  );
  const date = el('time', {
    className: 'cfp-bar__date',
    text: formatDeadline(endsAt, t),
    attrs: { datetime: campaign.endsAt ?? '' },
  });
  const units = createCountdownUnits(t);
  const countdown = el(
    'time',
    {
      className: 'cfp-bar__countdown',
      attrs: {
        datetime: campaign.endsAt ?? '',
        role: 'timer',
        'aria-live': 'off',
        'aria-label': caption.textContent ?? '',
      },
    },
    units.map(({ node }) => node),
  );
  return { caption, date, countdown, units };
}

/**
 * @param {PresaleCampaign} campaign
 * @param {Translate} t
 * @param {() => void} onEnded
 * @returns {HTMLElement | null}
 */
function buildCountdownRow(campaign, t, onEnded) {
  const endsAt = parseInstant(campaign.endsAt);
  if (endsAt === null) return null;

  const { caption, date, countdown, units } = createCountdownView(campaign, t, endsAt);

  // The caption and date are first in the DOM for a sensible spoken order. CSS places
  // the four values beside them, where they become the visual signature of the strip.
  const clock = el('div', { className: 'cfp-bar__clock' }, [caption, date, countdown]);

  startCountdown(countdown, endsAt, (remaining) => {
    if (remaining === null) {
      onEnded();
      return;
    }
    renderCountdown(
      units.map(({ value }) => value),
      remaining,
      t,
      countdown,
      caption.textContent ?? '',
    );
  });

  return clock;
}

/**
 * Why the product can be ordered although it is not in stock, followed by the merchant's
 * own note, which is usually about the same thing: when the goods ship.
 *
 * @param {PresaleCampaign} campaign
 * @param {Translate} t
 * @returns {HTMLElement}
 */
function buildAvailability(campaign, t) {
  const copy = el('span', { className: 'cfp-bar__availability-copy' }, [
    el('strong', { text: t('presaleInfoLead') }),
    el('span', { text: ` ${t('presaleInfoTail')}` }),
  ]);
  if (campaign.infoText) {
    copy.append(el('span', { className: 'cfp-bar__info', text: campaign.infoText }));
  }
  return el('div', { className: 'cfp-bar__availability' }, [
    el('span', {
      className: 'cfp-bar__icon cfp-bar__icon--package icon-box',
      attrs: { 'aria-hidden': 'true' },
    }),
    copy,
  ]);
}

/**
 * The discount and its code, last in the card so they sit right above the shop's price
 * and conversion button they apply to.
 *
 * @param {PresaleCampaign} campaign
 * @param {Translate} t
 * @returns {HTMLElement | null}
 */
function buildOffer(campaign, t) {
  const parts = [];
  if (campaign.discountPercent) {
    parts.push(
      el('span', {
        className: 'cfp-bar__benefit',
        text: t('discountShort', { percent: campaign.discountPercent }),
      }),
    );
  }
  if (campaign.discountCode) {
    parts.push(
      buildCodeRow(campaign.discountCode, t, 'cfp-bar__code-row', {
        compact: true,
        showBenefit: false,
      }),
    );
  }
  return parts.length > 0 ? el('div', { className: 'cfp-bar__offer' }, parts) : null;
}

/**
 * @param {PresaleCampaign} campaign
 * @param {Translate} t
 * @param {() => void} onEnded called once the deadline passes; the caller takes the
 *   widget down and puts back what it relabelled
 * @returns {HTMLElement}
 */
export function buildBar(campaign, t, onEnded) {
  const bar = el('div', {
    className: 'cfp-bar',
    attrs: { role: 'group', 'aria-label': t('presaleLabel') },
  });

  const countdown = buildCountdownRow(campaign, t, onEnded);
  if (countdown) bar.append(countdown);
  else if (campaign.bannerText) {
    // A campaign without a valid end date still gets the merchant's message, but never
    // gets a fake countdown or a date made up from an invalid value.
    bar.append(el('div', { className: 'cfp-bar__headline', text: campaign.bannerText }));
  }

  if (bar.childElementCount > 0) {
    bar.append(el('div', { className: 'cfp-bar__rule', attrs: { 'aria-hidden': 'true' } }));
  }
  bar.append(buildAvailability(campaign, t));

  const offer = buildOffer(campaign, t);
  if (offer) bar.append(offer);

  return bar;
}
