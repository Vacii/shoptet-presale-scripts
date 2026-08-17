/**
 * ===============================================================
 * Presale Addon for Shoptet
 * Developed by CustomerFlow
 * Maintained by: Luke Vaclavek
 * Contact: lv.vaclavek@gmail.com
 *
 * Shared clipboard helper used by both the product page and the
 * single landing page scripts.
 * ===============================================================
 */

import checkIcon from '../../assets/check.svg';

const ICON_RESET_DELAY = 1500;

/**
 * Copies the discount code to the clipboard and temporarily swaps the copy
 * icon for a checkmark to confirm the action.
 * @param {string} codeSelector - Selector of the element holding the code.
 * @param {string} iconSelector - Selector of the copy icon to swap.
 */
export function copyPresaleCode(codeSelector, iconSelector) {
  const codeElement = document.querySelector(codeSelector);
  if (!codeElement) return;

  navigator.clipboard.writeText(codeElement.innerText).then(function () {
    const icon = document.querySelector(iconSelector);
    if (!icon) return;

    const originalSrc = icon.src;
    icon.src = checkIcon;

    setTimeout(function () {
      icon.src = originalSrc;
    }, ICON_RESET_DELAY);
  });
}
