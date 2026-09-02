/**
 * Cookie names, kept in their own module.
 *
 * The proxy runs in the edge runtime and must not pull in `next/headers`, so
 * these can't live alongside the `cookies()` helpers in session.ts — and they
 * can't live in proxy.ts either, since importing a value from that file drags
 * the proxy into every bundle that needs a cookie name.
 */

/** Set once the visitor affirms the age and researcher statements at /gate. */
export const COMPLIANCE_COOKIE = "hercules_verified";

/** Holds the cart id. httpOnly — the client never reads it directly. */
export const CART_COOKIE = "hercules_cart";
