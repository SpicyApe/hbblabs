/**
 * DATABASE SCAFFOLD
 * =================
 *
 * Every read and write the storefront performs goes through this module.
 * The catalog and carts both come from Medusa (see `src/lib/medusa.ts`), so
 * carts are real: they survive a restart and are shared across instances.
 *
 * ORDERS are the remaining scaffold — an in-process Map. They do not
 * persist, and they are not the orders Medusa knows about. Medusa's
 * /store/carts/:id/complete turns a cart into a genuine order; wiring
 * checkout to it, alongside a payment provider that moves money, is what
 * makes this real.
 */

import type { Product, ProductCategory, ProductVariant } from "@/data/products";
import { brand } from "@/lib/brand";
import {
  listMedusaProducts,
  getMedusaProduct,
  getMedusaFeatured,
  getMedusaRelated,
  createMedusaCart,
  getMedusaCart,
  medusaAddItem,
  medusaSetQuantity,
} from "@/lib/medusa";

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
  __hercules_orders?: Map<string, Order>;
};

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
  return listMedusaProducts(options);
}

export async function getProduct(handle: string): Promise<Product | null> {
  return getMedusaProduct(handle);
}

export async function getFeaturedProducts(limit = 6): Promise<Product[]> {
  return getMedusaFeatured(limit);
}

/** Same category, excluding the product itself. */
export async function getRelatedProducts(handle: string, limit = 4): Promise<Product[]> {
  return getMedusaRelated(handle, limit);
}

// ---------------------------------------------------------------------------
// Cart
// ---------------------------------------------------------------------------

/*
 * The cart id is a Medusa cart id. Carts live in Medusa, so they survive a
 * restart and are shared across instances — the thing neither the in-memory
 * scaffold nor WooCommerce's headless cart could manage.
 */
export async function createCart(): Promise<Cart> {
  const id = await createMedusaCart();
  return { id: id ?? newId("cart"), lines: [], updatedAt: Date.now() };
}

export async function getCart(cartId: string): Promise<Cart | null> {
  const cart = await getMedusaCart(cartId);
  if (!cart) return null;

  return {
    id: cart.id,
    lines: cart.items.map((item) => ({
      variantId: item.variant_id,
      quantity: item.quantity,
    })),
    updatedAt: Date.now(),
  };
}

/*
 * No existence check first: Medusa validates the variant and is the
 * authority on whether it is purchasable. Checking here would cost a
 * request and still race against the store.
 */
export async function addToCart(
  cartId: string,
  variantId: string,
  quantity = 1,
): Promise<boolean> {
  return medusaAddItem(cartId, variantId, quantity);
}

export async function updateCartLine(
  cartId: string,
  variantId: string,
  quantity: number,
): Promise<Cart | null> {
  await medusaSetQuantity(cartId, variantId, quantity);
  return getCart(cartId);
}

export async function removeFromCart(cartId: string, variantId: string): Promise<Cart | null> {
  return updateCartLine(cartId, variantId, 0);
}

/**
 * Builds renderable lines from the Medusa cart.
 *
 * Everything the UI needs is already on the cart line, so no per-line
 * catalog lookup happens here — which matters because the header badge
 * resolves the cart on every page render.
 *
 * Totals stay app-side: shipping is this storefront's own rule (flat rate,
 * free above a threshold in `brand`), not something Medusa is configured for.
 */
export async function resolveCart(cartId: string): Promise<{
  cart: Cart | null;
  lines: ResolvedCartLine[];
  totals: CartTotals;
}> {
  const cart = await getMedusaCart(cartId);
  if (!cart) return { cart: null, lines: [], totals: computeTotals([]) };

  const lines: ResolvedCartLine[] = cart.items.map((item) => {
    const unitPrice = Math.round(item.unit_price * 100);

    return {
      variantId: item.variant_id,
      quantity: item.quantity,
      product: {
        handle: item.product_handle ?? "",
        name: item.product_title,
        aliases: [],
        category: "",
        blurb: "",
        description: "",
        form: "",
        storage: "",
        variants: [],
      },
      variant: {
        id: item.variant_id,
        label: item.variant_title ?? "Standard",
        price: unitPrice,
        inStock: true,
      },
      lineTotal: unitPrice * item.quantity,
    };
  });

  return {
    cart: {
      id: cart.id,
      lines: lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
      updatedAt: Date.now(),
    },
    lines,
    totals: computeTotals(lines),
  };
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
export async function deleteCart(_cartId: string): Promise<void> {
  /*
   * Medusa retires a cart when it is completed into an order, so there is
   * nothing to delete here. Kept so callers need not care which backend
   * owns the cart.
   */
}
