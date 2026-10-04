/**
 * A discount code with a copy button, used by the bar and by the landing page.
 *
 * The product bar can use the compact variant, where the code and its one action share
 * one bordered row. The landing page keeps the wider legacy arrangement because it has
 * more room and is not part of the product purchase decision.
 */

import { copyText } from './clipboard.js';
import { el, setText } from './dom.js';

/**
 * @typedef {ReturnType<import('./i18n.js').translator>} Translate
 * @typedef {{ compact?: boolean, discountPercent?: number | null, showBenefit?: boolean }} CodeRowOptions
 */

/**
 * @param {HTMLElement} button
 * @param {HTMLElement} buttonLabel
 * @param {HTMLElement} status
 * @param {string} code
 * @param {Translate} t
 * @param {boolean} compact
 */
function wireCopyButton(button, buttonLabel, status, code, t, compact) {
  let resetTimer = 0;
  const idleAriaLabel = compact ? `${t('copyCode')}: ${code}` : null;
  button.addEventListener('click', () => {
    void copyText(code).then((copied) => {
      const message = copied ? t('copied') : t('copyFailed');
      setText(buttonLabel, message);
      setText(status, message);
      if (compact) button.setAttribute('aria-label', message);
      button.classList.toggle('cfp-bar__copy--success', copied);

      if (resetTimer) window.clearTimeout(resetTimer);
      resetTimer = window.setTimeout(() => {
        setText(buttonLabel, t(compact ? 'copyShort' : 'copyCode'));
        if (idleAriaLabel) button.setAttribute('aria-label', idleAriaLabel);
        button.classList.remove('cfp-bar__copy--success');
      }, 2400);
    });
  });
}

/**
 * @param {string} code
 * @param {Translate} t
 * @param {boolean} compact
 * @returns {{ button: HTMLElement, buttonLabel: HTMLElement, status: HTMLElement, codeNode: HTMLElement }}
 */
function createCopyButton(code, t, compact) {
  const codeNode = el('code', {
    className: 'cfp-bar__code',
    text: code,
    attrs: { translate: 'no' },
  });
  const buttonLabel = el('span', {
    className: 'cfp-bar__copy-label',
    text: t(compact ? 'copyShort' : 'copyCode'),
  });
  const copyAction = el('span', { className: 'cfp-bar__copy-action' }, [
    el('span', {
      className: 'cfp-bar__icon cfp-bar__icon--copy',
      attrs: { 'aria-hidden': 'true' },
    }),
    buttonLabel,
  ]);
  const button = el(
    'button',
    {
      className: `cfp-bar__copy${compact ? ' cfp-bar__copy--compact' : ''}`,
      attrs: { type: 'button' },
    },
    compact ? [copyAction] : [buttonLabel],
  );
  if (compact) button.setAttribute('aria-label', `${t('copyCode')}: ${code}`);
  const status = el('span', {
    className: 'cfp-bar__status',
    attrs: { role: 'status', 'aria-live': 'polite' },
  });

  wireCopyButton(button, buttonLabel, status, code, t, compact);
  return { button, buttonLabel, status, codeNode };
}

/**
 * @param {string} code
 * @param {Translate} t
 * @param {string} [className]
 * @param {CodeRowOptions} [options]
 * @returns {HTMLElement}
 */
export function buildCodeRow(code, t, className = 'cfp-bar__row', options = {}) {
  const compact = options.compact === true;
  const { button, status, codeNode } = createCopyButton(code, t, compact);
  const children = compact
    ? [
        codeNode,
        ...(options.showBenefit === false
          ? []
          : [
              el('span', {
                className: 'cfp-bar__benefit',
                text: options.discountPercent
                  ? t('discountShort', { percent: options.discountPercent })
                  : t('code'),
              }),
            ]),
        button,
      ]
    : [el('span', { className: 'cfp-bar__label', text: `${t('code')}:` }), codeNode, button];

  children.push(status);
  return el('div', { className }, children);
}
