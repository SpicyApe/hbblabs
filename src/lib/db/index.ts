/**
 * DATABASE SCAFFOLD
 * =================
 *
 * Every read and write the storefront performs goes through this module.
 * Product catalog reads are proxied live to WooCommerce's Store API (see
 * `src/lib/woocommerce.ts`) rather than a database. Carts and orders are
 * still an in-process Map: nothing persists across a server restart, and
 * nothing here is safe for more than one server instance.
 *
 * To make carts/orders real, keep the exported function signatures and
 * reimplement the bodies against your datastore (Postgres + Drizzle/Prisma,
 * Medusa, whatever). No component imports the catalog directly, so the UI
 * does not change.
 *
 * Suggested schema when you get there:
 *
 *   carts         (id, region, created_at, updated_at)
 *   cart_items    (id, cart_id, variant_id, quantity)
 *   orders        (id, cart_id, email, status, subtotal, shipping, total,
 *                  payment_intent_id, placed_at)
 *   order_items   (id, order_id, variant_id, quantity, unit_price)
 *   coa_documents (id, product_id, batch_code, assay_date, file_url)
 */

import type { Product, ProductCategory, ProductVariant } from "@/data/products";
import { brand } from "@/lib/brand";
import {
  listWcProducts,
  getWcProductBySlug,
  getWcFeaturedProducts,
  getWcRelatedProducts,
  getWcProductAndVariant,
} from "@/lib/woocommerce";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CartLine {
  variantId: string;
  quantity: number;
}

export interface Cart {
  id: string;
  lines: CartLine[];
  updatedAt: number;
}

/** A cart line joined against the catalog, ready to render. */
export interface ResolvedCartLine {
  variantId: string;
  quantity: number;
  product: Product;
  variant: ProductVariant;
  lineTotal: number;
}

export interface CartTotals {
  subtotal: number;
  shipping: number;
  total: number;
  freeShippingRemaining: number;
}

export type OrderStatus = "pending" | "paid" | "failed" | "fulfilled";

export interface Order {
  id: string;
  cartId: string;
  email: string;
  status: OrderStatus;
  lines: ResolvedCartLine[];
  totals: CartTotals;
  paymentReference?: string;
  placedAt: number;
}

// ---------------------------------------------------------------------------
// In-memory stores — replace with real tables
// ---------------------------------------------------------------------------

/*
 * Held on globalThis so Next's dev-mode hot reload does not wipe the cart on
 * every edit. A real datastore makes this hack unnecessary.
 */
const stores = globalThis as unknown as {
  __hercules_carts?: Map<string, Cart>;
  __hercules_orders?: Map<string, Order>;
};

const carts = (stores.__hercules_carts ??= new Map<string, Cart>());
const orders = (stores.__hercules_orders ??= new Map<string, Order>());

const newId = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;

// ---------------------------------------------------------------------------
// Catalog reads
// ---------------------------------------------------------------------------

export async function listProducts(options?: {
  category?: ProductCategory;
  search?: string;
  sort?: "featured" | "price-asc" | "price-desc" | "name";
}): Promise<Product[]> {
  return listWcProducts(options);
}

export async function getProduct(handle: string): Promise<Product | null> {
  return getWcProductBySlug(handle);
}

export async function getFeaturedProducts(limit = 6): Promise<Product[]> {
  return getWcFeaturedProducts(limit);
}

/** Same category, excluding the product itself. */
export async function getRelatedProducts(handle: string, limit = 4): Promise<Product[]> {
  return getWcRelatedProducts(handle, limit);
}

async function findVariant(
  variantId: string,
): Promise<{ product: Product; variant: ProductVariant } | null> {
  return getWcProductAndVariant(variantId);
}

// ---------------------------------------------------------------------------
// Cart
// ---------------------------------------------------------------------------

export async function createCart(): Promise<Cart> {
  const cart: Cart = { id: newId("cart"), lines: [], updatedAt: Date.now() };
  carts.set(cart.id, cart);
  return cart;
}

export async function getCart(cartId: string): Promise<Cart | null> {
  return carts.get(cartId) ?? null;
}

export async function addToCart(
  cartId: string,
  variantId: string,
  quantity = 1,
): Promise<Cart> {
  if (!(await findVariant(variantId))) {
    throw new Error(`Unknown variant: ${variantId}`);
  }

  /*
   * Materialize under the id we were given rather than minting a new one.
   * The caller already committed this id to a cookie, so allocating a
   * different one here drops the item into a cart nothing points at — which is
   * what happens to every add after a server restart or a cache eviction.
   */
  let cart = carts.get(cartId);
  if (!cart) {
    cart = { id: cartId, lines: [], updatedAt: Date.now() };
    carts.set(cartId, cart);
  }

  const existing = cart.lines.find((line) => line.variantId === variantId);
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.lines.push({ variantId, quantity });
  }

  cart.updatedAt = Date.now();
  return cart;
}

export async function updateCartLine(
  cartId: string,
  variantId: string,
  quantity: number,
): Promise<Cart | null> {
  const cart = carts.get(cartId);
  if (!cart) return null;

  if (quantity <= 0) {
    cart.lines = cart.lines.filter((line) => line.variantId !== variantId);
  } else {
    const line = cart.lines.find((candidate) => candidate.variantId === variantId);
    if (line) line.quantity = quantity;
  }

  cart.updatedAt = Date.now();
  return cart;
}

export async function removeFromCart(cartId: string, variantId: string): Promise<Cart | null> {
  return updateCartLine(cartId, variantId, 0);
}

/** Joins cart lines against the catalog. Silently drops lines whose variant vanished. */
export async function resolveCart(cartId: string): Promise<{
  cart: Cart | null;
  lines: ResolvedCartLine[];
  totals: CartTotals;
}> {
  const cart = carts.get(cartId) ?? null;
  const lines: ResolvedCartLine[] = [];

  for (const line of cart?.lines ?? []) {
    const match = await findVariant(line.variantId);
    if (!match) continue;
    lines.push({
      variantId: line.variantId,
      quantity: line.quantity,
      product: match.product,
      variant: match.variant,
      lineTotal: match.variant.price * line.quantity,
    });
  }

  return { cart, lines, totals: computeTotals(lines) };
}

export function computeTotals(lines: ResolvedCartLine[]): CartTotals {
  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);

  // Flat-rate domestic shipping, free above the threshold. Empty carts ship free.
  const qualifies = subtotal >= brand.freeShippingThreshold;
  const shipping = subtotal === 0 || qualifies ? 0 : 900;

  return {
    subtotal,
    shipping,
    total: subtotal + shipping,
    freeShippingRemaining: Math.max(0, brand.freeShippingThreshold - subtotal),
  };
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export async function createOrder(input: {
  cartId: string;
  email: string;
  paymentReference?: string;
  status?: OrderStatus;
}): Promise<Order> {
  const { lines, totals } = await resolveCart(input.cartId);

  const order: Order = {
    id: newId("order"),
    cartId: input.cartId,
    email: input.email,
    status: input.status ?? "pending",
    lines,
    totals,
    paymentReference: input.paymentReference,
    placedAt: Date.now(),
  };

  orders.set(order.id, order);
  return order;
}

export async function getOrder(orderId: string): Promise<Order | null> {
  return orders.get(orderId) ?? null;
}

export async function markOrderPaid(
  orderId: string,
  paymentReference: string,
): Promise<Order | null> {
  const order = orders.get(orderId);
  if (!order) return null;
  order.status = "paid";
  order.paymentReference = paymentReference;
  return order;
}

export async function markOrderFailed(orderId: string): Promise<void> {
  const order = orders.get(orderId);
  if (order) order.status = "failed";
}

/**
 * Only call once payment has actually succeeded. Dropping the cart before the
 * gateway answers loses the customer's basket on every decline.
 */
export async function deleteCart(cartId: string): Promise<void> {
  carts.delete(cartId);
}
