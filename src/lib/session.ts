import { cookies } from "next/headers";
import { createCart } from "@/lib/db";
import { CART_COOKIE } from "@/lib/constants";

/**
 * Reads the cart id from the cookie without creating one. Use in server
 * components — they are not allowed to set cookies, so a read-only path is the
 * only safe option there.
 */
export async function getCartId(): Promise<string | null> {
  const store = await cookies();
  return store.get(CART_COOKIE)?.value ?? null;
}

/**
 * Reads the cart id, creating a cart if there isn't one. Only call from a
 * server action or route handler — anywhere else the cookie write throws.
 */
export async function getOrCreateCartId(): Promise<string | null> {
  const store = await cookies();
  const existing = store.get(CART_COOKIE)?.value;
  if (existing) return existing;

  return resetCartId();
}

/**
 * Opens a new cart and overwrites the cookie.
 *
 * Needed whenever Medusa rejects the cart we hold — a cart from a previous
 * backend, or one that has since been completed into an order. Returns null
 * if Medusa cannot be reached, and writes no cookie in that case: storing an
 * id the backend does not know is what breaks a visitor permanently.
 */
export async function resetCartId(): Promise<string | null> {
  const store = await cookies();
  const cart = await createCart();
  if (!cart) return null;

  store.set(CART_COOKIE, cart.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return cart.id;
}

export async function clearCartCookie(): Promise<void> {
  const store = await cookies();
  store.delete(CART_COOKIE);
}
