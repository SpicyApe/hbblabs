/**
 * The backend seam.
 *
 * Every read and write the storefront performs goes through this module, and
 * all of it now reaches Medusa (see `src/lib/medusa.ts`): catalog, carts and
 * orders. Nothing is held in process, so state survives a restart and is
 * shared across instances.
 *
 * What remains unfinished is payment, not persistence. Orders are real and
 * appear in the Medusa admin, but they are settled by whichever provider the
 * backend registers — NMI once its keys are set, otherwise Medusa's system
 * provider, which records a payment without moving money.
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
  setCartEmail,
  selectShippingMethod,
  initPaymentSession,
  completeMedusaCart,
  getMedusaOrder,
  regionId,
  type MedusaOrder,
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

/**
 * Opens a cart in Medusa.
 *
 * The cart id is a Medusa cart id, so carts survive a restart and are shared
 * across instances — what neither the in-memory scaffold nor WooCommerce's
 * headless cart managed.
 *
 * Returns null when Medusa does not answer. It deliberately does not invent
 * a local id as a fallback: that id is written to a cookie, Medusa has never
 * heard of it, and every later request 404s — permanently, for that visitor,
 * with no way to recover.
 */
export async function createCart(): Promise<Cart | null> {
  const id = await createMedusaCart();
  return id ? { id, lines: [], updatedAt: Date.now() } : null;
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

/**
 * Medusa's payment status vocabulary, mapped onto this app's.
 *
 * "authorized" is deliberately not "paid": it means funds are held, not
 * taken. Calling it paid would be wrong even with a real gateway, and
 * doubly so now, when the system provider authorises without moving money.
 */
function toOrderStatus(order: MedusaOrder): OrderStatus {
  switch (order.payment_status) {
    case "captured":
      return "paid";
    case "canceled":
    case "requires_more":
      return "failed";
    default:
      return "pending";
  }
}

function mapOrder(order: MedusaOrder): Order {
  const lines: ResolvedCartLine[] = order.items.map((item) => {
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
    id: order.id,
    cartId: "",
    email: order.email ?? "",
    status: toOrderStatus(order),
    lines,
    /*
     * Totals come from Medusa, the authority once an order exists — unlike
     * the cart, where shipping is this storefront's own rule.
     *
     * `item_total` is the goods. Medusa's `subtotal` already includes
     * shipping, so using it here would render subtotal + shipping against a
     * total that does not match.
     */
    totals: {
      subtotal: Math.round((order.item_total ?? order.subtotal) * 100),
      shipping: Math.round((order.shipping_total ?? 0) * 100),
      total: Math.round(order.total * 100),
      freeShippingRemaining: 0,
    },
    placedAt: Date.now(),
  };
}

/**
 * Turns the cart into a real Medusa order.
 *
 * Replaces the in-process Map this used to write to. Orders now persist,
 * survive a restart, and are visible in the Medusa admin.
 *
 * Payment is settled by whichever provider the backend has registered: NMI
 * once its keys are set, otherwise Medusa's system provider, which records
 * a payment without moving money.
 */
export async function placeMedusaOrder(
  cartId: string,
  email: string,
): Promise<{ order?: Order; error?: string }> {
  if (!(await setCartEmail(cartId, email))) {
    return { error: "Could not save your email against the order." };
  }

  const shipping = await selectShippingMethod(cartId);
  if (!shipping.ok) return { error: shipping.error };

  const region = await regionId();
  if (!region) return { error: "Store region unavailable. Please try again." };

  const session = await initPaymentSession(cartId, region);
  if (!session.ok) return { error: session.error };

  const { order, error } = await completeMedusaCart(cartId);
  if (!order) return { error };

  return { order: mapOrder(order) };
}

export async function getOrder(orderId: string): Promise<Order | null> {
  const order = await getMedusaOrder(orderId);
  return order ? mapOrder(order) : null;
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
