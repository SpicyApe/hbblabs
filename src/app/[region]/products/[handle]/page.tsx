import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProduct, getRelatedProducts } from "@/lib/db";
import { categoryLabel, formatPrice, priceFrom } from "@/data/products";
import { brand } from "@/lib/brand";
import { Vial, tintFor } from "@/components/vial";
import { BuyBox } from "@/components/buy-box";
import { ProductCard } from "@/components/product-card";
import { displayPurity } from "@/components/product-card";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const product = await getProduct(handle);
  if (!product) return { title: "Not found" };

  return {
    title: `${product.name} — ${brand.purityClaim} purity`,
    description: product.blurb,
    alternates: { canonical: `/${brand.defaultRegion}/products/${product.handle}` },
  };
}

const SHIPPING_NOTES = [
  { title: "Ships in 0–2 business days", detail: "Order before 3:00 PM ET for same-day dispatch." },
  { title: "Free shipping over $25", detail: "$9 flat rate below that. Overnight options at checkout." },
  { title: "Shipment protection included", detail: "Lost, stolen or damaged in transit? Replaced at no cost." },
  { title: "Discreet packaging", detail: "Unbranded outer carton, tracking on every order." },
] as const;

export default async function ProductPage({
  params,
}: {
  params: Promise<{ region: string; handle: string }>;
}) {
  const { region, handle } = await params;
  const product = await getProduct(handle);
  if (!product) notFound();

  const related = await getRelatedProducts(handle);
  const tint = tintFor(product.handle);

  /* Product structured data. Helps the catalog surface properly in search. */
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.blurb,
    category: categoryLabel(product.category),
    brand: { "@type": "Brand", name: brand.name },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "USD",
      lowPrice: (priceFrom(product) / 100).toFixed(2),
      offerCount: product.variants.length,
      availability: product.variants.some((v) => v.inStock)
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav className="font-mono text-[11px] uppercase tracking-wider text-ink-400">
        <Link href={`/${region}/store`} className="hover:text-ink-700">
          Store
        </Link>
        <span className="mx-2">/</span>
        <Link
          href={`/${region}/store?category=${product.category}`}
          className="hover:text-ink-700"
        >
          {categoryLabel(product.category)}
        </Link>
      </nav>

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        {/* Image */}
        <div>
          <div
            className="relative flex aspect-square items-center justify-center rounded-2xl p-16"
            style={{ backgroundColor: tint.bg }}
          >
            <Vial
              handle={product.handle}
              name={product.name}
              shape={product.category === "spray" ? "spray" : "vial"}
              className="h-full w-auto"
            />
            <div className="absolute inset-x-4 bottom-4 flex flex-wrap gap-1.5">
              {[
                `${brand.assayCount}× tested · ISO 17025`,
                `${brand.purityClaim} purity`,
                "Research use only",
              ].map((chip) => (
                <span
                  key={chip}
                  className="rounded-full bg-white/90 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide text-ink-600 backdrop-blur"
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>
          <p className="mt-2 text-center font-mono text-[10px] uppercase tracking-wider text-ink-300">
            Illustration — not a photograph of the supplied vial
          </p>
        </div>

        {/* Buy box */}
        <div className="lg:pl-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-400">
            {categoryLabel(product.category)}
          </p>
          <h1 className="mt-1.5 text-3xl font-bold tracking-tight text-ink-950 sm:text-4xl">
            {product.name}
          </h1>

          {product.aliases.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {product.aliases.map((alias) => (
                <li
                  key={alias}
                  className="rounded-full border border-ink-200 px-2.5 py-1 text-[11px] text-ink-500"
                >
                  {alias}
                </li>
              ))}
            </ul>
          )}

          <p className="mt-4 text-sm leading-relaxed text-ink-600">{product.description}</p>

          <div className="mt-6 border-t border-ink-100 pt-6">
            <BuyBox product={product} />
          </div>

          {/* Specification table */}
          <dl className="mt-8 divide-y divide-ink-100 border-t border-ink-100 text-sm">
            {[
              ["Purity", `${displayPurity(product.handle)}% by HPLC`],
              product.form ? ["Form", product.form] : null,
              product.sequence ? ["Sequence", product.sequence] : null,
              product.cas ? ["CAS", product.cas] : null,
              product.storage ? ["Storage", product.storage] : null,
            ]
              .filter((row): row is [string, string] => row !== null)
              .map(([label, value]) => (
                <div key={label} className="grid grid-cols-3 gap-4 py-3">
                  <dt className="font-mono text-[11px] uppercase tracking-wider text-ink-400">
                    {label}
                  </dt>
                  <dd className="col-span-2 text-ink-800">{value}</dd>
                </div>
              ))}
          </dl>

          <ul className="mt-8 space-y-px overflow-hidden rounded-xl">
            {SHIPPING_NOTES.map((note) => (
              <li key={note.title} className="bg-copper-50/60 px-4 py-3">
                <p className="text-sm font-semibold text-ink-900">{note.title}</p>
                <p className="text-xs text-ink-500">{note.detail}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-20">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-400">
            Commonly studied alongside
          </p>
          <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-ink-950">
            Frequently researched{" "}
            <span className="font-display font-normal italic">together</span>
          </h2>
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((item) => (
              <ProductCard key={item.handle} product={item} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
