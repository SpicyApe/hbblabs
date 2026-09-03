# Project Hercules

A research-peptide storefront, structurally modelled on
[aminoclub.com](https://www.aminoclub.com/us) but under its own brand identity.

Payment and persistence are deliberately left as **scaffolding** — see below.

## Requirements

**Node.js 20.9 or newer.** Next 16 and Tailwind 4 both refuse to run on older
runtimes, and Node 18 went end-of-life in April 2025.

```
winget install OpenJS.NodeJS.LTS
```

## Running it

```
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
npm run typecheck  # tsc --noEmit
```

The first request redirects to `/gate`. Tick both boxes to set the
research-use attestation cookie, then the storefront opens at `/us`.

## Layout

```
src/
  app/
    gate/                     compliance gate (attestation, not auth)
    [region]/
      page.tsx                home
      store/                  catalog with search, category and sort
      products/[handle]/      product detail
      cart/                   cart
      checkout/               checkout (mock payment)
      order/[id]/             confirmation
      [slug]/                 informational pages, from src/data/pages.ts
    actions/cart.ts           cart server actions
  components/                 header, footer, cards, buy box, vial artwork
  data/
    products.ts               50-compound seed catalog (marketing copy only — see below)
    pages.ts                  informational page copy
  lib/
    brand.ts                  ALL brand identity — name, nav, thresholds
    db/                       DATABASE SCAFFOLD
    payments/                 PAYMENT SCAFFOLD
    woocommerce.ts             WooCommerce Store API client (live product catalog)
    session.ts                cart cookie helpers
  middleware.ts               gate redirect + region routing
```

## Product catalog

Live product data (`store/`, `products/[handle]/`, featured/related lists) is
read from WooCommerce's public Store API — see `src/lib/woocommerce.ts` — not
from `src/data/products.ts`. That file's 50-compound catalog is now only used
for fixed marketing content on the homepage (hero art, the subscription-box
preview) and as a fallback tint source in `src/components/vial.tsx`.

Point `WOOCOMMERCE_URL` (see `.env.example`) at the WooCommerce site to read
from; it defaults to `https://hbb-labs.com`. That has to be a *different*
host to the storefront itself — WordPress keeps `hbb-labs.com` and this app
is served from `shop.hbb-labs.com`. Pointing the catalog at the host the app
answers on would make it request its own products from itself.

The store currently has no published products, so the live catalog pages
render empty until products are added in wp-admin. Catalog reads fail soft:
if WooCommerce is unreachable the pages render as an empty catalog and log
the error, rather than returning a 500.

A variable product's `variations` array carries ids and attributes but no
prices. Each variation is however a product in its own right, so its price
comes from fetching `/products/{variation_id}` — public, no credentials. The
detail page resolves every variation that way to build its size selector;
listings skip it and show one line at the range minimum, since a card only
needs a "from" price and resolving would cost a request per variation.

### Why the cart is not WooCommerce's

Carts stay in this app (see the scaffold below) rather than using the Store
API's `/cart` endpoints, because guest cart sessions do not read back on this
store. Measured against hbb-labs.com:

- `POST /cart/add-item` succeeds — 201, and the response body shows the cart
  accumulating.
- Reading it back afterwards returns an empty cart every time: 0 of 6
  attempts saw the item, using the token from the response, the token from
  the initial `GET /cart`, and with the returned cookies replayed.
- `GET /cart` reports an empty cart even when `/cart/items` has contents.
- Only `woocommerce_items_in_cart` and `woocommerce_cart_hash` come back —
  display hints. The `wp_woocommerce_session_*` cookie that would let
  WooCommerce restore a guest session is never issued.

Responses are `Cache-Control: no-store` and the CDN reports a bypass, so this
is not a cached response. Wiring the cart to WooCommerce in this state would
produce a storefront whose cart always looks empty.

Worth retrying if the store's session handling changes — the endpoints and
their shapes are as expected, and writes already work. What is missing is
session persistence across requests.

### Catalog writes — `scripts/wc-admin.mjs`

The storefront only ever reads, and needs no credentials. Writing to the
catalog goes through the authenticated `wc/v3` admin API instead.

Generate a key in wp-admin under **WooCommerce → Settings → Advanced → REST
API**, with `Read/Write` permission. The consumer secret is shown once. Put
both in `.env.local` — `.env*` is gitignored — and never in a query string,
which would put them in access logs and `Referer` headers.

```
node --env-file=.env.local scripts/wc-admin.mjs check
node --env-file=.env.local scripts/wc-admin.mjs create-test-product
```

`check` verifies the key reads and lists what's published; it deliberately
does not probe write access, because the only way to test that is to attempt
a write, and WordPress does not require a post title — an empty probe can
leave a junk draft in a live store. `create-test-product` publishes one
simple product exercising price scaling, sale pricing and category mapping.

```
node --env-file=.env.local scripts/wc-admin.mjs push-product glp-3
```

`push-product` publishes a product from `src/data/products.ts` — Node strips
the types, so the seed catalog stays the single source of truth instead of
product data being restated in the script. Multi-variant products become
WooCommerce variable products: a "Size" attribute whose options are the
variant labels, plus a variation per label carrying its price. It skips
products already present rather than duplicating them.

Categories are resolved to ids, creating them when absent. Products
reference categories by id and a `{ name }` on the product payload is
silently dropped, which is how the first test product ended up
uncategorised.

## The two scaffolds

### Database — `src/lib/db/index.ts`

Every read and write goes through this module. It is currently backed by the
static catalog plus an in-process `Map`, held on `globalThis` so dev-mode hot
reload doesn't wipe the cart.

Nothing persists across a restart, and it will not survive more than one server
instance. Keep the exported signatures, reimplement the bodies against a real
datastore, and no component needs to change. A suggested schema is in the file
header.

### Payments — `src/lib/payments/index.ts`

`MockPaymentProvider` approves everything except `tok_decline` and moves no
money. Implement the `PaymentProvider` interface against a real gateway and
swap the one line in `getPaymentProvider()`.

Before that goes live, read the notes in the file header. The important ones:
card data must never reach this server (use the gateway's hosted fields),
confirm the amount server-side from the cart rather than the request body, and
make `capture` idempotent on order id.

## Notes from the build

- Cart ids are materialized under the id the cookie already holds. The obvious
  `carts.get(id) ?? createCart()` is wrong: it mints a *new* id, so every add
  after a restart or eviction silently lands in a cart nothing points at.
- Order creation and cart deletion are separated by the payment result, so a
  declined card does not destroy the basket.
- `CheckoutState` echoes submitted fields back to the form. React 19 resets an
  uncontrolled form once its action resolves, so without that a decline would
  clear the whole address block. The payment token is deliberately not echoed.
- Vial tints come from catalog position, not a hash of the handle. Hashing 50
  short similar strings distributed badly — one swatch drew twelve products and
  another drew none.

## Known gaps

- **No authentication.** `order/[id]` is readable by anyone who knows the id.
- **No real product photography** — `src/components/vial.tsx` draws a tinted SVG
  vial per compound instead. Swap it for `<Image>` when assets exist.
- **Bulk pricing previews but does not apply** at checkout. The tier table is
  hard-coded in `src/components/buy-box.tsx` and belongs on the product record.
- **Purity percentages are derived from the handle**, not from real COA data.
- **Subscription box, bundles, and the COA lookup are routed but not built.**
- **Legal pages are placeholders** and say so on the page. They need counsel
  before launch.

## Rebranding

Identity lives in exactly two places:

- `src/lib/brand.ts` — name, legal name, nav, support address, thresholds
- `src/app/globals.css` — the `@theme` block (ink / copper / bone palette)

Change those two and the whole site follows.

## Compliance posture

The gate at `/gate` records an attestation: age and qualified-researcher
status. It is **not** an access control and should not be mistaken for one. A
production deployment should also write an audit row — timestamp, hashed IP,
user agent, and the exact wording affirmed — because the value of an
attestation is being able to demonstrate it was made.
