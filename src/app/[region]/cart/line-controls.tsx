"use client";

import { useTransition } from "react";
import { setQuantity, removeItem } from "@/app/actions/cart";

export function CartLineControls({
  variantId,
  quantity,
}: {
  variantId: string;
  quantity: number;
}) {
  const [pending, startTransition] = useTransition();

  const change = (next: number) =>
    startTransition(async () => {
      await setQuantity(variantId, next);
    });

  return (
    <div className={`flex items-center gap-4 ${pending ? "opacity-50" : ""}`}>
      <div className="inline-flex items-center rounded-full border border-ink-200">
        <button
          type="button"
          onClick={() => change(quantity - 1)}
          disabled={pending || quantity <= 1}
          className="grid h-8 w-8 place-items-center rounded-l-full text-ink-600 transition hover:bg-ink-50 disabled:opacity-30"
          aria-label="Decrease quantity"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.6">
            <path d="M5 12h14" strokeLinecap="round" />
          </svg>
        </button>
        <span className="w-9 text-center font-mono text-xs tabular-nums text-ink-950">
          {quantity}
        </span>
        <button
          type="button"
          onClick={() => change(quantity + 1)}
          disabled={pending}
          className="grid h-8 w-8 place-items-center rounded-r-full text-ink-600 transition hover:bg-ink-50 disabled:opacity-30"
          aria-label="Increase quantity"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.6">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <button
        type="button"
        onClick={() => startTransition(async () => void (await removeItem(variantId)))}
        disabled={pending}
        className="text-xs font-medium text-ink-400 underline underline-offset-2 transition hover:text-copper-700"
      >
        Remove
      </button>
    </div>
  );
}
