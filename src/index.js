/**
 * Entry point. Loads on every page of every shop that has the addon installed, which is
 * the constraint that shapes everything else here: it has to be small, it has to do
 * nothing at all on pages that are not ours, and it must never throw into somebody
 * else's console.
 */

import './styles/bar.css';

import { applyCatalogue } from './catalogue.js';
import { activeCampaigns, load, loadProduct } from './config.js';
import { translator } from './i18n.js';
import { applyProductPage } from './product-page.js';
import { currentProductGuid, onContentReady, pageType, templateName } from './shoptet.js';

const PRODUCT_PAGE = 'productDetail';
const LISTING_PAGES = [
  'category',
  'parametricCategory',
  'homepage',
  'search',
  'manufacturerDetail',
];

function start() {
  const type = pageType();
  // Every page is inline-only. If the snippet is missing or incomplete, fail closed.
  const config = type === PRODUCT_PAGE ? loadProduct() : load();
  if (!config) return;

  const t = translator();

  if (type !== PRODUCT_PAGE && !LISTING_PAGES.includes(type)) return;

  // Re-runs after every Shoptet DOM update: filtering a category, paging through it and
  // switching a variant all replace the nodes we wrote into. Each step claims the node
  // it touches, so running again is a no-op where the work is already done.
  onContentReady(() => {
    const campaigns = activeCampaigns(config);
    if (campaigns.length === 0) return;

    if (type === PRODUCT_PAGE) {
      applyProductPage(campaigns, currentProductGuid(), templateName(), t, config.theme);
      return;
    }
    applyCatalogue(campaigns, t, config.theme);
  });
}

void start();
