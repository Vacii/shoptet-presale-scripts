/**
 * Presale Addon Script for Shoptet
 * ---------------------------------
 * This script is part of the "Presale" addon integration for Shoptet,
 * developed by CustomerFlow and maintained by Luke Vaclavek.
 *
 * It dynamically renders presale landing page components based on remote configuration,
 * fetched using the Shoptet `projectId` via `dataLayer`.
 *
 * For support or inquiries, please contact: lv.vaclavek@gmail.com
 */

/**
 * HTML template string used to populate the presale landing page content.
 */
const presaleContent = `
  <div class="presale-sl-wrapper">
    <div class="presale-sl-title-banner">
    </div>
    <div class="presale-sl-main-content">
      <div class="presale-sl-benefits-wrapper">
        <a class="presale-sl-benefit presale-sl-benefit-first">
          <img
            class="preslae-sl-variable-benefit-first"
            src=""
            alt=""
          />
        </a>
        <a class="presale-sl-benefit presale-sl-benefit-second">
          <img
            class="preslae-sl-variable-benefit-second"
            src=""
            alt=""
          />
        </a>
      </div>
      <a class="presale-sl-sub-banner">
        <img
          class="presale-sl-variable-benefit-banner"
          src="./Plain - Page_files/sub-banner.png"
          alt="sub-banner"
        />
      </a>
      <div class="presale-sl-usp">

      </div>
    </div>
      <div class="swiper desktopSwiper">
          <div class="swiper-wrapper">

          </div>
          <div class="swiper-button-next presale-sl-swiper-ugc-button-next"></div>
          <div class="swiper-button-prev presale-sl-swiper-ugc-button-prev"></div>
        </div>

    <div class="presale-sl-ugcs-mobile">
      <div class="swiper cardSwiper">
        <div class="swiper-wrapper">
        </div>
        <div class="swiper-button-next"></div>
        <div class="swiper-button-prev"></div>
      </div>
    </div>

    <!-- <div class="presale-sl-rating">
      <div class="presale-sl-rating-stars">
        <img src="./Plain - Page_files/star-icon.svg" alt="" />
        <img src="./Plain - Page_files/star-icon.svg" alt="" />
        <img src="./Plain - Page_files/star-icon.svg" alt="" />
        <img src="./Plain - Page_files/star-icon.svg" alt="" />
        <img src="./Plain - Page_files/star-icon.svg" alt="" />
      </div>
      <span class="presale-sl-rating-out-of-5">4.9</span>
      <span class="presale-sl-rating-number">78 hodnocení</span>
    </div> -->
    <a class="presale-sl-compare-banner">
      <img
        class="presale-sl-variable-compare-desktop"
        src="./Plain - Page_files/compare-products.png"
        alt="compare"
      />
    </a>
        <div class="presale-sl-sale-bar">
          <span class="presale-sl-sale-span"
            >Sleva 10 % na předobjednávky</span
          >
          <span class="presale-sl-sale-span presale-sl-sale-line">&nbsp;&#10072;&nbsp;</span>
          <div class="presale-sl-sale-bar-code-wrapper">
            <span class="presale-sl-sale-span">Kód:&nbsp;</span>
            <span class="presale-sl-sale-span presale-sl-sale-code">10DAYS</span>
            <div class="presale-sl-sale-tooltip presale-sl-sale-span">
              <img
                class="presale-sl-sale-code-copy-icon"
                onclick="copySinglePageCode()"
                src="https://cdn.myshoptet.com/usr/697363.myshoptet.com/user/documents/presale/public/copy-icon.svg"
                alt="copy text"
                height="15px"
              />
              <span class="presale-sl-tooltip-text">Kopírovat kód</span>
          </div>
          </div>

          </div>

        </div>
    <!-- Slider main container -->
    <div class="swiper mySwiper">
      <div class="swiper-wrapper">
        <div class="swiper-slide presale-sl-swiper-item">
          <div class="presale-sl-swiper-item-content">
            <div class="presale-sl-swiper-item-img">
              <img src="./Plain - Page_files/product2.webp" alt="slide" />
            </div>
            <div class="presale-sl-swiper-product-info">
              <h4>Nazev produktu</h4>
              <p>69 Kč</p>
              <a
                href="https://697363.myshoptet.com/stolni-lampicka-tiny-tim/"
                target="_blank"
                >Koupit</a
              >
            </div>
          </div>
        </div>
        <div class="swiper-slide presale-sl-swiper-item">
          <div class="presale-sl-swiper-item-content">
            <div class="presale-sl-swiper-item-img">
              <img src="./Plain - Page_files/product3.webp" alt="slide" />
            </div>
            <div class="presale-sl-swiper-product-info">
              <h4>Nazev produktu</h4>
              <p>69 Kč</p>
              <a
                href="https://697363.myshoptet.com/stolni-lampicka-tiny-tim/"
                target="_blank"
                >Koupit</a
              >
            </div>
          </div>
        </div>
        <div class="swiper-slide presale-sl-swiper-item">
          <div class="presale-sl-swiper-item-content">
            <div class="presale-sl-swiper-item-img">
              <img src="./Plain - Page_files/product1.webp" alt="slide" />
            </div>
            <div class="presale-sl-swiper-product-info">
              <h4>Nazev produktu</h4>
              <p>69 Kč</p>
              <a
                href="https://697363.myshoptet.com/stolni-lampicka-tiny-tim/"
                target="_blank"
                >Koupit</a
              >
            </div>
          </div>
        </div>
        <div class="swiper-slide presale-sl-swiper-item">
          <div class="presale-sl-swiper-item-content">
            <div class="presale-sl-swiper-item-img">
              <img src="./Plain - Page_files/product2.webp" alt="slide" />
            </div>
            <div class="presale-sl-swiper-product-info">
              <h4>Nazev produktu</h4>
              <p>69 Kč</p>
              <a
                href="https://697363.myshoptet.com/stolni-lampicka-tiny-tim/"
                target="_blank"
                >Koupit</a
              >
            </div>
          </div>
        </div>
        <div class="swiper-slide presale-sl-swiper-item">
          <div class="presale-sl-swiper-item-content">
            <div class="presale-sl-swiper-item-img">
              <img src="./Plain - Page_files/product3.webp" alt="slide" />
            </div>
            <div class="presale-sl-swiper-product-info">
              <h4>Nazev produktu</h4>
              <p>69 Kč</p>
              <a
                href="https://697363.myshoptet.com/stolni-lampicka-tiny-tim/"
                target="_blank"
                >Koupit</a
              >
            </div>
          </div>
        </div>
      </div>
      <div class="swiper-button-next"></div>
      <div class="swiper-button-prev"></div>
    </div>
        <div class="presale-sl-countdown">
          <span>2d : 21h : 14min</span>
    </div>
    <div class="accordion-wrapper">
      <div class="accordion">
   
   
   
  </div>
  </div>
  </div>
`;

/**
 * Copies the discount code from the presale banner to the user's clipboard.
 * Changes the icon to a checkmark temporarily to indicate success.
 */
function copySinglePageCode() {
  const copyText = document.getElementsByClassName('presale-sl-sale-code')[0];
  const code = copyText.innerText;

  navigator.clipboard.writeText(code).then(
    function () {
      const img = document.getElementsByClassName(
        'presale-sl-sale-code-copy-icon'
      )[0];

      const originalSrc = img.src;

      img.src =
        'https://cdn.myshoptet.com/usr/697363.myshoptet.com/user/documents/presale/public/check.svg';
      setTimeout(function () {
        img.src = originalSrc;
      }, 1500);
    },
    function (err) {
      console.error('Async: Could not copy text: ', err);
    }
  );
}

/**
 * Updates the `src` attribute of the first element with the given class name.
 * @param {string} className - Class of the element to update.
 * @param {string} src - New source URL.
 * @returns {HTMLElement} Updated element.
 */
function updateSrcOnClass(className, src) {
  const source = document.getElementsByClassName(className)[0];
  source.src = src;
  return source;
}

/**
 * Updates the `href` attribute of the first element with the given class name.
 * @param {string} className - Class of the anchor element.
 * @param {string} href - New link URL.
 */
function updateHrefOnClass(className, href) {
  document.getElementsByClassName(className)[0].href = href;
}

/**
 * Hides the first element with the given class name from view.
 * @param {string} className - Class of the element to hide.
 */
function hideBannerOnClass(className) {
  const element = document.getElementsByClassName(className)[0];
  if (element) {
    element.style.display = 'none';
    element.style.marginTop = '0';
  }
}

/**
 * Updates the title banner with a given media (image/video) and optional product link.
 * @param {string} mediaUrl - URL to image or video.
 * @param {string} productUrl - Optional redirect link.
 * @param {string} altText - Alternate text for accessibility.
 */
function updateBanner(mediaUrl, productUrl = '#', altText = '') {
  const videoExtensions = ['.mp4', '.webm', '.ogg'];
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];

  const container = document.querySelector('.presale-sl-title-banner');
  if (!container) return;

  container.innerHTML = ''; // Clear previous content

  const lowerUrl = mediaUrl.toLowerCase();

  if (videoExtensions.some(ext => lowerUrl.endsWith(ext))) {
    const video = document.createElement('video');
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;
    video.setAttribute('loop', '');
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('autoplay', '');
    video.setAttribute('alt', altText);
    video.className = 'lazyloaded';

    const source = document.createElement('source');
    source.className = 'presale-sl-variable-title-banner';
    source.setAttribute('type', 'video/mp4');
    source.setAttribute('src', mediaUrl);

    video.appendChild(source);
    container.appendChild(video);

    // Try to play programmatically (for some browsers)
    setTimeout(() => {
      video.play().catch(() => {});
    }, 100);
  } else if (imageExtensions.some(ext => lowerUrl.endsWith(ext))) {
    const img = document.createElement('img');
    img.className = 'presale-sl-variable-title-banner lazyloaded';
    img.setAttribute('src', mediaUrl);
    img.setAttribute('alt', altText);
    container.appendChild(img);
  } else {
    console.warn('Unsupported media format:', mediaUrl);
    return;
  }

  const link = document.createElement('a');
  link.className = 'presale-sl-title-banner-link';
  link.setAttribute('href', productUrl);
  link.setAttribute('target', '_blank');
  link.textContent = 'Koupit';

  container.appendChild(link);
}

document.addEventListener('DOMContentLoaded', function () {
  /**
   * Fetches and renders dynamic configuration from the CustomerFlow backend
   * based on the Shoptet project ID extracted from the `dataLayer`.
   */
  async function loadSource() {
    let projectId = null;

    if (Array.isArray(dataLayer)) {
      const shoptetObj = dataLayer.find((item) => item.shoptet);
      if (shoptetObj) {
        projectId = shoptetObj.shoptet.projectId;
      }
    }

    const config = await fetch(
      `https://customerflow.cz/shoptet/presell/config?clientId=${projectId}`
    )
    // const config = await fetch(
    //   `http://localhost:8000/config?clientId=${projectId}`
    // )
      .then((response) => response.json())
      .catch((error) => console.error('Error fetching JSON:', error));

    if (config.soloLanding[0].url !== window.location.href) return;

    document.querySelector('div[itemprop="about"]').innerHTML = presaleContent;
    document.getElementsByClassName('content-inner')[0].style.width = '100%';
    document.getElementById('content').style.justifyContent = 'start';

    const landingConfig = config.soloLanding[0];
    const components = landingConfig.components;

    /**
     * Iterates over components and renders them based on their type and visibility.
     */
    components.forEach((component) => {
      switch (component.name) {
        case 'titleBanner':
          updateBanner(component.src, component.redirectUrl ,component.alt);
          
          if (!component.visible) {
            hideBannerOnClass('presale-sl-title-banner');
            return;
          }

          break;
        case 'benefitFirst':
          if (!component.visible) {
            hideBannerOnClass('presale-sl-benefit-first');
            return;
          }
          const firstBenefitImage = updateSrcOnClass(
            'preslae-sl-variable-benefit-first',
            component.src
          );
          updateHrefOnClass('presale-sl-benefit-first', component.redirectUrl);

          firstBenefitImage.setAttribute('alt', component.alt || '');
          break;
        case 'benefitSecond':
          if (!component.visible) {
            hideBannerOnClass('presale-sl-benefit-second');
            return;
          }
          const secondBenefitImage = updateSrcOnClass(
            'preslae-sl-variable-benefit-second',
            component.src
          );
          updateHrefOnClass('presale-sl-benefit-second', component.redirectUrl);

          secondBenefitImage.setAttribute('alt', component.alt || '');
          break;
        case 'benefitBanner':
          if (!component.visible) {
            hideBannerOnClass('presale-sl-sub-banner');
            return;
          }
          const benefitBanner = updateSrcOnClass(
            'presale-sl-variable-benefit-banner',
            component.src
          );
          updateHrefOnClass('presale-sl-sub-banner', component.redirectUrl);

          benefitBanner.setAttribute('alt', component.alt || '');
          break;
        case 'compareBanner':
          if (!component.visible) {
            hideBannerOnClass('presale-sl-compare-banner');
            return;
          }
          const compareBanner = updateSrcOnClass(
            'presale-sl-variable-compare-desktop',
            component.src
          );
          updateHrefOnClass('presale-sl-compare-banner', component.redirectUrl);

          compareBanner.setAttribute('alt', component.alt || '');
          break;
        case 'usps':
          if (!component.visible) {
            hideBannerOnClass('presale-sl-usp');
            return;
          }
          const uspsContainer = document.querySelector('.presale-sl-usp');
          component.src.forEach((item, index) => {
            const uspItem = document.createElement('a');
            uspItem.classList.add('presale-sl-usp-item');

            if (item.redirectUrl) {
              uspItem.setAttribute('href', item.redirectUrl);
            }

            const uspImg = document.createElement('img');
            uspImg.setAttribute('src', item.src);
            uspImg.setAttribute('alt', item.alt);

            const uspText = document.createElement('p');
            uspText.classList.add(
              `preslae-sl-variable-usp-item-${index + 1}-text`
            );
            uspText.innerText = item.description;

            uspItem.appendChild(uspImg);
            uspItem.appendChild(uspText);
            uspsContainer.appendChild(uspItem);
          });
          break;
        case 'ugcs':
          if (!component.visible) {
            hideBannerOnClass('desktopSwiper');
            hideBannerOnClass('presale-sl-ugcs-mobile');
            return;
          }
          const ugcContainer = document.querySelector(
            '.desktopSwiper .swiper-wrapper'
          );

          component.src.forEach((item) => {
            const ugcItem = document.createElement('div');
            ugcItem.classList.add('swiper-slide', 'presale-sl-swiper-item');

            const video = document.createElement('video');
            video.setAttribute('controls', '');
            const source = document.createElement('source');
            source.setAttribute('type', 'video/mp4');
            source.setAttribute('src', item.src);

            ugcContainer.appendChild(ugcItem);
            video.appendChild(source);
            ugcItem.appendChild(video);

            video.autoplay = true;
            video.loop = true;
            video.muted = true;
          });

          const ugcMobileContainer = document.querySelector(
            '.cardSwiper .swiper-wrapper'
          );
          component.src.forEach((item) => {
            const ugcMobileItem = document.createElement('div');

            ugcMobileItem.classList.add(
              'swiper-slide',
              'presale-sl-swiper-slide'
            );

            const videoMobile = document.createElement('video');
            videoMobile.setAttribute('controls', '');

            if (item.alt) {
              videoMobile.setAttribute('alt', item.alt);
            }
            const sourceMobile = document.createElement('source');
            sourceMobile.setAttribute('type', 'video/mp4');
            sourceMobile.setAttribute('src', item.src);

            ugcMobileContainer.appendChild(ugcMobileItem);
            videoMobile.appendChild(sourceMobile);
            ugcMobileItem.appendChild(videoMobile);

            videoMobile.autoplay = true;
            videoMobile.loop = true;
            videoMobile.muted = true;
          });

          const desktopSwiper = new Swiper('.desktopSwiper', {
            slidesPerView: 2,
            spaceBetween: 0,
            loop: true,
            navigation: {
              nextEl: '.swiper-button-next',
              prevEl: '.swiper-button-prev',
            },
          });

          var cardSwiper = new Swiper('.cardSwiper', {
            effect: 'cards',
            grabCursor: true,
            navigation: {
              nextEl: '.swiper-button-next',
              prevEl: '.swiper-button-prev',
            },
          });
          break;
        case 'saleBanner':
          if (!component.visible) {
            hideBannerOnClass('presale-sl-sale-bar');
            return;
          }
          document.getElementsByClassName('presale-sl-sale-span')[0].innerText =
            component.description;
          document.getElementsByClassName('presale-sl-sale-code')[0].innerText =
            component.code;
          break;
        case 'productCarousel':
          if (!component.visible) {
            hideBannerOnClass('mySwiper');
            return;
          }
          break;
        case 'countdown':
          if (!component.visible) {
            hideBannerOnClass('presale-sl-countdown');
            return;
          }
          break;
        case 'accordion':
          if (!component.visible) {
            hideBannerOnClass('accordion-wrapper');
            return;
          }
          const accordion = document.querySelector('.accordion');
          component.description.forEach((item) => {
            const accordionItem = document.createElement('div');
            accordionItem.classList.add('accordion-item');

            const accordionHeader = document.createElement('div');
            accordionHeader.classList.add('accordion-header');
            accordionHeader.innerHTML =
              item.question + '<span class="accordion-icon">▼</span>';

            const accordionContent = document.createElement('div');
            accordionContent.classList.add('accordion-content');
            accordionContent.innerText = item.answer;

            accordionItem.appendChild(accordionHeader);
            accordionItem.appendChild(accordionContent);
            accordion.appendChild(accordionItem);
          });

          document.querySelectorAll('.accordion-header').forEach((header) => {
            header.addEventListener('click', () => {
              const content = header.nextElementSibling;
              const isOpen = content.classList.contains('open');

              document.querySelectorAll('.accordion-content').forEach((c) => {
                c.style.maxHeight = null;
                c.classList.remove('open');
                c.previousElementSibling.classList.remove('active');
              });

              if (!isOpen) {
                content.classList.add('open');
                header.classList.add('active');
                content.style.maxHeight = content.scrollHeight + 40 + 'px';
              }
            });
          });
          break;
        default:
          break;
      }
    });

    const presaleEndDate = new Date(landingConfig.endDate).getTime();
    getCountdown(presaleEndDate);

    let x = setInterval(function () {
      getCountdown(presaleEndDate);
    }, 10000);

    document.querySelector('header[itemprop="headline"]').style.display =
      'flex';
    document.querySelector('header[itemprop="headline"]').style.justifyContent =
      'center';
  }

  /**
   * Initializes and updates the countdown timer.
   * @param {number} countDownDate - End date timestamp in milliseconds.
   */
  let getCountdown = function (countDownDate) {
    let now = new Date().getTime();
    let distance = countDownDate - now;

    let days = Math.floor(distance / (1000 * 60 * 60 * 24));
    let hours = Math.floor(
      (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );
    let minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));

    $('.presale-sl-countdown span:first').html(
      days +
        'd <span class="presale-sl-pulse">:</span> ' +
        hours +
        'h <span class="presale-sl-pulse">:</span> ' +
        minutes +
        'min'
    );

    if (distance < 0) {
      clearInterval(x);
      $('.presale-sl-countdown span:first').html('Sleva skončila');
    }
  };

  /**
   * Only proceed if we are on the allowed page type (e.g., article).
   */
  if (!["article"].includes(dataLayer[0].shoptet.pageType)) {
    return;
  }

  document.getElementById("content")?.classList.add("presale-sl-main");

  loadSource();

  var swiper = new Swiper('.mySwiper', {
    slidesPerView: 3,
    spaceBetween: 0,
    loop: true,
    navigation: {
      nextEl: '.swiper-button-next',
      prevEl: '.swiper-button-prev',
    },
  });
});
