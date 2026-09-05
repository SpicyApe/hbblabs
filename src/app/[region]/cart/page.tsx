import type { Metadata } from "next";
import Link from "next/link";
import { resolveCart } from "@/lib/db";
import { getCartId } from "@/lib/session";
import { formatPrice } from "@/data/products";
import { Vial, tintFor } from "@/components/vial";
import { CartLineControls } from "./line-controls";

export const metadata: Metadata = {
  title: "Cart",
  robots: { index: false, follow: false },
};

export default async function CartPage({
  params,
}: {
  params: Promise<{ region: string }>;
}) {
  const { region } = await params;
  const cartId = await getCartId();
  const { lines, totals } = cartId
    ? await resolveCart(cartId)
    : { lines: [], totals: { subtotal: 0, shipping: 0, total: 0 } };

  if (lines.length === 0) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-ink-950">Your cart is empty</h1>
        <p className="mt-3 text-sm text-ink-500">
          Nothing here yet. The catalog is a good place to start.
        </p>
        <Link
          href={`/${region}/store`}
          className="mt-8 inline-flex rounded-full bg-ink-950 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-ink-800"
        >
          Browse the catalog
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight text-ink-950">Cart</h1>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_360px]">
        <ul className="divide-y divide-ink-100 border-y border-ink-100">
          {lines.map((line) => (
            <li key={line.variantId} className="flex gap-4 py-5">
              <Link
                href={`/${region}/products/${line.product.handle}`}
                className="shrink-0 rounded-xl p-2"
                style={{ backgroundColor: tintFor(line.product.handle).bg }}
              >
                <Vial
                  handle={line.product.handle}
                  name={line.product.name}
                  shape={line.product.category === "spray" ? "spray" : "vial"}
                  className="h-24 w-auto"
                />
              </Link>

              <div className="flex flex-1 flex-col">
                <div className="flex justify-between gap-4">
                  <div>
                    <h2 className="text-sm font-semibold text-ink-950">
                      <Link href={`/${region}/products/${line.product.handle}`}>
                        {line.product.name}
                      </Link>
                    </h2>
                    <p className="mt-0.5 font-mono text-xs text-ink-400">
                      {line.variant.label}
                    </p>
                  </div>
                  <p className="font-display text-base font-semibold text-ink-950">
                    {formatPrice(line.lineTotal)}
                  </p>
                </div>

                <div className="mt-auto pt-4">
                  <CartLineControls variantId={line.variantId} quantity={line.quantity} />
                </div>
              </div>
            </li>
          ))}
        </ul>

        <aside className="h-fit rounded-2xl border border-ink-100 bg-white p-6">
          <h2 className="text-sm font-bold text-ink-950">Order summary</h2>

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
            href={`/${region}/checkout`}
            className="mt-6 flex w-full items-center justify-center rounded-full bg-ink-950 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-ink-800"
          >
            Checkout
          </Link>

          <p className="mt-4 text-center font-mono text-[10px] uppercase tracking-wider text-ink-400">
            Research use only · Secure checkout
          </p>
        </aside>
      </div>
    </main>
  );
}
