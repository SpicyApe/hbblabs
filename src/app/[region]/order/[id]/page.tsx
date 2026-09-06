import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrder } from "@/lib/db";
import { formatPrice } from "@/data/products";

/*
 * Deliberately neutral: this page serves an order that is paid and one that is
 * still waiting on a Bitcoin confirmation, and "Order confirmed" would be a
 * lie in the second case.
 */
export const metadata: Metadata = {
  title: "Your order",
  robots: { index: false, follow: false },
};

export default async function OrderPage({
  params,
}: {
  params: Promise<{ region: string; id: string }>;
}) {
  const { region, id } = await params;
  const order = await getOrder(id);

  /*
   * SCAFFOLD: any visitor who guesses an id can read this page. Once accounts
   * exist, scope the lookup to the signed-in user, or issue a signed one-time
   * link for guest orders.
   */
  if (!order) notFound();

  /*
   * Bitcoin settles after the order exists, so "placed" and "paid" are two
   * different moments and the page has to be honest about which one this is.
   * An unpaid order is not a problem — it is the normal state for the minute
   * or two between placing it and the payment confirming.
   */
  const awaitingPayment = order.status === "pending";
  const canStillPay = awaitingPayment && Boolean(order.paymentLink);

  return (
    <main className="mx-auto max-w-2xl px-4 py-20 sm:px-6">
      <div
        className={
          awaitingPayment
            ? "grid h-12 w-12 place-items-center rounded-full bg-ink-100 text-ink-600"
            : "grid h-12 w-12 place-items-center rounded-full bg-copper-100 text-copper-700"
        }
      >
        {awaitingPayment ? (
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.2">
            <circle cx="12" cy="12" r="8.5" />
            <path d="M12 7.5V12l3 2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.4">
            <path d="M4 12.5 9.5 18 20 6.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>

      <h1 className="mt-6 text-3xl font-bold tracking-tight text-ink-950">
        {awaitingPayment ? "Order placed" : "Order confirmed"}
      </h1>
      <p className="mt-3 text-sm text-ink-500">
        {awaitingPayment ? (
          <>
            It is held under{" "}
            <span className="font-medium text-ink-800">{order.email}</span> and
            ships once payment confirms.
          </>
        ) : (
          <>
            A confirmation and the batch certificate of analysis are on their way
            to <span className="font-medium text-ink-800">{order.email}</span>.
          </>
        )}
      </p>

      {canStillPay && (
        <section className="mt-8 rounded-xl border border-ink-200 bg-white p-5">
          <p className="text-sm font-semibold text-ink-950">Pay with Bitcoin</p>
          <p className="mt-1.5 text-xs leading-relaxed text-ink-500">
            Nothing has been taken yet. The payment page shows an address and a
            QR code, and holds the amount at today&rsquo;s rate while the invoice
            is open. Your order confirms on the first network confirmation,
            usually within about ten minutes of you sending it.
          </p>
          <a
            href={order.paymentLink}
            className="mt-4 inline-flex rounded-full bg-ink-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-ink-800"
          >
            Complete payment
          </a>
          <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-ink-300">
            Keep this page — it is the way back to your invoice
          </p>
        </section>
      )}

      <dl className="mt-8 grid grid-cols-2 gap-4 rounded-xl border border-ink-100 bg-white p-5 text-sm">
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-wider text-ink-400">Order</dt>
          <dd className="mt-1 font-mono text-xs text-ink-900">{order.id}</dd>
        </div>
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-wider text-ink-400">Status</dt>
          <dd className="mt-1 font-medium capitalize text-ink-900">{order.status}</dd>
        </div>
      </dl>

      <ul className="mt-6 divide-y divide-ink-100 border-y border-ink-100">
        {order.lines.map((line) => (
          <li key={line.variantId} className="flex justify-between gap-4 py-3.5 text-sm">
            <span className="text-ink-700">
              {line.product.name}
              <span className="font-mono text-xs text-ink-400">
                {" "}
                {line.variant.label} × {line.quantity}
              </span>
            </span>
            <span className="font-medium text-ink-950">{formatPrice(line.lineTotal)}</span>
          </li>
        ))}
      </ul>

      <div className="mt-5 flex justify-between border-t border-ink-200 pt-4">
        <span className="font-semibold text-ink-950">Total</span>
        <span className="font-display text-xl font-semibold text-ink-950">
          {formatPrice(order.totals.total)}
        </span>
      </div>

      {/*
        Covers two cases that look the same to the customer: a Bitcoin invoice
        that expired before they paid, and a backend running on the system
        provider, which records a payment without taking one. Either way the
        order is unpaid and there is nowhere to pay it.
      */}
      {awaitingPayment && !canStillPay && (
        <p className="mt-8 rounded-lg bg-copper-50 px-4 py-3 text-xs text-copper-900">
          This order is recorded but unpaid, and no payment page is attached to
          it. Reply to your confirmation email and we will send a fresh invoice.
        </p>
      )}

      <Link
        href={`/${region}/store`}
        className="mt-8 inline-flex rounded-full bg-ink-950 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-ink-800"
      >
        Continue browsing
      </Link>
    </main>
  );
}
