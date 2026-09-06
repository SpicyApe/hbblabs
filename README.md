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

## Deployment

Two repos, two hosts, and they do not deploy the same way.

**Storefront** — this repo, public, on Netlify at **hbb-labs.com**. Pushing to
`main` builds and deploys automatically. The link is a read-only deploy key
plus a push webhook rather than Netlify's GitHub App, because the app was never
installed on the account; the practical difference is that pull requests get no
deploy previews. `netlify deploy --prod --build` still works for deploying
without a push.

**Backend** — `SpicyApe/hbblabs-backend`, private, on Railway. It deploys by
CLI upload (`railway up` from the repo root), *not* from GitHub: Railway's
GitHub App is not connected to the account, so pushing there deploys nothing.
Push and deploy are two separate acts, and forgetting the second is the easy
mistake.

The backend is private on purpose. Nothing secret is tracked — `.gitignore`
covers `**/.env`, and only `.env.template` with placeholder values is in the
tree — but it is the repo where a payment key would land if one were ever
pasted into the wrong file, and public-to-private does not un-index what has
already been scraped.

### Domains

`hbb-labs.com` is the primary domain, on Netlify DNS, with a wildcard
certificate. `www` redirects to it. `shop.hbb-labs.com` was the original
address and has been dropped — promoting the apex to primary deleted its DNS
record, and it was retired rather than restored since nothing pointed at it.

WordPress previously served the apex from WordPress.com, and the domain is
still registered with Automattic; only the nameservers moved.

## Payments — Bitcoin, via BTCPay

The store can take money. Bitcoin was first not because it is the obvious
choice but because it is the only rail with no gatekeeper: card processors
routinely drop this product category, and a merchant account is weeks of
underwriting. BTCPay needs neither. It is self-hosted and non-custodial — it
watches an xpub we own and never holds the coins — so nobody can switch it off.

### How the flow differs from a card

Bitcoin settles *after* the order exists, and the code is shaped around that
rather than pretending otherwise. The provider reports `pending_authorization`
while an invoice is unpaid, which Medusa treats as a deferred payment method:
the cart completes, the order is created with payment awaiting, and BTCPay's
webhook settles it minutes later. The alternative — holding the customer on
the checkout page until a block lands — is not a checkout anyone finishes.

So the confirmation page serves two states. Unpaid, it shows a **Complete
payment** button linking to the hosted invoice, and says the order ships once
payment confirms. Paid, it reads as a normal confirmation. `order.paymentLink`
carries the invoice; it is read back from the order's payment session, which
is why `getMedusaOrder` asks for fields the store route does not return by
default.

The speed policy is `MediumSpeed` — one confirmation, roughly ten minutes —
rather than BTCPay's own zero-confirmation default. Zero-conf is fine for
digital goods and wrong for anything that ships, because the payment can still
be replaced before it confirms.

### Standing one up

1. **Get a BTCPay Server.** Either self-host it, or use one of the third-party
   hosts in BTCPay's directory. Hosting does not mean custody: you supply an
   xpub from a wallet you control and the coins go straight to it, so a host
   can go away without taking the money with it.

2. **Create a store, then an API key** (Account → Manage account → API keys)
   with: view invoices, create invoice, modify invoices, view your stores.

3. **Add a webhook** on the store pointing at
   `https://<backend>/hooks/payment/btcpay_btcpay`, subscribed to at least
   `InvoiceSettled`, `InvoiceProcessing`, `InvoiceExpired` and
   `InvoiceInvalid`. Copy the secret it generates.

4. **Set these on the Railway backend service** — never in the repo:

   ```
   BTCPAY_SERVER_URL        https://your-btcpay-host
   BTCPAY_API_KEY           the Greenfield key from step 2
   BTCPAY_STORE_ID          the BTCPay store id
   BTCPAY_WEBHOOK_SECRET    from step 3
   ```

   Optional: `BTCPAY_SPEED_POLICY`, `BTCPAY_EXPIRATION_MINUTES` (default 60),
   `BTCPAY_REDIRECT_URL`.

The provider registers only when the first three are present, and the seed
attaches it to the US region on the next boot. Until then the store runs on
`pp_system_default` and the checkout page says so rather than implying a
purchase happened.

**The webhook secret is not optional in practice.** The webhook endpoint is
unauthenticated by necessity — BTCPay cannot log in — so the `BTCPay-Sig`
HMAC is the only thing between a stranger and marking any order paid. Without
the secret set, the provider refuses every webhook and logs why, which means
orders never settle. That is the safe failure, but it is still a failure.

### A Medusa bug worth knowing about

Medusa's payment-provider loader means to disable providers that drop out of
the config, but it looks for them with `list({ id: providersToLoad })` — a
filter that can only return providers still in the config — so the branch
never runs. **A provider configured once stays `is_enabled` forever.** The
seed therefore does not trust that table: it confirms an id exists there, but
the environment decides what is actually attached to the region, mirroring
`medusa-config.ts`. Attaching a provider whose implementation is no longer
loaded would break checkout for whoever was offered it.

`npx medusa exec ./src/scripts/list-payment-providers.ts` in the backend repo
prints what is registered and which regions offer it.

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

### Payments — NMI (cards)

Bitcoin works (above); cards do not. The backend registers
`medusa-payment-nmi` only when `NMI_SECURITY_KEY` is present (see
`medusa-config.ts` in the backend repo), and there is no merchant account
behind it, so it has never taken a payment. Cards matter anyway — most
customers will not pay in Bitcoin — so this is unfinished, not abandoned.

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

- **The checkout picks the payment method for the customer.**
  `PROVIDER_PREFERENCE` in `src/lib/medusa.ts` decides, and
  `availablePaymentMethod` duplicates the same ordering to write the copy.
  Once cards work, the choice belongs to the customer and both constants
  should be replaced by a payment-method step.

- **Refunds in Bitcoin are not silent.** There is no stored instrument to
  push money back to, so BTCPay answers a refund with a pull payment — a
  claim link the customer opens to name a destination address. The provider
  returns it as `refundClaimLink`, but nothing emails it to anyone yet.

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
