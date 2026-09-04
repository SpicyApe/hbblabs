"use server";

import { redirect } from "next/navigation";
import { resolveCart, placeMedusaOrder } from "@/lib/db";
import { getCartId, clearCartCookie } from "@/lib/session";
import { brand } from "@/lib/brand";

export interface CheckoutState {
  error?: string;
  /**
   * Everything the visitor typed, echoed back.
   *
   * React 19 resets an uncontrolled form once its action resolves, so without
   * this a declined card would clear the whole checkout and make them retype
   * their address. The fields read these as defaultValue.
   *
   * Deliberately excludes the payment token — re-populating a credential-ish
   * field from server state is a habit worth not forming.
   */
  values?: Record<string, string>;
}

/** Field names safe to echo back into the form after a failure. */
const ECHOED_FIELDS = [
  "email",
  "institution",
  "name",
  "address",
  "city",
  "state",
  "postal",
] as const;

function echo(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const field of ECHOED_FIELDS) {
    const value = formData.get(field);
    if (typeof value === "string") values[field] = value;
  }
  // Checkbox: present only when ticked.
  if (formData.get("attestation") === "on") values.attestation = "on";
  return values;
}

/**
 * Places an order through Medusa.
 *
 * The order is real: it persists, survives a restart and appears in the
 * Medusa admin. What settles it depends on the backend's registered payment
 * provider — NMI once its keys are set, otherwise Medusa's system provider,
 * which records a payment without moving money. So this creates genuine
 * orders that nobody has actually paid for yet.
 *
 * The amount is never read from the form. Medusa prices the cart server-side
 * and totals the order itself; a total in a request body is attacker
 * controlled.
 *
 * SCAFFOLD: shipping address, tax and address validation are still missing.
 */
export async function placeOrder(
  _previous: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const cartId = await getCartId();
  if (!cartId) {
    return { error: "Your cart expired. Please add items again.", values: echo(formData) };
  }

  const { lines } = await resolveCart(cartId);
  if (lines.length === 0) return { error: "Your cart is empty.", values: echo(formData) };

  const email = String(formData.get("email") ?? "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Enter a valid email address.", values: echo(formData) };
  }

  if (formData.get("attestation") !== "on") {
    return {
      error: "You must confirm the research-use declaration to order.",
      values: echo(formData),
    };
  }

  const { order, error } = await placeMedusaOrder(cartId, email);

  if (!order) {
    /*
     * The cart is left alone on failure. Medusa only retires it once the
     * order exists, so a refusal here costs the customer nothing.
     */
    return { error: error ?? "The order could not be placed.", values: echo(formData) };
  }

  // Medusa has consumed the cart; the cookie now names something that is gone.
  await clearCartCookie();
  redirect(`/${brand.defaultRegion}/order/${order.id}`);
}
