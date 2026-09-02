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
    products.ts               50-compound seed catalog
    pages.ts                  informational page copy
  lib/
    brand.ts                  ALL brand identity — name, nav, thresholds
    db/                       DATABASE SCAFFOLD
    payments/                 PAYMENT SCAFFOLD
    session.ts                cart cookie helpers
  middleware.ts               gate redirect + region routing
```

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
