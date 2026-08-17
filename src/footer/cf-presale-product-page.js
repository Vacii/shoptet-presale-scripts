/**
 * ===============================================================
 * Presale Addon for Shoptet
 * Developed by CustomerFlow
 * Maintained by: Luke Vaclavek
 * Contact: lv.vaclavek@gmail.com
 *
 * This script enhances product and category pages on Shoptet
 * with presale-related content, such as banners, countdowns,
 * tooltips, and dynamic text for presale products.
 *
 * It dynamically fetches presale configuration from CustomerFlow's
 * backend and updates the DOM accordingly.
 * ===============================================================
 */

import '../header/cf-presale-product-page.css';
import { copyPresaleCode } from '../shared/copy-code.js';
import copyIcon from '../../assets/copy-icon.svg';

const PRESALE_ENDED_TEXT = 'Předobjednávka skončila';
const MS_PER_MINUTE = 1000 * 60;
const MS_PER_HOUR = MS_PER_MINUTE * 60;
const MS_PER_DAY = MS_PER_HOUR * 24;

/**
 * Main script: checks page type, fetches presale configuration,
 * and modifies the DOM accordingly.
 */
document.addEventListener('DOMContentLoaded', function () {
  const pageType = getShoptetDataLayer('pageType');

  if (
    !['homepage', 'category', 'parametricCategory', 'productDetail'].includes(
      pageType,
    )
  ) {
    return;
  }

  const applyPresaleLabelModifications = (
    selector,
    isPresale,
    dismissBgColor = false,
  ) => {
    if (!isPresale) return;

    const addToCartBtn = document.querySelector(
      'button.add-to-cart-button.btn-conversion',
    );
    if (addToCartBtn) addToCartBtn.textContent = 'Předobjednat';

    const availabilityLabel = document.querySelector(selector);
    if (availabilityLabel) {
      availabilityLabel.textContent = 'Předobjednávka';
      availabilityLabel.classList.add('presale-orange-text');

      if (dismissBgColor) {
        availabilityLabel.classList.add('presale-bg-transparent');
      }

      availabilityLabel.insertAdjacentHTML(
        'afterend',
        `
        <span class="presale-info presale-tooltip">
          &#9432;
          <span class="presale-tooltiptext"></span>
        </span>
      `,
      );
    }

    const priceSave = document.querySelector(
      '.p-final-price-wrapper .price-save',
    );
    if (priceSave) priceSave.classList.add('presale-orange-text');
  };

  /**
   * Modifies product detail page appearance for presale.
   * @param {boolean} isPresale - Whether product is in presale.
   * @param {string} template - The design template (e.g., 'Classic', 'Samba').
   */
  const modifyPage = (isPresale, template = 'Classic') => {
    const content = `
      <div class="presale-wrapper">
        <div class="presale-bar presale-bar-first">
          <div class="presale-first-bar-content"><p></p></div>
        </div>
      </div>
    `;

    const templateConfig = {
      Classic: { selector: '.add-to-cart' },
      Samba: { selector: '.p-price-wrapper' },
      Step: { selector: '.p-basic-info-block' },
      Tango: { selector: '.p-short-description' },
      Techno: { selector: '.detail-parameters.second', dismissBgColor: true },
      Disco: { selector: '.p-detail-inner .detail-parameters' },
    };

    const cfg = templateConfig[template];
    if (!cfg) return;

    document
      .querySelector(cfg.selector)
      ?.insertAdjacentHTML('afterend', content);
    applyPresaleLabelModifications(
      'span.availability-label',
      isPresale,
      cfg.dismissBgColor || false,
    );
  };

  /**
   * Modifies category listing for presale products.
   * @param {string} identifier - Product identifier (GUID).
   * @param {boolean} isPresale - Whether product is in presale.
   */
  const modifyCategoryPage = (identifier, isPresale) => {
    const product = document.querySelector(
      `.p[data-micro-identifier="${identifier}"]`,
    );
    if (!product) return;

    const targetAnchor = product.querySelector('.p-in-in a');
    if (!targetAnchor) return;

    const newWrapperDiv = document.createElement('div');
    newWrapperDiv.className = 'presale-product-in-catalog-wrapper';

    const newDiv = document.createElement('div');
    newDiv.className = 'presale-product-in-catalog';

    targetAnchor.insertAdjacentElement('afterend', newWrapperDiv);
    newWrapperDiv.appendChild(newDiv);

    if (isPresale) {
      const availabilitySpans = product.querySelectorAll('.availability span');
      const stockLabel = Array.from(availabilitySpans).find(
        (span) => span.textContent.trim() === 'Skladem',
      );

      if (stockLabel) {
        stockLabel.textContent = 'Předprodej';
        stockLabel.classList.add('presale-orange-text');
      }
    }
  };

  let catalogTimer;
  let productDetailTimer;

  /**
   * Loads configuration and applies presale modifications.
   */
  (async function () {
    const projectId = getShoptetDataLayer('projectId');
    const productGuid = getShoptetDataLayer('product')?.guid;

    const config = await fetch(
      `https://customerflow.cz/shoptet/presell/config?clientId=${projectId}`,
    )
      .then((response) => response.json())
      .catch(() => null);

    if (!config || !config.presaleProducts) return;

    if (
      pageType === 'productDetail' &&
      (config.presaleProducts.length === 0 ||
        config.presaleProducts[0].guid !== productGuid)
    ) {
      return;
    }

    const presaleProducts = config.presaleProducts;
    if (!presaleProducts[0].visible) return;

    const template = shoptet.design.template.name;

    if (pageType !== 'productDetail') {
      modifyCategoryPage(presaleProducts[0].guid, presaleProducts[0].presale);

      const endDate = new Date(presaleProducts[0].endDate).getTime();
      getCatalogCountdown(endDate, presaleProducts[0].code);
      catalogTimer = setInterval(function () {
        getCatalogCountdown(endDate, presaleProducts[0].code);
      }, 10000);
      return;
    }

    modifyPage(presaleProducts[0].presale, template);
    document
      .querySelector('.presale-first-bar-content')
      .addEventListener('click', function (e) {
        if (e.target.closest('.presale-code-copy-btn')) {
          copyPresaleCode('.presale-sale-code', '.presale-code-copy-icon');
        }
      });

    presaleProducts.forEach((presaleProduct) => {
      if (presaleProduct.guid === productGuid) {
        document.querySelector('.presale-bar-first').insertAdjacentHTML(
          'afterend',
          `
              <div class="presale-bar presale-bar-second">
                <div class="presale-second-bar-content"><p></p></div>
              </div>
            `,
        );

        document.querySelector('.presale-tooltiptext').innerHTML =
          presaleProduct.info ||
          'Tento produkt se dá předobjednat. Odešleme ho hned, jakmile bude dostupný.';

        const presaleEndDateTime = new Date(presaleProduct.endDate).getTime();
        const description =
          presaleProduct.description ||
          `Sleva ${presaleProduct.sale}% na předobjednávku`;

        getCountdown(
          presaleEndDateTime,
          description,
          presaleProduct.code,
          presaleProduct.visible,
        );

        productDetailTimer = setInterval(function () {
          getCountdown(
            presaleEndDateTime,
            description,
            presaleProduct.code,
            presaleProduct.visible,
          );
        }, 10000);
      }
    });
  })();

  /**
   * Updates catalog page countdown timer.
   * @param {number} countDownDateTime - Countdown end timestamp.
   * @param {string} saleCode - Optional sale code to display.
   */
  const getCatalogCountdown = function (countDownDateTime, saleCode) {
    if (!countDownDateTime || isNaN(countDownDateTime)) return;

    const target = document.querySelector('.presale-product-in-catalog');
    if (!target) return;

    const now = new Date().getTime();
    const distance = countDownDateTime - now;

    if (distance < 0) {
      target.textContent = PRESALE_ENDED_TEXT;
      clearInterval(catalogTimer);
      return;
    }

    const days = Math.floor(distance / MS_PER_DAY);
    const hours = Math.floor((distance % MS_PER_DAY) / MS_PER_HOUR);
    const minutes = Math.floor((distance % MS_PER_HOUR) / MS_PER_MINUTE);

    const countdownHtml = saleCode
      ? `<span>${days}d <span class="presale-pulse">:</span> ${hours}h <span class="presale-pulse">:</span> ${minutes}m</span><span> <span class="presale-product-separator">|</span> Kód: <span class="presale-sale-code">${saleCode}</span></span>`
      : `<span>${days}d <span class="presale-pulse">:</span> ${hours}h <span class="presale-pulse">:</span> ${minutes}m</span>`;

    target.innerHTML = countdownHtml;
  };

  /**
   * Updates product detail page countdown timer and sale info.
   * @param {number} countDownDateTime - Countdown end timestamp.
   * @param {string} description - Presale discount description.
   * @param {string} code - Discount code.
   * @param {boolean} visible - Whether countdown is in a separate bar.
   */
  const getCountdown = function (
    countDownDateTime,
    description,
    code,
    visible = false,
  ) {
    if (!countDownDateTime || isNaN(countDownDateTime)) return;

    const now = new Date().getTime();
    const distance = countDownDateTime - now;

    const days = Math.floor(distance / MS_PER_DAY);
    const hours = Math.floor((distance % MS_PER_DAY) / MS_PER_HOUR);
    const minutes = Math.floor((distance % MS_PER_HOUR) / MS_PER_MINUTE);

    const showDescriptionText = code
      ? `<span class="presale-sale-description">${description}</span> | Kód: <span class="presale-sale-code">${code}</span>
        <button class="presale-code-copy-btn"><img class="presale-code-copy-icon" src="${copyIcon}" alt="Kopírovat kód" height="15px" /></button>`
      : description;

    const countdownText = `${days}d <span class="presale-pulse">:</span> ${hours}h <span class="presale-pulse">:</span> ${minutes}m`;

    const firstBarContent = document.querySelector(
      '.presale-first-bar-content p',
    );
    const secondBarContent = document.querySelector(
      '.presale-second-bar-content p',
    );

    if (visible === true) {
      if (!firstBarContent || !secondBarContent) return;

      firstBarContent.innerHTML = showDescriptionText;

      if (distance < 0) {
        secondBarContent.textContent = PRESALE_ENDED_TEXT;
        clearInterval(productDetailTimer);
        return;
      }

      secondBarContent.innerHTML = countdownText;
      return;
    }

    if (!firstBarContent) return;

    if (distance < 0) {
      firstBarContent.textContent = PRESALE_ENDED_TEXT;
      clearInterval(productDetailTimer);
      return;
    }

    firstBarContent.innerHTML = `${showDescriptionText} | Končí za ${countdownText}`;
  };
});
