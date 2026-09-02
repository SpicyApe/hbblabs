"use server";

import { revalidatePath } from "next/cache";
import { addToCart, updateCartLine } from "@/lib/db";
import { getOrCreateCartId, getCartId } from "@/lib/session";
import { brand } from "@/lib/brand";

export async function addItem(variantId: string, quantity = 1) {
  const cartId = await getOrCreateCartId();
  await addToCart(cartId, variantId, quantity);

  // The header badge and cart page both read cart state, so refresh the tree.
  revalidatePath("/", "layout");
  return { ok: true as const };
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
