/**
 * Entry point. Loads on every page of every shop that has the addon installed, which is
 * the constraint that shapes everything else here: it has to be small, it has to do
 * nothing at all on pages that are not ours, and it must never throw into somebody
 * else's console.
 */

import './styles/bar.css';
import './styles/landing.css';

import { applyCatalogue } from './catalogue.js';
import { activeCampaigns, activeLanding, load } from './config.js';
import { translator } from './i18n.js';
import { applyLanding } from './landing.js';
import { applyProductPage } from './product-page.js';
import { currentProductGuid, onContentReady, pageType } from './shoptet.js';
import { currentPath } from './url.js';

const PRODUCT_PAGE = 'productDetail';
const LISTING_PAGES = [
  'category',
  'parametricCategory',
  'homepage',
  'search',
  'manufacturerDetail',
];

/**
 * @param {import('./config.js').PresaleConfig} config
 * @param {ReturnType<typeof translator>} t
 */
function maybeRenderLanding(config, t) {
  const landing = activeLanding(config);
  if (landing) onContentReady(() => applyLanding(landing, t, currentPath(), config.theme));
}

function start() {
  const config = load();
  if (!config) return;

  const t = translator();
  const type = pageType();

  // The landing page is an ordinary article, so it is not one of the page types below.
  // `applyLanding` compares the path before touching anything, which is what keeps the
  // addon away from the shop's other articles.
  maybeRenderLanding(config, t);

  if (type !== PRODUCT_PAGE && !LISTING_PAGES.includes(type)) return;

  // Re-runs after every Shoptet DOM update: filtering a category, paging through it and
  // switching a variant all replace the nodes we wrote into. Each step claims the node
  // it touches, so running again is a no-op where the work is already done.
  onContentReady(() => {
    const campaigns = activeCampaigns(config);
    if (campaigns.length === 0) return;

    if (type === PRODUCT_PAGE) {
      applyProductPage(campaigns, currentProductGuid(), t, config.theme);
      return;
    }
    applyCatalogue(campaigns, t, config.theme);
  });
}

start();
