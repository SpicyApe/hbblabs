"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { brand } from "@/lib/brand";
import { COMPLIANCE_COOKIE } from "@/lib/constants";

/**
 * Records the visitor's attestation and sends them on.
 *
 * SCAFFOLD: a real deployment should also persist an audit row — timestamp,
 * hashed IP, user agent, and the exact wording of the statements affirmed —
 * because the point of an attestation is being able to show it was made.
 */
export async function acceptTerms(formData: FormData) {
  const store = await cookies();

  store.set(COMPLIANCE_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  // Re-validate here too: the hidden field is client-supplied and a crafted
  // POST could carry anything.
  const raw = String(formData.get("destination") ?? "");
  const destination =
    raw.startsWith("/") && !raw.startsWith("//") ? raw : `/${brand.defaultRegion}`;

  redirect(destination);
}
