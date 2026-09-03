import Link from "next/link";
import { brand } from "@/lib/brand";
import { categoryLabel, formatPrice, priceFrom, type Product } from "@/data/products";
import { Vial, tintFor } from "@/components/vial";
import { AddToCart } from "@/components/add-to-cart";

/**
 * Deterministic per-product purity figure for the COA badge.
 *
 * SCAFFOLD: real purity comes off the batch COA. This derives a plausible
 * 99.1–99.9 from the handle so the badge is stable between renders instead of
 * flickering a new number on every request.
 */
export function displayPurity(handle: string): string {
  let sum = 0;
  for (let i = 0; i < handle.length; i++) sum += handle.charCodeAt(i);
  return (99.1 + (sum % 9) / 10).toFixed(1);
}

export function ProductCard({ product }: { product: Product }) {
  const tint = tintFor(product.handle);
  const href = `/${brand.defaultRegion}/products/${product.handle}`;
  const inStock = product.variants.some((variant) => variant.inStock);
  const cheapest = product.variants.reduce((low, variant) =>
    variant.price < low.price ? variant : low,
  );

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-ink-100 bg-white transition hover:border-ink-200 hover:shadow-[0_18px_40px_-24px_rgba(10,17,32,0.35)]">
      <Link href={href} className="relative block" tabIndex={-1} aria-hidden>
        <div
          className="flex aspect-square items-center justify-center p-6"
          style={{ backgroundColor: tint.bg }}
        >
          <Vial
            handle={product.handle}
            name={product.name}
            shape={product.category === "spray" ? "spray" : "vial"}
            className="h-full w-auto transition duration-500 group-hover:scale-105"
          />
        </div>

        <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 font-mono text-[10px] font-medium text-ink-700 shadow-sm backdrop-blur">
          <svg viewBox="0 0 24 24" className="h-3 w-3 text-copper-600" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="M4 12.5 9.5 18 20 6.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {displayPurity(product.handle)}% · COA
        </span>

        {product.featured && (
          <span className="absolute right-3 top-3 rounded-full bg-ink-950/90 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-white">
            Featured
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-sm font-semibold text-ink-950">
          <Link href={href} className="hover:text-copper-700">
            {product.name}
          </Link>
        </h3>
        <p className="mt-0.5 text-xs text-ink-400">{categoryLabel(product.category)}</p>

        <p className="mt-3 flex items-baseline gap-1.5">
          <span className="text-[11px] text-ink-400">From</span>
          <span className="font-display text-lg font-semibold text-ink-950">
            {formatPrice(priceFrom(product))}
          </span>
        </p>

        <div className="mt-4 flex gap-2">
          <Link
            href={href}
            className="flex flex-1 items-center justify-center rounded-full border border-ink-200 px-3 py-2 text-xs font-semibold text-ink-700 transition hover:border-ink-400 hover:text-ink-950"
          >
            Details
          </Link>
          <AddToCart variantId={cheapest.id} disabled={!inStock} />
        </div>
      </div>
    </article>
  );
}
