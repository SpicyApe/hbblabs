"use client";

import { useState, useTransition } from "react";
import { addItem } from "@/app/actions/cart";

interface AddToCartProps {
  variantId: string;
  quantity?: number;
  disabled?: boolean;
  /** "compact" for grid cards, "full" for the product detail page. */
  variant?: "compact" | "full";
  label?: string;
}

export function AddToCart({
  variantId,
  quantity = 1,
  disabled = false,
  variant = "compact",
  label,
}: AddToCartProps) {
  const [pending, startTransition] = useTransition();
  const [added, setAdded] = useState(false);

  const handleClick = () => {
    startTransition(async () => {
      await addItem(variantId, quantity);
      setAdded(true);
      // Revert the confirmation so the button stays usable for a second add.
      setTimeout(() => setAdded(false), 1800);
    });
  };

  if (variant === "full") {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || pending}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-ink-950 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-ink-800 disabled:cursor-not-allowed disabled:bg-ink-200 disabled:text-ink-400"
      >
        {disabled ? "Out of stock" : added ? "Added to cart ✓" : pending ? "Adding…" : label ?? "Add to cart"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || pending}
      className="flex flex-1 items-center justify-center gap-1 rounded-full bg-ink-950 px-3 py-2 text-xs font-semibold text-white transition hover:bg-ink-800 disabled:cursor-not-allowed disabled:bg-ink-200 disabled:text-ink-400"
    >
      {disabled ? (
        "Out of stock"
      ) : added ? (
        "Added ✓"
      ) : (
        <>
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.4">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
          Add
        </>
      )}
    </button>
  );
}
