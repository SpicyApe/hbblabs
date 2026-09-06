/**
 * Medusa Store API client.
 *
 * Replaces the WooCommerce client as the source of catalog and cart data.
 * Maps Medusa's shapes onto this app's `Product`/`ProductVariant` types so
 * `src/lib/db` and the components above it stay unchanged.
 *
 * Two conversions matter:
 *
 *  - Money. Medusa deals in decimal amounts (69.99); this app stores minor
 *    units (6999) to keep money out of floating point.
 *  - Region. Prices only exist within a region, so every catalog read passes
 *    one. The region is resolved by currency rather than configured by id,
 *    since ids differ between a local database and a deployed one.
 *
 * Reads fail soft: the catalog lives on another host, so an outage renders
 * an empty catalog and logs, rather than 500ing every page.
 */

import type { Product, ProductVariant } from "@/data/products";

const BACKEND = (process.env.MEDUSA_BACKEND_URL ?? "http://localhost:9000").replace(/\/$/, "");
const PUBLISHABLE_KEY = process.env.MEDUSA_PUBLISHABLE_KEY ?? "";
const CURRENCY = (process.env.MEDUSA_CURRENCY ?? "usd").toLowerCase();

interface MedusaPrice {
  calculated_amount: number | null;
  original_amount: number | null;
  currency_code: string;
}

interface MedusaVariant {
  id: string;
  title: string;
  calculated_price?: MedusaPrice | null;
}

interface MedusaCategory {
  id: string;
  name: string;
  handle: string;
}

interface MedusaProduct {
  id: string;
  title: string;
  handle: string;
  subtitle: string | null;
  description: string | null;
  metadata: Record<string, string> | null;
  categories?: MedusaCategory[];
  variants?: MedusaVariant[];
}

export interface MedusaCartItem {
  id: string;
  variant_id: string;
  product_title: string;
  product_handle: string | null;
  variant_title: string | null;
  quantity: number;
  unit_price: number;
}

export interface MedusaCart {
  id: string;
  currency_code: string;
  subtotal: number;
  items: MedusaCartItem[];
}

export interface MedusaOrder {
  id: string;
  display_id?: number;
  email: string | null;
  currency_code: string;
  /** Includes shipping, despite the name. `item_total` is the goods alone. */
  subtotal: number;
  item_total?: number;
  total: number;
  shipping_total?: number;
  items: MedusaCartItem[];
  payment_status?: string;
  status?: string;
  /**
   * Only populated when the extra fields are asked for — see `getMedusaOrder`.
   * Carries the provider's session data, which for BTCPay is where the
   * still-payable invoice link lives.
   */
  payment_collections?: {
    payment_sessions?: {
      provider_id: string;
      status?: string;
      data?: { checkoutLink?: string };
    }[];
  }[];
}

/** Decimal amount to minor units. */
const toMinorUnits = (amount: number | null | undefined): number =>
  amount == null ? 0 : Math.round(amount * 100);

function headers(json = false): HeadersInit {
  return {
    ...(PUBLISHABLE_KEY ? { "x-publishable-api-key": PUBLISHABLE_KEY } : {}),
    ...(json ? { "Content-Type": "application/json" } : {}),
  };
}

async function request<T>(
  path: string,
  init: RequestInit & { revalidate?: number | false } = {},
): Promise<T | null> {
  const { revalidate, ...rest } = init;
  try {
    const res = await fetch(`${BACKEND}${path}`, {
      ...rest,
      headers: { ...headers(rest.body !== undefined), ...(rest.headers ?? {}) },
      ...(revalidate === false
        ? { cache: "no-store" as const }
        : { next: { revalidate: revalidate ?? 60 } }),
    });

    if (!res.ok) {
      console.error(`Medusa ${rest.method ?? "GET"} ${path} failed: ${res.status}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (error) {
    console.error(`Medusa ${rest.method ?? "GET"} ${path} unreachable:`, error);
    return null;
  }
}

/*
 * Region ids differ per environment, so the storefront resolves one by
 * currency and holds onto it. Cached on the module: a miss costs one extra
 * request, never a wrong price.
 */
let regionIdPromise: Promise<string | null> | null = null;

export function regionId(): Promise<string | null> {
  regionIdPromise ??= (async () => {
    const data = await request<{ regions: { id: string; currency_code: string }[] }>(
      "/store/regions",
      { revalidate: 3600 },
    );
    const region =
      data?.regions.find((r) => r.currency_code.toLowerCase() === CURRENCY) ?? data?.regions[0];
    if (!region) console.error(`Medusa: no region found for currency "${CURRENCY}"`);
    return region?.id ?? null;
  })();
  return regionIdPromise;
}

const PRODUCT_FIELDS = "*variants.calculated_price,+metadata,*categories";

/*
 * Category handles are what the storefront's URLs carry, but the products
 * endpoint filters by id and rejects a handle outright with a 400. Resolved
 * once and cached; a miss costs a request, never a wrong filter.
 */
const categoryIdCache = new Map<string, string | null>();

async function categoryIdFor(handle: string): Promise<string | null> {
  const cached = categoryIdCache.get(handle);
  if (cached !== undefined) return cached;

  const data = await request<{ product_categories: MedusaCategory[] }>(
    `/store/product-categories?handle=${encodeURIComponent(handle)}`,
    { revalidate: 3600 },
  );
  const id = data?.product_categories?.[0]?.id ?? null;
  categoryIdCache.set(handle, id);
  return id;
}

function mapProduct(product: MedusaProduct): Product {
  const meta = product.metadata ?? {};

  return {
    handle: product.handle,
    name: product.title,
    // Metadata carries the fields Medusa has no column for. WooCommerce had
    // nowhere to put these, so they were dropped in that integration.
    aliases: meta.aliases ? meta.aliases.split(",").map((a) => a.trim()).filter(Boolean) : [],
    category: product.categories?.[0]?.handle ?? "",
    blurb: product.subtitle ?? "",
    description: product.description ?? "",
    form: meta.form ?? "",
    sequence: meta.sequence || undefined,
    cas: meta.cas || undefined,
    storage: meta.storage ?? "",
    featured: meta.featured === "true",
    variants: (product.variants ?? []).map(
      (v): ProductVariant => ({
        id: v.id,
        label: v.title,
        price: toMinorUnits(v.calculated_price?.calculated_amount),
        compareAt:
          v.calculated_price?.original_amount != null &&
          v.calculated_price.original_amount !== v.calculated_price.calculated_amount
            ? toMinorUnits(v.calculated_price.original_amount)
            : undefined,
        inStock: true,
      }),
    ),
  };
}

async function listRaw(params: Record<string, string | number | undefined>): Promise<Product[]> {
  const region = await regionId();
  const query = new URLSearchParams({ fields: PRODUCT_FIELDS, limit: "100" });
  if (region) query.set("region_id", region);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") query.set(k, String(v));
  }

  const data = await request<{ products: MedusaProduct[] }>(`/store/products?${query}`);
  return (data?.products ?? []).map(mapProduct);
}

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

export async function listMedusaProducts(options?: {
  category?: string;
  search?: string;
  sort?: "featured" | "price-asc" | "price-desc" | "name";
}): Promise<Product[]> {
  const categoryId = options?.category ? await categoryIdFor(options.category) : null;

  const products = await listRaw({
    q: options?.search,
    ...(categoryId ? { "category_id[]": categoryId } : {}),
  });

  /*
   * Sorted here rather than by the API: price lives on the variant, so
   * "cheapest first" is a property of the mapped product, not of a column
   * Medusa can order by.
   */
  const cheapest = (p: Product) =>
    p.variants.length ? Math.min(...p.variants.map((v) => v.price)) : 0;

  switch (options?.sort) {
    case "price-asc":
      return [...products].sort((a, b) => cheapest(a) - cheapest(b));
    case "price-desc":
      return [...products].sort((a, b) => cheapest(b) - cheapest(a));
    case "name":
      return [...products].sort((a, b) => a.name.localeCompare(b.name));
    default:
      return [...products].sort(
        (a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)),
      );
  }
}

export async function getMedusaProduct(handle: string): Promise<Product | null> {
  const products = await listRaw({ handle });
  return products[0] ?? null;
}

export async function getMedusaFeatured(limit = 6): Promise<Product[]> {
  const products = await listRaw({});
  return products.filter((p) => p.featured).slice(0, limit);
}

export async function getMedusaRelated(handle: string, limit = 4): Promise<Product[]> {
  const current = await getMedusaProduct(handle);
  if (!current?.category) return [];

  const categoryId = await categoryIdFor(current.category);
  if (!categoryId) return [];

  const products = await listRaw({ "category_id[]": categoryId });
  return products.filter((p) => p.handle !== handle).slice(0, limit);
}

export async function listMedusaCategories(): Promise<{ slug: string; name: string }[]> {
  const data = await request<{ product_categories: MedusaCategory[] }>(
    "/store/product-categories?limit=100",
  );
  return (data?.product_categories ?? []).map((c) => ({ slug: c.handle, name: c.name }));
}

// ---------------------------------------------------------------------------
// Cart
// ---------------------------------------------------------------------------

/** Carts are per-visitor and change on write, so they are never cached. */
const live = { revalidate: false as const };

export async function createMedusaCart(): Promise<string | null> {
  const region = await regionId();
  const data = await request<{ cart: MedusaCart }>("/store/carts", {
    ...live,
    method: "POST",
    body: JSON.stringify(region ? { region_id: region } : {}),
  });
  return data?.cart.id ?? null;
}

export async function getMedusaCart(cartId: string): Promise<MedusaCart | null> {
  const data = await request<{ cart: MedusaCart }>(`/store/carts/${cartId}`, live);
  return data?.cart ?? null;
}

export async function medusaAddItem(
  cartId: string,
  variantId: string,
  quantity: number,
): Promise<boolean> {
  const data = await request<{ cart: MedusaCart }>(`/store/carts/${cartId}/line-items`, {
    ...live,
    method: "POST",
    body: JSON.stringify({ variant_id: variantId, quantity }),
  });
  return data !== null;
}

/**
 * Sets the quantity of the line holding `variantId`, removing it at zero.
 *
 * Medusa addresses lines by their own id rather than by variant, so the line
 * is located first.
 */
export async function medusaSetQuantity(
  cartId: string,
  variantId: string,
  quantity: number,
): Promise<boolean> {
  const cart = await getMedusaCart(cartId);
  const line = cart?.items.find((item) => item.variant_id === variantId);
  if (!line) return false;

  const data = await request<{ cart: MedusaCart }>(
    `/store/carts/${cartId}/line-items/${line.id}`,
    quantity > 0
      ? { ...live, method: "POST", body: JSON.stringify({ quantity }) }
      : { ...live, method: "DELETE" },
  );
  return data !== null;
}

// ---------------------------------------------------------------------------
// Checkout
// ---------------------------------------------------------------------------

/** Attaches the customer's email to the cart; Medusa requires it to complete. */
export async function setCartEmail(cartId: string, email: string): Promise<boolean> {
  const data = await request<{ cart: MedusaCart }>(`/store/carts/${cartId}`, {
    ...live,
    method: "POST",
    body: JSON.stringify({ email }),
  });
  return data !== null;
}

/**
 * Selects a shipping method on the cart.
 *
 * Medusa refuses to complete a cart whose items require shipping until one is
 * chosen, and the refusal arrives as a 400 at the very last step. There is
 * only one option configured, so the cheapest is taken without asking.
 */
export async function selectShippingMethod(
  cartId: string,
): Promise<{ ok: boolean; error?: string }> {
  const data = await request<{
    shipping_options: { id: string; amount?: number }[];
  }>(`/store/shipping-options?cart_id=${cartId}`, live);

  const options = data?.shipping_options ?? [];
  if (!options.length) {
    return { ok: false, error: "No delivery option is available for this order." };
  }

  const cheapest = options.reduce((low, o) =>
    (o.amount ?? Infinity) < (low.amount ?? Infinity) ? o : low,
  );

  const applied = await request(`/store/carts/${cartId}/shipping-methods`, {
    ...live,
    method: "POST",
    body: JSON.stringify({ option_id: cheapest.id }),
  });

  return applied === null
    ? { ok: false, error: "Could not apply a delivery method." }
    : { ok: true };
}

/**
 * Which provider to use when the region offers more than one.
 *
 * BTCPay comes first because it is the only one here that can actually take
 * money — NMI is registered but has no merchant account behind it, and the
 * system provider records a payment without moving any. `pp_system_default`
 * is last so it is only ever reached when nothing real is configured.
 *
 * SCAFFOLD: this picks for the customer. Once cards work, the choice belongs
 * to them, which means a payment-method step at checkout rather than a
 * constant here.
 */
const PROVIDER_PREFERENCE = [
  "pp_btcpay_btcpay",
  "pp_nmi-card",
  "pp_nmi",
  "pp_system_default",
];

/**
 * How the store can currently be paid.
 *
 * "none" means the backend is running on Medusa's system provider, which
 * records a payment without taking one — the checkout page says so rather than
 * letting a customer believe they have bought something.
 */
export type PaymentMethod = "bitcoin" | "card" | "none";

export async function availablePaymentMethod(): Promise<PaymentMethod> {
  const region = await regionId();
  if (!region) return "none";

  const providers = await request<{
    payment_providers: { id: string; is_enabled?: boolean }[];
  }>(`/store/payment-providers?region_id=${region}`, { revalidate: 300 });

  const offered = (providers?.payment_providers ?? [])
    .filter((p) => p.is_enabled !== false)
    .map((p) => p.id);

  // Must agree with PROVIDER_PREFERENCE below, which decides what is used.
  if (offered.includes("pp_btcpay_btcpay")) return "bitcoin";
  if (offered.some((id) => id.startsWith("pp_nmi"))) return "card";
  return "none";
}

/** What a session hands back to the storefront. Shapes vary by provider. */
interface PaymentSessionData {
  /** BTCPay: the hosted invoice page the customer pays on. */
  checkoutLink?: string;
}

export interface PaymentSessionResult {
  ok: boolean;
  providerId?: string;
  /**
   * Where to send the customer to pay, when the provider hosts that itself.
   * BTCPay does; a card form does not.
   */
  paymentLink?: string;
  error?: string;
}

/**
 * Prepares a cart for completion by opening a payment session.
 *
 * Medusa will not turn a cart into an order without one. With BTCPay the
 * session is a Bitcoin invoice: nothing is paid yet, and the link it returns
 * is where the customer settles it after the order exists.
 */
export async function initPaymentSession(
  cartId: string,
  regionIdValue: string,
): Promise<PaymentSessionResult> {
  const providers = await request<{
    payment_providers: { id: string; is_enabled?: boolean }[];
  }>(`/store/payment-providers?region_id=${regionIdValue}`, { revalidate: 300 });

  const offered = (providers?.payment_providers ?? []).filter(
    (p) => p.is_enabled !== false,
  );

  const providerId =
    PROVIDER_PREFERENCE.find((id) => offered.some((p) => p.id === id)) ??
    offered[0]?.id;

  if (!providerId) {
    return { ok: false, error: "No payment provider is configured for this region." };
  }

  const collection = await request<{ payment_collection: { id: string } }>(
    "/store/payment-collections",
    { ...live, method: "POST", body: JSON.stringify({ cart_id: cartId }) },
  );
  const collectionId = collection?.payment_collection?.id;
  if (!collectionId) return { ok: false, error: "Could not open a payment collection." };

  const session = await request<{
    payment_collection: {
      payment_sessions?: { provider_id: string; data?: PaymentSessionData }[];
    };
  }>(`/store/payment-collections/${collectionId}/payment-sessions`, {
    ...live,
    method: "POST",
    body: JSON.stringify({ provider_id: providerId }),
  });
  if (session === null) return { ok: false, error: "Could not start a payment session." };

  /*
   * Read the link out of the session that was just created. A collection can
   * hold sessions from earlier attempts, so match on the provider rather than
   * taking the first one.
   */
  const paymentLink = session.payment_collection?.payment_sessions?.find(
    (s) => s.provider_id === providerId,
  )?.data?.checkoutLink;

  return { ok: true, providerId, paymentLink };
}

/**
 * Turns the cart into an order.
 *
 * Medusa answers with `type: "order"` on success, or `type: "cart"` plus an
 * error when it refuses — a 200 alone does not mean the order exists.
 */
export async function completeMedusaCart(
  cartId: string,
): Promise<{ order?: MedusaOrder; error?: string }> {
  const data = await request<{
    type: "order" | "cart";
    order?: MedusaOrder;
    error?: { message?: string };
  }>(`/store/carts/${cartId}/complete`, { ...live, method: "POST" });

  if (!data) return { error: "Could not reach the store to place the order." };
  if (data.type !== "order" || !data.order) {
    return { error: data.error?.message ?? "The order could not be placed." };
  }
  return { order: data.order };
}

/*
 * Payment sessions are not in the store route's default fields, and the
 * confirmation page needs them: with Bitcoin the customer often lands there
 * before paying, and the invoice link is the only way back to the payment.
 */
const ORDER_FIELDS = [
  "+payment_collections.payment_sessions.provider_id",
  "+payment_collections.payment_sessions.status",
  "+payment_collections.payment_sessions.data",
].join(",");

export async function getMedusaOrder(orderId: string): Promise<MedusaOrder | null> {
  const data = await request<{ order: MedusaOrder }>(
    `/store/orders/${orderId}?fields=${encodeURIComponent(ORDER_FIELDS)}`,
    live,
  );
  return data?.order ?? null;
}
