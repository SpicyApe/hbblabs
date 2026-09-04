# Project Hercules

A research-peptide storefront, structurally modelled on
[aminoclub.com](https://www.aminoclub.com/us) but under its own brand identity.

The catalog and carts are real, served by Medusa. **Payments and orders are
still scaffolding** — see below.

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

**The Medusa backend must be running**, or every catalog page renders empty —
reads fail soft rather than erroring. From `../hercules-medusa`:

```
npm run backend:dev    # http://localhost:9000, admin at /app
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
    db/                       backend seam — catalog, cart, ORDER SCAFFOLD
    payments/                 PAYMENT SCAFFOLD
    medusa.ts                 Medusa Store API client — catalog and carts
    session.ts                cart cookie helpers
  middleware.ts               gate redirect + region routing
```

## Commerce backend

The catalog, categories and carts all come from **Medusa**, via its Store API
— see `src/lib/medusa.ts`. The backend lives in its own repo alongside this
one (`../hercules-medusa`); this app never talks to a database directly.

Point `MEDUSA_BACKEND_URL` and `MEDUSA_PUBLISHABLE_KEY` at it (see
`.env.example`). Two conversions live in the client:

- **Money.** Medusa deals in decimal amounts (69.99); this app stores minor
  units (6999) to keep money out of floating point.
- **Region.** Prices exist only within a region, so every catalog read passes
  one. The region is resolved by matching `MEDUSA_CURRENCY` rather than by a
  configured id, because ids differ between a local database and a deployed
  one.

`src/data/products.ts` is no longer read at request time. It is the source the
Medusa catalog was seeded from — `node scripts/export-catalog.mjs <path>`
writes it out as JSON for the backend's seed script — and it still supplies
the homepage's fixed marketing content and the vial tints.

Fields Medusa has no column for (aliases, form, storage, sequence, CAS, and
the featured flag) travel as product metadata and are read back out in
`mapProduct`.

### Why not WooCommerce

The catalog previously came from WooCommerce, which worked. Its cart did not:
writes succeeded and the response showed the cart filling, but reading it back
returned an empty cart every time — 0 of 6 attempts, using the token from the
response, the token from the initial `GET /cart`, and with the returned
cookies replayed. The `wp_woocommerce_session_*` cookie that would let
WooCommerce restore a guest session was never issued. Responses were
`no-store` and the CDN reported a bypass, so it was not a cached response.

That is the grain of the tool rather than a misconfiguration: WooCommerce
assumes a browser holding a cookie session against the host that renders the
pages. Medusa treats carts as server-side objects addressed by id, which is
why the same operation works here.

## The remaining scaffolds

### Orders — `src/lib/db/index.ts`

Every read and write goes through this module, and the catalog and cart halves
of it are now real. **Orders are not.** They are an in-process `Map` held on
`globalThis`: they do not persist across a restart, will not survive more than
one server instance, and are not the orders Medusa knows about.

Medusa's `/store/carts/:id/complete` turns a cart into a genuine order.
Wiring checkout to it — alongside a payment provider that moves money — is
what makes this real.

### Payments — `src/lib/payments/index.ts`

`MockPaymentProvider` approves everything except `tok_decline` and moves no
money. Implement the `PaymentProvider` interface against a real gateway and
swap the one line in `getPaymentProvider()`.

Before that goes live, read the notes in the file header. The important ones:
card data must never reach this server (use the gateway's hosted fields),
confirm the amount server-side from the cart rather than the request body, and
make `capture` idempotent on order id.

## Notes from the build

- Order creation and cart deletion are separated by the payment result, so a
  declined card does not destroy the basket.
- `CheckoutState` echoes submitted fields back to the form. React 19 resets an
  uncontrolled form once its action resolves, so without that a decline would
  clear the whole address block. The payment token is deliberately not echoed.
- Vial tints come from catalog position, not a hash of the handle. Hashing 50
  short similar strings distributed badly — one swatch drew twelve products and
  another drew none.
- The vial's drawn label can differ from the product name, via
  `LABEL_OVERRIDES` in `src/components/vial.tsx`. A vial is labelled with what
  is in it, which is not always what the product is sold as.

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
