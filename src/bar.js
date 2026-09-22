/**
 * The pre-sale support strip on a product detail page.
 *
 * It is deliberately one compact block around the shop's purchase controls. The page
 * already prints the availability label, so this block adds the deadline, ordering
 * explanation and the one clear pre-order action shown in the visual direction.
 */

import { buildCodeRow } from './code-row.js';
import { formatRemaining, startCountdown } from './countdown.js';
import { el, setText } from './dom.js';
import { language } from './shoptet.js';

/**
 * @typedef {import('./config.js').PresaleCampaign} PresaleCampaign
 * @typedef {ReturnType<import('./i18n.js').translator>} Translate
 */

/** @type {Record<ReturnType<typeof language>, string>} */
const LOCALE_TAGS = {
  cs: 'cs-CZ',
  sk: 'sk-SK',
  en: 'en-GB',
  hu: 'hu-HU',
};

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
  const locale = LOCALE_TAGS[language()];
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
 * @param {() => void} [onEnded]
 * @returns {HTMLElement | null}
 */
function buildCountdownRow(campaign, t, onEnded) {
  const endsAt = campaign.endsAt ? Date.parse(campaign.endsAt) : NaN;
  if (Number.isNaN(endsAt)) return null;

  const { caption, date, countdown, units } = createCountdownView(campaign, t, endsAt);

  // The caption and date are first in the DOM for a sensible spoken order. CSS places
  // the four values beside them, where they become the visual signature of the strip.
  const clock = el('div', { className: 'cfp-bar__clock' }, [caption, date, countdown]);

  startCountdown(countdown, endsAt, (remaining) => {
    if (remaining === null) {
      setText(countdown, t('ended'));
      clock.classList.add('cfp-bar__clock--ended');
      onEnded?.();
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
 * @param {Translate} t
 * @param {(() => void) | undefined} onOrder
 * @returns {HTMLElement}
 */
function createOrderButton(t, onOrder) {
  const order = el('button', {
    className: 'cfp-bar__order',
    text: t('preorderWithDiscount'),
    attrs: { type: 'button' },
  });
  order.addEventListener('click', () => onOrder?.());
  return order;
}

/**
 * @param {PresaleCampaign} campaign
 * @param {Translate} t
 * @param {(() => void) | undefined} onOrder
 * @param {boolean} showFallbackOrder
 * @returns {HTMLElement}
 */
function createCheckout(campaign, t, onOrder, showFallbackOrder) {
  const checkout = el('div', { className: 'cfp-bar__checkout' });
  if (showFallbackOrder) checkout.append(createOrderButton(t, onOrder));

  // product-page.js mounts the host's own price, quantity and conversion button here.
  checkout.append(el('div', { className: 'cfp-bar__purchase' }));
  if (campaign.infoText) {
    checkout.append(el('div', { className: 'cfp-bar__info', text: campaign.infoText }));
  }
  return checkout;
}

/**
 * @param {PresaleCampaign} campaign
 * @param {Translate} t
 * @param {() => void} [onOrder]
 * @param {() => void} [onEnded]
 * @param {boolean} [showFallbackOrder]
 * @returns {HTMLElement}
 */
export function buildBar(campaign, t, onOrder, onEnded, showFallbackOrder = true) {
  const bar = el('div', {
    className: 'cfp-bar',
    attrs: { role: 'group', 'aria-label': t('presaleLabel') },
  });

  const countdown = buildCountdownRow(campaign, t, () => {
    if (onEnded) onEnded();
    else bar.remove();
  });
  if (countdown) bar.append(countdown);
  else if (campaign.bannerText) {
    // A campaign without a valid end date still gets the merchant's message, but never
    // gets a fake countdown or a date made up from an invalid value.
    bar.append(el('div', { className: 'cfp-bar__headline', text: campaign.bannerText }));
  }

  bar.append(el('div', { className: 'cfp-bar__rule', attrs: { 'aria-hidden': 'true' } }));

  bar.append(
    el('div', { className: 'cfp-bar__availability' }, [
      el('span', {
        className: 'cfp-bar__icon cfp-bar__icon--package icon-box',
        attrs: { 'aria-hidden': 'true' },
      }),
      el('span', { className: 'cfp-bar__availability-copy' }, [
        el('strong', { text: t('presaleInfoLead') }),
        el('span', { text: ` ${t('presaleInfoTail')}` }),
      ]),
    ]),
  );

  if (campaign.discountPercent) {
    bar.append(
      el('span', {
        className: 'cfp-bar__benefit',
        text: t('discountShort', { percent: campaign.discountPercent }),
      }),
    );
  }
  if (campaign.discountCode) {
    bar.append(
      buildCodeRow(campaign.discountCode, t, 'cfp-bar__code-row', {
        compact: true,
        showBenefit: false,
      }),
    );
  }

  // The native purchase block is mounted here by product-page.js. The surrounding
  // checkout surface also owns the optional merchant note, so the lower part stays one
  // connected purchasing decision even when a template needs the fallback button.
  bar.append(createCheckout(campaign, t, onOrder, showFallbackOrder));

  return bar;
}
