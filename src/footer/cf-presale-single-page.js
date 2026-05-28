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

const presaleTemplate = document.createElement('template');
presaleTemplate.innerHTML = `
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
          alt="Propagační banner"
        />
      </a>
      <div class="presale-sl-usp">

      </div>
    </div>
      <div class="swiper desktopSwiper">
          <div class="swiper-wrapper">

          </div>
          <button class="swiper-button-next presale-sl-swiper-ugc-button-next"></button>
          <button class="swiper-button-prev presale-sl-swiper-ugc-button-prev"></button>
        </div>

    <div class="presale-sl-ugcs-mobile">
      <div class="swiper cardSwiper">
        <div class="swiper-wrapper">
        </div>
        <button class="swiper-button-next"></button>
        <button class="swiper-button-prev"></button>
      </div>
    </div>

    <a class="presale-sl-compare-banner">
      <img
        class="presale-sl-variable-compare-desktop"
        src="./Plain - Page_files/compare-products.png"
        alt="Srovnání produktů"
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
              <button class="presale-sl-sale-code-copy-btn">
                <img
                  class="presale-sl-sale-code-copy-icon"
                  src="https://cdn.myshoptet.com/usr/697363.myshoptet.com/user/documents/presale/public/copy-icon.svg"
                  alt="Kopírovat kód"
                  height="15px"
                />
              </button>
              <span class="presale-sl-tooltip-text">Kopírovat kód</span>
          </div>
          </div>

          </div>

        </div>
    <div class="swiper mySwiper">
      <div class="swiper-wrapper">
      </div>
      <button class="swiper-button-next"></button>
      <button class="swiper-button-prev"></button>
    </div>
        <div class="presale-sl-countdown">
          <span>2d : 21h : 14min</span>
    </div>
    <div class="presale-accordion-wrapper">
      <div class="presale-accordion">
   
   
   
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
        'presale-sl-sale-code-copy-icon',
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
    },
  );
}

/**
 * Hides the first element with the given class name from view.
 * @param {string} className - Class of the element to hide.
 */
function hideBannerOnClass(className) {
  const element = document.getElementsByClassName(className)[0];
  if (element) {
    element.classList.add('presale-sl-hidden');
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

  if (videoExtensions.some((ext) => lowerUrl.endsWith(ext))) {
    const video = document.createElement('video');
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;
    video.setAttribute('alt', altText);
    video.className = 'lazyloaded';

    const source = document.createElement('source');
    source.className = 'presale-sl-variable-title-banner';
    source.setAttribute('type', 'video/mp4');
    source.setAttribute('src', mediaUrl);

    video.appendChild(source);
    container.appendChild(video);
  } else if (imageExtensions.some((ext) => lowerUrl.endsWith(ext))) {
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
  link.textContent = 'Detail';

  container.appendChild(link);
}

document.addEventListener('DOMContentLoaded', function () {
  /**
   * Fetches and renders dynamic configuration from the CustomerFlow backend
   * based on the Shoptet project ID extracted from the `dataLayer`.
   */
  async function loadSource() {
    const projectId = getShoptetDataLayer('projectId');

    const config = await fetch(
      `https://customerflow.cz/shoptet/presell/config?clientId=${projectId}`,
    )
      .then((response) => response.json())
      .catch((error) => console.error('Error fetching JSON:', error));

    if (config.soloLanding[0].url !== window.location.href) return;

    const aboutContainer = document.querySelector('div[itemprop="about"]');
    aboutContainer.innerHTML = '';
    aboutContainer.appendChild(presaleTemplate.content.cloneNode(true));
    document
      .querySelector('.presale-sl-sale-code-copy-btn')
      .addEventListener('click', copySinglePageCode);
    document
      .getElementsByClassName('content-inner')[0]
      .classList.add('presale-content-inner-full');
    document.getElementById('content').classList.add('presale-content-start');

    const landingConfig = config.soloLanding[0];

    /**
     * Iterates over components and renders them based on their type and visibility.
     */
    landingConfig.components.forEach((component) => {
      switch (component.name) {
        case 'titleBanner':
          updateBanner(component.src, component.redirectUrl, component.alt);

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
          const firstBenefitImage = document.querySelector(
            '.preslae-sl-variable-benefit-first',
          );
          firstBenefitImage.src = component.src;
          document.querySelector('.presale-sl-benefit-first').href =
            component.redirectUrl;

          firstBenefitImage.setAttribute('alt', component.alt || '');
          break;
        case 'benefitSecond':
          if (!component.visible) {
            hideBannerOnClass('presale-sl-benefit-second');
            return;
          }
          const secondBenefitImage = document.querySelector(
            '.preslae-sl-variable-benefit-second',
          );
          secondBenefitImage.src = component.src;
          document.querySelector('.presale-sl-benefit-second').href =
            component.redirectUrl;

          secondBenefitImage.setAttribute('alt', component.alt || '');
          break;
        case 'benefitBanner':
          if (!component.visible) {
            hideBannerOnClass('presale-sl-sub-banner');
            return;
          }
          const benefitBanner = document.querySelector(
            '.presale-sl-variable-benefit-banner',
          );
          benefitBanner.src = component.src;
          document.querySelector('.presale-sl-sub-banner').href =
            component.redirectUrl;

          benefitBanner.setAttribute('alt', component.alt || '');
          break;
        case 'compareBanner':
          if (!component.visible) {
            hideBannerOnClass('presale-sl-compare-banner');
            return;
          }
          const compareBanner = document.querySelector(
            '.presale-sl-variable-compare-desktop',
          );
          compareBanner.src = component.src;
          document.querySelector('.presale-sl-compare-banner').href =
            component.redirectUrl;

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
              `preslae-sl-variable-usp-item-${index + 1}-text`,
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
            '.desktopSwiper .swiper-wrapper',
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
            '.cardSwiper .swiper-wrapper',
          );
          component.src.forEach((item) => {
            const ugcMobileItem = document.createElement('div');

            ugcMobileItem.classList.add(
              'swiper-slide',
              'presale-sl-swiper-slide',
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

          new Swiper('.desktopSwiper', {
            slidesPerView: 2,
            spaceBetween: 0,
            loop: true,
            navigation: {
              nextEl: '.swiper-button-next',
              prevEl: '.swiper-button-prev',
            },
          });

          new Swiper('.cardSwiper', {
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
          const carouselWrapper = document.querySelector(
            '.mySwiper .swiper-wrapper',
          );
          component.src.forEach((product) => {
            const slide = document.createElement('div');
            slide.classList.add('swiper-slide', 'presale-sl-swiper-item');

            const content = document.createElement('div');
            content.classList.add('presale-sl-swiper-item-content');

            const imgWrapper = document.createElement('div');
            imgWrapper.classList.add('presale-sl-swiper-item-img');

            const img = document.createElement('img');
            img.setAttribute('src', product.src);
            img.setAttribute('alt', product.alt || 'Náhled produktu');

            const info = document.createElement('div');
            info.classList.add('presale-sl-swiper-product-info');

            const title = document.createElement('h4');
            title.textContent = product.name;

            const price = document.createElement('p');
            price.textContent = product.price;

            const link = document.createElement('a');
            link.classList.add('btn', 'btn-primary');
            link.setAttribute('href', product.redirectUrl);
            link.textContent = 'Detail';

            info.appendChild(title);
            info.appendChild(price);
            info.appendChild(link);

            imgWrapper.appendChild(img);
            content.appendChild(imgWrapper);
            content.appendChild(info);
            slide.appendChild(content);
            carouselWrapper.appendChild(slide);
          });
          break;
        case 'countdown':
          if (!component.visible) {
            hideBannerOnClass('presale-sl-countdown');
            return;
          }
          break;
        case 'accordion':
          if (!component.visible) {
            hideBannerOnClass('presale-accordion-wrapper');
            return;
          }
          const accordion = document.querySelector('.presale-accordion');
          component.description.forEach((item) => {
            const accordionItem = document.createElement('div');
            accordionItem.classList.add('presale-accordion-item');

            const accordionHeader = document.createElement('div');
            accordionHeader.classList.add('presale-accordion-header');
            accordionHeader.innerHTML =
              item.question + '<span class="presale-accordion-icon">▼</span>';

            const accordionContent = document.createElement('div');
            accordionContent.classList.add('presale-accordion-content');
            const accordionInner = document.createElement('div');
            accordionInner.innerText = item.answer;
            accordionContent.appendChild(accordionInner);

            accordionItem.appendChild(accordionHeader);
            accordionItem.appendChild(accordionContent);
            accordion.appendChild(accordionItem);
          });

          document
            .querySelectorAll('.presale-accordion-header')
            .forEach((header) => {
              header.addEventListener('click', () => {
                const content = header.nextElementSibling;
                const isOpen = content.classList.contains('open');

                document
                  .querySelectorAll('.presale-accordion-content')
                  .forEach((c) => {
                    c.classList.remove('open');
                    c.previousElementSibling.classList.remove('active');
                  });

                if (!isOpen) {
                  content.classList.add('open');
                  header.classList.add('active');
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

    countdownTimer = setInterval(function () {
      getCountdown(presaleEndDate);
    }, 10000);

    document
      .querySelector('header[itemprop="headline"]')
      .classList.add('presale-headline-flex');
  }

  /**
   * Initializes and updates the countdown timer.
   * @param {number} countDownDate - End date timestamp in milliseconds.
   */
  const getCountdown = function (countDownDate) {
    const now = new Date().getTime();
    const distance = countDownDate - now;

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
    );
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));

    document.querySelector('.presale-sl-countdown span').innerHTML =
      days +
      'd <span class="presale-sl-pulse">:</span> ' +
      hours +
      'h <span class="presale-sl-pulse">:</span> ' +
      minutes +
      'min';

    if (distance < 0) {
      clearInterval(countdownTimer);
      document.querySelector('.presale-sl-countdown span').innerHTML =
        'Sleva skončila';
    }
  };

  /**
   * Only proceed if we are on the allowed page type (e.g., article).
   */
  if (!['article'].includes(getShoptetDataLayer('pageType'))) {
    return;
  }

  document.getElementById('content')?.classList.add('presale-sl-main');

  let countdownTimer;
  loadSource();

  new Swiper('.mySwiper', {
    slidesPerView: 3,
    spaceBetween: 0,
    loop: true,
    navigation: {
      nextEl: '.swiper-button-next',
      prevEl: '.swiper-button-prev',
    },
  });
});
