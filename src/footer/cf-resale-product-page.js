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

/**
 * Copies the presale code to the clipboard and provides visual feedback.
 */
function copyCode() {
  const copyText = document.getElementsByClassName("presale-sale-code")[0];
  const code = copyText.innerText;

  navigator.clipboard.writeText(code).then(
    function () {
      const img = document.getElementsByClassName("presale-code-copy-icon")[0];
      const originalSrc = img.src;

      img.src =
        "https://cdn.myshoptet.com/usr/697363.myshoptet.com/user/documents/presale/public/check.svg";
      setTimeout(function () {
        img.src = originalSrc;
      }, 1500);
    },
    function (err) {
      console.error("Async: Could not copy text: ", err);
    }
  );
}

/**
 * Main IIFE that waits for jQuery, checks page type,
 * fetches presale configuration, and modifies the DOM accordingly.
 */
(function waitForJQuery() {
  if (typeof window.jQuery === "undefined") {
    setTimeout(waitForJQuery, 50);
  } else {
    if (
      !["homepage", "category", "productDetail"].includes(
        dataLayer[0].shoptet.pageType
      )
    ) {
      return;
    }

    $(function () {
      const applyPresaleLabelModifications = (selector, isPresale, dismissBgColor = false) => {
        if (isPresale) {
          $("button.add-to-cart-button.btn-conversion").html("Předobjednat");

          const $availabilityLabel = $(selector);
          $availabilityLabel
            .html("Předobjednávka")
            .css("color", "rgb(240, 150, 60)");
          
          if (dismissBgColor) {
            $availabilityLabel.css("background-color", "");
          }

          $(".p-final-price-wrapper .price-save").css(
            "color",
            "rgb(240, 150, 60)"
          );

          $availabilityLabel.after(`
            <span class="presale-info presale-tooltip">
              &#9432;
              <span class="presale-tooltiptext">Tooltip text</span>
            </span>
          `);
        }
      };

      /**
       * Modifies product detail page appearance for presale.
       * @param {boolean} isPresale - Whether product is in presale.
       * @param {string} template - The design template (e.g., 'Classic', 'Samba').
       */
      const modifyPage = (isPresale, template = "Classic") => {
        const content = `
          <div class="presale-wrapper">
            <div class="presale-bar presale-bar-first">
              <div class="presale-first-bar-content"><p></p></div>
            </div>
          </div>
        `;

        if (template === "Classic") {
          $(".add-to-cart").after(content);
          applyPresaleLabelModifications(
            "span.availability-label",
            isPresale
          );
        } else if (template === "Samba") {
          $(".p-price-wrapper").after(content);
          applyPresaleLabelModifications(
            "span.availability-label",
            isPresale
          );
        } else if (template === "Step") {
          $(".p-basic-info-block").after(content);
          applyPresaleLabelModifications(
            'span[data-testid="labelAvailability"]',
            isPresale
          );
        } else if (template === "Tango") {
          $(".p-short-description").after(content);
          if (isPresale) {
            applyPresaleLabelModifications(
              'span[data-testid="labelAvailability"]',
              isPresale
            );
          }
        } else if (template === "Techno") {
          $(".detail-parameters.second").after(content);
          applyPresaleLabelModifications(
            'span[data-testid="labelAvailability"]',
            isPresale,
            true
          );
        } else if (template === "Disco") {
          $(".detail-parameters").after(content);
          applyPresaleLabelModifications(
            'span[data-testid="labelAvailability"]',
            isPresale
          );
        }
      };

      /**
       * Modifies category listing for presale products.
       * @param {string} identifier - Product identifier (GUID).
       * @param {boolean} isPresale - Whether product is in presale.
       */
      const modifyCategoryPage = (identifier, isPresale) => {
        const $product = $(`.p[data-micro-identifier="${identifier}"]`);
        if ($product.length === 0) return;

        const $targetAnchor = $product.find(".p-in-in a").first();
        if ($targetAnchor.length === 0) return;

        const $newWrapperDiv = $("<div>", {
          class: "presale-product-in-catalog-wrapper",
        });

        const $newDiv = $("<div>", {
          class: "presale-product-in-catalog",
        });

        $newWrapperDiv.insertAfter($targetAnchor);

        $newDiv.appendTo($newWrapperDiv);

        if (isPresale) {
          const $stockLabel = $product
            .find(".availability span")
            .filter(function () {
              return $(this).text().trim() === "Skladem";
            })
            .first();

          if ($stockLabel.length) {
            $stockLabel.text("Předprodej");
            $stockLabel.css("color", "rgb(240, 150, 60)");
          }
        }
      };

      /**
       * Loads configuration and applies presale modifications.
       */
      (async function () {
        if (Array.isArray(dataLayer) && dataLayer.length > 0) {
          let projectId = dataLayer[0]?.shoptet?.projectId;
          let productGuid = dataLayer[0]?.shoptet?.product?.guid;

          const config = await fetch(
            `https://customerflow.cz/shoptet/presell/config?clientId=${projectId}`
          )
            .then((response) => response.json())
            .catch((error) => console.error("Error fetching JSON:", error));

          if (
            dataLayer[0].shoptet.pageType === "productDetail" &&
            (config.presaleProducts.length === 0 ||
              config.presaleProducts[0].guid !== productGuid)
          ) {
            return;
          }

          if (config) {
            let presaleProducts = config.presaleProducts || [];
            if (!presaleProducts[0].visible) return;

            const template = shoptet.design.template.name || "Classic";

            if (dataLayer[0].shoptet.pageType === "productDetail") {
              modifyPage(presaleProducts[0].presale, template);
            } else {
              modifyCategoryPage(
                presaleProducts[0].guid,
                presaleProducts[0].presale
              );

              const endDate = new Date(presaleProducts[0].endDate).getTime();
              getCatalogCountdown(endDate, presaleProducts[0].code);
              let catalogTimer = setInterval(function () {
                getCatalogCountdown(endDate, presaleProducts[0].code);
              }, 30000);
              return;
            }

            presaleProducts.forEach((presaleProduct) => {
              if (presaleProduct.guid === productGuid) {
                $(".presale-bar-first").after(`
                  <div class="presale-bar presale-bar-second">
                    <div class="presale-second-bar-content"><p></p></div>
                  </div>
                `);

                $(".presale-tooltiptext").html(
                  presaleProduct.info ||
                    "Tento produkt se dá předobjednat. Odešleme ho hned, jakmile bude dostupný."
                );

                const presaleEndDateTime = new Date(
                  presaleProduct.endDate
                ).getTime();
                const description =
                  presaleProduct.description ||
                  `Sleva ${presaleProduct.sale}% na předobjednávku`;

                getCountdown(
                  presaleEndDateTime,
                  description,
                  presaleProduct.code,
                  presaleProduct.visible
                );

                let x = setInterval(function () {
                  getCountdown(
                    presaleEndDateTime,
                    description,
                    presaleProduct.code,
                    presaleProduct.visible
                  );
                }, 30000);
              }
            });
          }
        } else {
          console.error("dataLayer is empty or not defined properly.");
        }
      })();
    });

    /**
     * Updates catalog page countdown timer.
     * @param {number} countDownDateTime - Countdown end timestamp.
     * @param {string} saleCode - Optional sale code to display.
     */
    let getCatalogCountdown = function (countDownDateTime, saleCode) {
      let now = new Date().getTime();
      let distance = countDownDateTime - now;

      let days = Math.floor(distance / (1000 * 60 * 60 * 24));
      let hours = Math.floor(
        (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      let minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));

      const $target = $(".presale-product-in-catalog");

      if (distance < 0) {
        $target.html("Předobjednávka skončila");
        clearInterval(catalogTimer);
        return;
      }

      let countdownHtml = `<span>${days}d <span class="pulse">:</span> ${hours}h <span class="pulse">:</span> ${minutes}m</span>`;

      if (saleCode) {
        countdownHtml += `<span> <span class="presale-product-separator">|</span> Kód: <span class="presale-sale-code">${saleCode}</span></span>`;
      }

      $target.html(countdownHtml);
    };

    /**
     * Updates product detail page countdown timer and sale info.
     * @param {number} countDownDateTime - Countdown end timestamp.
     * @param {string} description - Presale discount description.
     * @param {string} code - Discount code.
     * @param {boolean} visible - Whether countdown is in a separate bar.
     */
    let getCountdown = function (
      countDownDateTime,
      description,
      code,
      visible = false
    ) {
      let now = new Date().getTime();
      let distance = countDownDateTime - now;

      let days = Math.floor(distance / (1000 * 60 * 60 * 24));
      let hours = Math.floor(
        (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      let minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));

      const showDescriptionText = code
        ? `<span class="presale-sale-description">${description}</span> | Kód: <span class="presale-sale-code">${code}</span>
        <img class="presale-code-copy-icon" onclick="copyCode()" src="https://cdn.myshoptet.com/usr/697363.myshoptet.com/user/documents/presale/public/copy-icon.svg" alt="copy text" height="15px" />`
        : description;

      if (visible === true) {
        $(".presale-second-bar-content p:first").html(
          `${days}d <span class="pulse">:</span> ${hours}h <span class="pulse">:</span> ${minutes}m`
        );
        $(".presale-first-bar-content p:first").html(showDescriptionText);
        if (distance < 0) {
          $(".presale-second-bar-content p:first").html(
            "Předobjednávka skončila"
          );
          clearInterval(x);
        }
      } else {
        $(".presale-first-bar-content p:first").html(
          `${showDescriptionText} | Končí za ${days}d <span class="pulse">:</span> ${hours}h <span class="pulse">:</span> ${minutes}m`
        );
        if (distance < 0) {
          $(".presale-first-bar-content p:first").html(
            "Předobjednávka skončila"
          );
          clearInterval(x);
        }
      }
    };
  }
})();
