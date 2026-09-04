import type { Metadata } from "next";
import Link from "next/link";
import { listProducts } from "@/lib/db";
import { listMedusaCategories } from "@/lib/medusa";
import { brand } from "@/lib/brand";
import { ProductCard } from "@/components/product-card";

export const metadata: Metadata = {
  title: "All products",
  description: `Research-grade peptides, ${brand.assayCount}× third-party tested with a certificate of analysis on every batch.`,
};

const SORTS = [
  { value: "featured", label: "Featured" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "name", label: "Name A–Z" },
] as const;

type SearchParams = Promise<{ category?: string; q?: string; sort?: string }>;

export default async function StorePage({
  params,
  searchParams,
}: {
  params: Promise<{ region: string }>;
  searchParams: SearchParams;
}) {
  const { region } = await params;
  const filters = await searchParams;

  const activeCategory = filters.category || undefined;
  const sort = SORTS.find((option) => option.value === filters.sort)?.value ?? "featured";

  const [results, categories] = await Promise.all([
    listProducts({ category: activeCategory, search: filters.q, sort }),
    listMedusaCategories(),
  ]);

  /** Builds a store URL that keeps the other filters intact. */
  const linkWith = (patch: Record<string, string | undefined>) => {
    const query = new URLSearchParams();
    const merged = { category: activeCategory, q: filters.q, sort, ...patch };
    for (const [key, value] of Object.entries(merged)) {
      if (value && value !== "featured") query.set(key, value);
    }
    const qs = query.toString();
    return `/${region}/store${qs ? `?${qs}` : ""}`;
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink-400">
        {brand.assayCount}× tested · {brand.purityClaim} purity · Ships in 0–2 days
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink-950 sm:text-4xl">
        All <span className="font-display font-normal italic">products</span>
      </h1>

      {/* Search and sort */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <form action={`/${region}/store`} className="relative flex-1">
          {activeCategory && <input type="hidden" name="category" value={activeCategory} />}
          {sort !== "featured" && <input type="hidden" name="sort" value={sort} />}
          <svg
            viewBox="0 0 24 24"
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 4.5 4.5" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            name="q"
            defaultValue={filters.q ?? ""}
            placeholder="Search compounds, aliases, CAS numbers…"
            className="w-full rounded-full border border-ink-200 bg-white py-3 pl-11 pr-4 text-sm text-ink-900 placeholder:text-ink-400 focus:border-copper-400 focus:outline-none"
          />
        </form>

        <div className="flex gap-1.5 overflow-x-auto">
          {SORTS.map((option) => (
            <Link
              key={option.value}
              href={linkWith({ sort: option.value })}
              className={`whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-semibold transition ${
                sort === option.value
                  ? "bg-ink-950 text-white"
                  : "border border-ink-200 text-ink-600 hover:border-ink-400"
              }`}
            >
              {option.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Category pills */}
      <nav className="mt-4 flex gap-2 overflow-x-auto pb-1">
        <Link
          href={linkWith({ category: undefined })}
          className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
            !activeCategory
              ? "bg-ink-950 text-white"
              : "border border-ink-200 text-ink-600 hover:border-ink-400"
          }`}
        >
          All
        </Link>
        {categories.map((cat) => (
          <Link
            key={cat.slug}
            href={linkWith({ category: cat.slug })}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
              activeCategory === cat.slug
                ? "bg-ink-950 text-white"
                : "border border-ink-200 text-ink-600 hover:border-ink-400"
            }`}
          >
            {cat.name}
          </Link>
        ))}
      </nav>

      <p className="mt-6 font-mono text-xs text-ink-400">
        {results.length} {results.length === 1 ? "compound" : "compounds"}
        {filters.q ? ` matching “${filters.q}”` : ""}
      </p>

      {results.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-dashed border-ink-200 py-20 text-center">
          <p className="text-sm text-ink-500">Nothing matched that search.</p>
          <Link
            href={`/${region}/store`}
            className="mt-4 inline-block rounded-full bg-ink-950 px-5 py-2.5 text-sm font-semibold text-white"
          >
            Clear filters
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {results.map((product) => (
            <ProductCard key={product.handle} product={product} />
          ))}
        </div>
      )}
    </main>
  );
}
