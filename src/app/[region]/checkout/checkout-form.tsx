"use client";

import { useActionState } from "react";
import { placeOrder, type CheckoutState } from "./actions";
import type { PaymentMethod } from "@/lib/db";

const FIELD =
  "w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-300 focus:border-copper-400 focus:outline-none";

const LABEL = "block text-xs font-semibold text-ink-700";

export function CheckoutForm({
  region,
  paymentMethod,
}: {
  region: string;
  paymentMethod: PaymentMethod;
}) {
  const [state, formAction, pending] = useActionState<CheckoutState, FormData>(
    placeOrder,
    {},
  );

  // Restored after a failed submit; React 19 clears the form on action resolve.
  const prior = state.values ?? {};

  return (
    <form action={formAction} className="space-y-8">
      <section>
        <h2 className="text-sm font-bold text-ink-950">Contact</h2>
        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor="email" className={LABEL}>
              Email
            </label>
            <input
              id="email"
              name="email"
              defaultValue={prior.email ?? ""}
              type="email"
              required
              autoComplete="email"
              placeholder="lab@institution.edu"
              className={`${FIELD} mt-1.5`}
            />
            <p className="mt-1.5 text-xs text-ink-400">
              Order confirmation and the batch COA are sent here.
            </p>
          </div>
          <div>
            <label htmlFor="institution" className={LABEL}>
              Institution or lab <span className="font-normal text-ink-400">(optional)</span>
            </label>
            <input
              id="institution"
              name="institution"
              defaultValue={prior.institution ?? ""}
              type="text"
              className={`${FIELD} mt-1.5`}
            />
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-bold text-ink-950">Shipping address</h2>
        {/* SCAFFOLD: not persisted, not validated, not rated for shipping. */}
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="name" className={LABEL}>Full name</label>
            <input id="name" name="name" defaultValue={prior.name ?? ""} required autoComplete="name" className={`${FIELD} mt-1.5`} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="address" className={LABEL}>Street address</label>
            <input id="address" name="address" defaultValue={prior.address ?? ""} required autoComplete="street-address" className={`${FIELD} mt-1.5`} />
          </div>
          <div>
            <label htmlFor="city" className={LABEL}>City</label>
            <input id="city" name="city" defaultValue={prior.city ?? ""} required autoComplete="address-level2" className={`${FIELD} mt-1.5`} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="state" className={LABEL}>State</label>
              <input id="state" name="state" defaultValue={prior.state ?? ""} required autoComplete="address-level1" className={`${FIELD} mt-1.5`} />
            </div>
            <div>
              <label htmlFor="postal" className={LABEL}>ZIP</label>
              <input id="postal" name="postal" defaultValue={prior.postal ?? ""} required autoComplete="postal-code" inputMode="numeric" className={`${FIELD} mt-1.5`} />
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-bold text-ink-950">Payment</h2>
        <div className="mt-4 rounded-xl border border-dashed border-ink-300 bg-ink-50/60 p-5">
          {paymentMethod === "bitcoin" ? (
            <>
              <p className="text-sm font-medium text-ink-800">Bitcoin</p>
              <p className="mt-1.5 text-xs leading-relaxed text-ink-500">
                No card details are collected. Placing the order issues an
                invoice and sends you to a payment page with an address and a QR
                code. Nothing leaves your wallet until you send it, and the
                order confirms on the first network confirmation.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-ink-800">
                Card fields not mounted
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-ink-500">
                NMI is wired into the store but has no credentials yet. Once it
                does, its hosted fields mount here — an iframe the gateway owns,
                so card numbers never reach this server. Until then the order is
                recorded and nothing is charged.
              </p>
            </>
          )}
        </div>
      </section>

      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-ink-200 bg-white px-4 py-3">
        <input
          type="checkbox"
          name="attestation"
          required
          defaultChecked={prior.attestation === "on"}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-ink-300 accent-copper-600"
        />
        <span className="text-xs leading-relaxed text-ink-700">
          I confirm I am a qualified researcher and that these materials are
          being purchased for in vitro laboratory research only — not for human
          or veterinary use.
        </span>
      </label>

      {state.error && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center rounded-full bg-ink-950 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-ink-800 disabled:cursor-not-allowed disabled:bg-ink-300"
      >
        {pending ? "Placing order…" : "Place order"}
      </button>

      <p className="text-center font-mono text-[10px] uppercase tracking-wider text-ink-300">
        Region {region.toUpperCase()} ·{" "}
        {paymentMethod === "bitcoin"
          ? "Invoice issued on the next step"
          : "No charge will be made"}
      </p>
    </form>
  );
}
