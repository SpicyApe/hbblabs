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

## What is not finished

### Orders

Orders are real: checkout completes the cart through Medusa, so they persist,
survive a restart and appear in the Medusa admin. The in-process `Map` they
used to live in is gone, along with `src/lib/payments`.

Two details that cost time and are easy to trip over again. Cart completion
answers `200` with `type: "cart"` when it refuses, so success has to be
checked on the type rather than the status code. And Medusa's order
`subtotal` **includes shipping** — `item_total` is the goods alone, which is
what the confirmation page needs if its arithmetic is to add up.

### Payments — NMI

Orders are real and persist in Medusa, but **no money moves**. The backend
registers `medusa-payment-nmi` only when `NMI_SECURITY_KEY` is present
(see `medusa-config.ts` in the backend repo); without it Medusa falls back
to `pp_system_default`, which authorises without taking anything. So the
store currently creates genuine orders nobody has paid for.

Finishing it needs three things, in order:

1. **An NMI merchant account.** This is underwriting with a bank, not a
   signup — weeks, not minutes. It is the real gate, and no code gets
   around it. NMI is a high-risk gateway, which is the point: Stripe,
   PayPal and Square all decline this product category in their
   acceptable-use policies. It is also what aminoclub.com settles through.

2. **Keys into Railway** (Settings → Security Keys and Webhooks in the NMI
   Merchant Portal), set on the backend service, never in the repo:

   ```
   NMI_SECURITY_KEY        server-side transact.php calls
   NMI_TOKENIZATION_KEY    browser tokenization
   NMI_WEBHOOK_SECRET      HMAC verification, required for ACH settlement
   NMI_SANDBOX=true        routes to sandbox.nmi.com while testing
   ```

   Sandbox keys come from a sandbox account — the plugin ships no public
   demo credentials, so this step cannot be faked or tested around.

3. **Card fields in the storefront.** The plugin ships `NmiCardFields` /
   `NmiAchFields` (Collect.js) and `NmiPaymentElement` as template code to
   be copied into this app. They mount the gateway's hosted fields — an
   iframe NMI owns — so card numbers never reach this server, and hand a
   token to `initiatePaymentSession`. The checkout page has a placeholder
   where these go.

   This is deliberately not written yet: it cannot be exercised without a
   tokenization key, and untested payment code is worse than none.

Two rules that outlive the integration: confirm the amount server-side from
the cart, never from the request body, and make capture idempotent on order
id.

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

- **Shipping is configured in two places.** `brand.flatShipping` and
  `brand.freeShippingOver` quote the cart; the seed's `FLAT_SHIPPING` and
  `FREE_SHIPPING_OVER` price the Medusa shipping option that actually
  charges the order. Nothing enforces that they agree, and if they drift the
  customer is shown one number and billed another.

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
