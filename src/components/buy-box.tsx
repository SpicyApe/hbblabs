"use client";

import { useState } from "react";
import { formatPrice, type Product } from "@/data/products";
import { AddToCart } from "@/components/add-to-cart";

/**
 * Quantity-break tiers. Applied at checkout, previewed here.
 * SCAFFOLD: real tiers belong on the product record, not hard-coded.
 */
const TIERS = [
  { min: 1, discount: 0, label: "1 vial", badge: null },
  { min: 2, discount: 0.05, label: "2 vials", badge: "Most popular" },
  { min: 3, discount: 0.075, label: "3+ vials", badge: "Best value" },
  { min: 10, discount: 0.4, label: "10+ vials", badge: "Bulk" },
] as const;

export function BuyBox({ product }: { product: Product }) {
  const [variantId, setVariantId] = useState(product.variants[0].id);
  const [quantity, setQuantity] = useState(1);

  const variant = product.variants.find((v) => v.id === variantId) ?? product.variants[0];

  // Highest tier the current quantity qualifies for.
  const tier = [...TIERS].reverse().find((t) => quantity >= t.min) ?? TIERS[0];
  const unit = Math.round(variant.price * (1 - tier.discount));
  const total = unit * quantity;

  return (
    <div className="space-y-6">
      {/* Size */}
      <div>
        <div className="flex items-baseline justify-between">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-400">
            Size
          </h2>
          <p className="font-display text-2xl font-semibold text-ink-950">
            {formatPrice(variant.price)}
          </p>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {product.variants.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setVariantId(option.id)}
              disabled={!option.inStock}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                option.id === variantId
                  ? "bg-ink-950 text-white"
                  : "border border-ink-200 text-ink-700 hover:border-ink-400"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Quantity */}
      <div>
        <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-400">
          Quantity
        </h2>
        <div className="mt-2 inline-flex items-center rounded-full border border-ink-200">
          <button
            type="button"
            onClick={() => setQuantity((n) => Math.max(1, n - 1))}
            className="grid h-10 w-10 place-items-center rounded-l-full text-ink-600 transition hover:bg-ink-50 disabled:opacity-30"
            disabled={quantity <= 1}
            aria-label="Decrease quantity"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4">
              <path d="M5 12h14" strokeLinecap="round" />
            </svg>
          </button>
          <span className="w-12 text-center font-mono text-sm tabular-nums text-ink-950">
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => setQuantity((n) => Math.min(99, n + 1))}
            className="grid h-10 w-10 place-items-center rounded-r-full text-ink-600 transition hover:bg-ink-50"
            aria-label="Increase quantity"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* Quantity breaks */}
      <div>
        <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-400">
          Bundle &amp; save
        </h2>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {TIERS.map((option) => (
            <button
              key={option.min}
              type="button"
              onClick={() => setQuantity(option.min)}
              className={`relative rounded-lg border px-2 py-3 text-center transition ${
                tier.min === option.min
                  ? "border-copper-500 bg-copper-50"
                  : "border-ink-200 hover:border-ink-400"
              }`}
            >
              {option.badge && (
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-ink-950 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wide text-white">
                  {option.badge}
                </span>
              )}
              <span className="block text-xs font-semibold text-ink-950">{option.label}</span>
              <span className="mt-0.5 block font-mono text-[11px] text-copper-700">
                {/* +toFixed strips the trailing zero so 7.5 stays 7.5 and 5.0 reads 5 */}
                {option.discount === 0 ? "—" : `${+(option.discount * 100).toFixed(1)}% off`}
              </span>
            </button>
          ))}
        </div>
      </div>

      <AddToCart
        variantId={variant.id}
        quantity={quantity}
        disabled={!variant.inStock}
        variant="full"
        label={`Add to cart · ${formatPrice(total)}`}
      />

      {tier.discount > 0 && (
        <p className="text-center font-mono text-xs text-copper-700">
          {+(tier.discount * 100).toFixed(1)}% break applied — {formatPrice(unit)} per vial
        </p>
      )}
    </div>
  );
}
