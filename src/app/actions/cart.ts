"use server";

import { revalidatePath } from "next/cache";
import { addToCart, updateCartLine } from "@/lib/db";
import { getOrCreateCartId, getCartId, resetCartId } from "@/lib/session";
import { brand } from "@/lib/brand";

export async function addItem(variantId: string, quantity = 1) {
  const cartId = await getOrCreateCartId();

  let added = cartId ? await addToCart(cartId, variantId, quantity) : false;

  /*
   * A rejected cart is recoverable and expected: the cookie outlives the
   * cart it names. Medusa forgets a cart once it is completed into an order,
   * and a cookie written against a previous backend names one it never had.
   * Both look the same from here — the add fails — so open a fresh cart and
   * try once more rather than dropping the customer's click.
   *
   * Only one retry: a second failure is the backend being down, and retrying
   * harder will not fix that.
   */
  if (!added) {
    const fresh = await resetCartId();
    added = fresh ? await addToCart(fresh, variantId, quantity) : false;
  }

  // The header badge and cart page both read cart state, so refresh the tree.
  revalidatePath("/", "layout");
  return { ok: added };
}

export async function setQuantity(variantId: string, quantity: number) {
  const cartId = await getCartId();
  if (!cartId) return { ok: false as const };

  await updateCartLine(cartId, variantId, quantity);
  revalidatePath(`/${brand.defaultRegion}/cart`);
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function removeItem(variantId: string) {
  return setQuantity(variantId, 0);
}
