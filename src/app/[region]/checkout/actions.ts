"use server";

import { redirect } from "next/navigation";
import {
  resolveCart,
  createOrder,
  markOrderPaid,
  markOrderFailed,
  deleteCart,
} from "@/lib/db";
import { getCartId, clearCartCookie } from "@/lib/session";
import { getPaymentProvider } from "@/lib/payments";
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
 * Places an order.
 *
 * SCAFFOLD: shipping address, tax, and address validation are all missing. The
 * one thing done properly here is the amount — it comes from the server-side
 * cart, never from the submitted form, because a total in a request body is
 * attacker-controlled.
 */
export async function placeOrder(
  _previous: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const cartId = await getCartId();
  if (!cartId) return { error: "Your cart expired. Please add items again.", values: echo(formData) };

  const { lines, totals } = await resolveCart(cartId);
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

  const order = await createOrder({ cartId, email });

  const payment = await getPaymentProvider().authorize({
    orderId: order.id,
    amount: { value: totals.total, currency: "USD" },
    paymentToken: String(formData.get("paymentToken") ?? "tok_test"),
    email,
  });

  if (!payment.ok) {
    // Leave the cart intact so a declined card doesn't cost them the basket.
    await markOrderFailed(order.id);
    return {
      error: payment.errorMessage ?? "Payment could not be processed.",
      values: echo(formData),
    };
  }

  await markOrderPaid(order.id, payment.reference ?? "");
  await deleteCart(cartId);
  await clearCartCookie();
  redirect(`/${brand.defaultRegion}/order/${order.id}`);
}
