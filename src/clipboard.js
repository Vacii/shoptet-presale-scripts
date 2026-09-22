/**
 * Copying the discount code.
 *
 * `navigator.clipboard` is undefined on plain HTTP and can reject when the document is
 * not focused. The previous version called it with no handling at all, so on those shops
 * the button threw and the customer got no feedback whatsoever — and the only success
 * signal was swapping an icon hotlinked from one particular shop's file manager.
 *
 * @param {string} text
 * @returns {Promise<boolean>}
 */
export async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to the selection-based path below.
    }
  }
  return copyBySelection(text);
}

/**
 * @param {string} text
 * @returns {boolean}
 */
function copyBySelection(text) {
  const field = document.createElement('textarea');
  field.value = text;
  field.setAttribute('readonly', '');
  field.setAttribute('aria-hidden', 'true');
  field.style.position = 'fixed';
  field.style.opacity = '0';
  document.body.appendChild(field);

  try {
    field.select();
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    field.remove();
  }
}
