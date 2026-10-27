# CustomerFlow Předprodej: storefront

The code that runs in the merchant's shop. It shows a pre-sale campaign on the product
detail page and in product listings, and builds the optional pre-sale landing page from
blocks the merchant set up in the addon's settings.

This repository is a mirror. The source of truth is `packages/storefront` in the
CustomerFlow monorepo, which also holds the settings UI and the API that publish the
configuration described below. Changes are made there and copied here on release.

## What it changes in the shop

Nothing, unless the inline configuration is present and valid. When it is:

- **Product detail page** of a product in an active campaign that is not in stock: a
  widget is inserted directly before the shop's own purchase block (`.p-to-cart-block`,
  `.variant-table` or `.add-to-cart`). It shows the deadline as a countdown, why the
  product can be ordered now, the merchant's note, and the discount with its code. The
  purchase block itself is not moved, restyled or hidden. Inside the shop's markup, only
  the words of the conversion button ("Předobjednat") and of the availability label
  ("Předobjednávka") change. Everything is searched for inside `.p-detail`, skipping
  related-product tiles (`[data-micro-identifier]`).
- **Product listings** (category, search, homepage, manufacturer): a "Předprodej" badge
  on the product's tile, and the same word on its availability line.
- **The landing page**: on the one article whose path matches the configuration, the
  blocks are appended after the merchant's own content, in a container of our own.

At the campaign's deadline everything above is taken down and the original words are put
back, also on a page that stays open past it. A campaign that has not started yet is not
shown. All of this re-runs on `ShoptetDOMContentLoaded`, and every step is idempotent.

## Configuration

The addon writes the configuration into the shop's template through the template-include
API (`POST /api/template-include`, location `common-header`) as

```html
<script type="application/json" id="cfp-config">
  { … }
</script>
```

so the storefront reads it from the document and never requests anything from
CustomerFlow. The whole element, landing page included, must fit Shoptet's limit of
**8 192 characters**. The settings UI rejects a save that would exceed it, so the
storefront never receives a truncated configuration. `<`, `>` and `&` are escaped as
`<`, `>` and `&`, so merchant text cannot end the script element early.

```jsonc
{
  "v": 25, // configuration version, bumped on every change
  "eshopId": 697363,
  "products": [
    {
      "productGuid": "…", // Shoptet product guid
      "startsAt": "2026-10-01T00:00:00Z", // or null
      "endsAt": "2026-11-01T22:59:00Z", // or null: no countdown, no deadline
      "bannerText": "Předprodej končí za", // countdown caption, or null
      "infoText": "Odesíláme v listopadu.", // merchant's note, or null
      "discountCode": "PREDPRODEJ20", // or null
      "discountPercent": 20, // 1–99, or null
      "inStock": false, // from the Shoptet API; true means no pre-sale UI
    },
  ],
  "landing": {
    "urlPath": "/predprodej", // the article the blocks go on
    "title": "Jarní kolekce", // names the landmark, or null
    "endsAt": null, // after this the blocks are taken down
    "blocks": [{ "block": { "type": "sale", "text": "Sleva na předobjednávky", "percent": 10 } }],
  },
  "theme": { "accentColor": "#1b6ef3" }, // or null: the shop's conversion colour is used
}
```

Only enabled campaigns that have not ended are published, and the landing page only while
it is published and running. The storefront still checks both dates itself, because a page
may be cached across either moment. A configuration with `"disabled": true` or
`"partial": true` renders nothing.

### Landing blocks

Every block is validated by the API against its own model before it can be saved. URLs
must be `http` or `https` with a host; `javascript:` and other schemes are refused there
and again here. All text is inserted as text, never as markup.

| `type`         | Fields                                                            |
| -------------- | ----------------------------------------------------------------- |
| `title_banner` | `media` (linked), `heading` ≤ 200, `subheading` ≤ 300             |
| `benefit`      | `media` (linked), `heading` ≤ 200, `text` ≤ 1 000                 |
| `banner`       | `media` (linked)                                                  |
| `compare`      | `desktop` media, `mobile` media or null                           |
| `sale`         | `text` ≤ 200, `code` ≤ 64 or null, `percent` 1–99 or null         |
| `usps`         | `items`: up to 12 of `media`, `title` ≤ 120, `text` ≤ 500, `href` |
| `ugc`          | `items`: up to 20 media, shown as a scroll-snap rail              |
| `faq`          | `items`: up to 30 of `question` ≤ 300, `answer` ≤ 2 000           |
| `countdown`    | `endsAt` (with a UTC offset), `heading` ≤ 200                     |

Media is `{ "url", "kind": "image" | "video" | "embed", "alt" ≤ 300 }`; linked media adds
`href` and `linkLabel` ≤ 80. `embed` is a YouTube or Vimeo page URL as the merchant pasted
it, mapped to the provider's player (`youtube-nocookie.com`) at render time. Videos are
never autoplayed.

A block type this bundle does not know is skipped, so the API can ship a new one first. A
malformed campaign or block is dropped in `src/config.js` and costs only itself.

## Art direction

A light card with a quiet neutral surface and one borrowed accent: the merchant's colour
from the settings, otherwise the shop's conversion button. Four still countdown cells are
the signature. No fixed or sticky positioning, no shadows, no gradients, no `!important`,
no moving countdown, and no rule for the shop's own markup: every selector is a `cfp-`
class. Text colour is corrected against the surface it is painted on until it clears
WCAG AA. `test/art-direction.test.js` enforces these rules on the stylesheets.

## Development

```sh
yarn install
yarn lint        # the rules of Shoptet's addon review, plus complexity and length limits
yarn typecheck   # plain JavaScript, type-checked through JSDoc
yarn test        # vitest in jsdom
yarn build       # dist/styles.header.min.css and dist/scripts.footer.min.js
```

The build fails if an asset exceeds 40 KiB or the entry point 60 KiB, since both files
load on every page of the shop. The output targets the browsers Shoptet supports; syntax
newer than ES2017 is transpiled.
