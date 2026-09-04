import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { resolveCart } from "@/lib/db";
import { getCartId } from "@/lib/session";
import { formatPrice } from "@/data/products";
import { brand } from "@/lib/brand";
import { CheckoutForm } from "./checkout-form";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ region: string }>;
}) {
  const { region } = await params;
  const cartId = await getCartId();
  if (!cartId) redirect(`/${region}/cart`);

  const { lines, totals } = await resolveCart(cartId);
  if (lines.length === 0) redirect(`/${region}/cart`);

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight text-ink-950">Checkout</h1>

      {/* Delete this banner the day NMI's keys are set and money moves. */}
      <div className="mt-6 rounded-xl border-l-4 border-copper-500 bg-copper-50 p-4">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-copper-800">
          Scaffold — no payment is processed
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-copper-900">
          Submitting places a real order in Medusa — it persists and appears in
          the store admin. No money moves: the gateway has no credentials yet,
          so payment is recorded rather than taken. Do not enter real card
          details.
        </p>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_340px]">
        <CheckoutForm region={region} />

        <aside className="h-fit rounded-2xl border border-ink-100 bg-white p-6">
          <h2 className="text-sm font-bold text-ink-950">Order summary</h2>

          <ul className="mt-5 space-y-3 border-b border-ink-100 pb-5">
            {lines.map((line) => (
              <li key={line.variantId} className="flex justify-between gap-3 text-sm">
                <span className="text-ink-600">
                  {line.product.name}
                  <span className="font-mono text-xs text-ink-400">
                    {" "}
                    {line.variant.label} × {line.quantity}
                  </span>
                </span>
                <span className="shrink-0 font-medium text-ink-900">
                  {formatPrice(line.lineTotal)}
                </span>
              </li>
            ))}
          </ul>

          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-500">Subtotal</dt>
              <dd className="font-medium text-ink-900">{formatPrice(totals.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-500">Shipping</dt>
              <dd className="font-medium text-ink-900">
                {totals.shipping === 0 ? "Free" : formatPrice(totals.shipping)}
              </dd>
            </div>
            <div className="flex justify-between border-t border-ink-100 pt-3">
              <dt className="font-semibold text-ink-950">Total</dt>
              <dd className="font-display text-xl font-semibold text-ink-950">
                {formatPrice(totals.total)}
              </dd>
            </div>
          </dl>

          <Link
            href={`/${region}/cart`}
            className="mt-6 block text-center text-xs font-medium text-ink-400 underline underline-offset-2 hover:text-ink-700"
          >
            Back to cart
          </Link>

          <p className="mt-6 border-t border-ink-100 pt-4 text-[11px] leading-relaxed text-ink-400">
            By ordering you reaffirm that you are a qualified researcher and that
            these materials are for in vitro laboratory use only. See the{" "}
            <Link href={`/${region}/terms`} className="underline">
              terms
            </Link>{" "}
            and{" "}
            <Link href={`/${region}/disclaimer`} className="underline">
              disclaimer
            </Link>
            .
          </p>
          <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-ink-300">
            {brand.legalName}
          </p>
        </aside>
      </div>
    </main>
  );
}
