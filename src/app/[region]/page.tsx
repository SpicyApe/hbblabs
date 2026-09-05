import Link from "next/link";
import { getFeaturedProducts, listProducts } from "@/lib/db";
import { formatPrice } from "@/data/products";
import { brand } from "@/lib/brand";
import { Vial, tintFor } from "@/components/vial";
import { ProductCard } from "@/components/product-card";

const GUARANTEES = [
  {
    title: `${brand.purityClaim} purity, guaranteed`,
    detail: "A batch that misses the spec does not ship. No exceptions.",
  },
  {
    title: `${brand.assayCount} assays, every batch`,
    detail: "HPLC purity, net peptide content, identity, appearance, heavy metals, sterility, endotoxin, and a controlled-substance screen.",
  },
  {
    title: "Shipment protection included",
    detail: "Lost, stolen, or damaged in transit — replaced at no cost, on us.",
  },
];

const ASSAYS = [
  ["HPLC purity", "Reversed-phase, area-percent at 214 nm"],
  ["Net peptide content", "Nitrogen determination, corrected for counter-ion"],
  ["Identity", "ESI-MS against the theoretical mass"],
  ["Appearance", "Visual inspection of the lyophilized cake"],
  ["Heavy metals", "ICP-MS, USP <232> element panel"],
  ["Sterility", "PCR bioburden screen"],
  ["Endotoxin", "LAL kinetic chromogenic"],
  ["Controlled substances", "Targeted screen, reported as pass/fail"],
] as const;

export default async function HomePage({
  params,
}: {
  params: Promise<{ region: string }>;
}) {
  const { region } = await params;
  /*
   * The catalogue drives the page rather than the seed file it was built
   * from. Reading the seed here meant the homepage advertised 50 compounds
   * and drew vials for products the store does not carry.
   */
  const [featured, catalogue] = await Promise.all([
    getFeaturedProducts(8),
    listProducts(),
  ]);

  /*
   * Featured first, then whatever else is stocked, so these stay populated
   * however few products exist.
   */
  const showcase = [
    ...catalogue.filter((p) => p.featured),
    ...catalogue.filter((p) => !p.featured),
  ];
  const boxPreview = showcase.slice(0, 4);

  const boxRetail = boxPreview.reduce(
    (sum, product) => sum + Math.min(...product.variants.map((v) => v.price)),
    0,
  );

  return (
    <main>
      {/* ---- Hero ---------------------------------------------------------- */}
      <section className="grid lg:grid-cols-2">
        <div className="pad-container-start flex items-center px-4 py-20 pr-4 sm:px-6 sm:pr-6 lg:py-28 lg:pr-12">
          <div className="mx-auto max-w-lg lg:mx-0">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-copper-700">
              {brand.assayCount}× third-party tested
            </p>
            <h1 className="mt-4 text-4xl font-bold leading-[1.05] tracking-tight text-ink-950 sm:text-5xl">
              Peptides you can{" "}
              <span className="font-display font-normal italic text-copper-700">verify</span>,
              not just trust.
            </h1>
            <p className="mt-5 text-base leading-relaxed text-ink-600">
              Every batch is analyzed by an ISO 17025 accredited laboratory before
              it ships, and the full certificate of analysis travels with it.
              Supplied strictly for in vitro laboratory research.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={`/${region}/store`}
                className="inline-flex items-center gap-2 rounded-full bg-ink-950 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-ink-800"
              >
                Browse the catalog
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 12h15M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
              <Link
                href={`/${region}/coa`}
                className="inline-flex items-center rounded-full border border-ink-300 px-6 py-3.5 text-sm font-semibold text-ink-800 transition hover:border-ink-500"
              >
                See a certificate
              </Link>
            </div>
            <p className="mt-6 font-mono text-[11px] uppercase tracking-wider text-ink-400">
              {catalogue.length} {catalogue.length === 1 ? "compound" : "compounds"} ·{" "}
              free shipping over {formatPrice(brand.freeShippingOver)}
            </p>
          </div>
        </div>

        <div className="relative min-h-[380px] overflow-hidden bg-linear-to-br from-copper-50 via-bone-200 to-ink-50 lg:min-h-[600px]">
          {/* Positions are fixed; which products fill them is not. */}
          {[
            { left: "8%", top: "16%", w: 150, tilt: -8, delay: 0 },
            { left: "44%", top: "8%", w: 190, tilt: 6, delay: 2 },
            { left: "20%", top: "52%", w: 210, tilt: 12, delay: 4 },
            { left: "62%", top: "48%", w: 165, tilt: -14, delay: 1 },
          ]
            .map((slot, index) => ({ ...slot, product: showcase[index % (showcase.length || 1)] }))
            .filter((slot) => slot.product)
            .map((item) => (
            <div
              key={`${item.product.handle}-${item.left}`}
              className="animate-drift absolute drop-shadow-[0_25px_45px_rgba(10,17,32,0.18)]"
              style={{
                left: item.left,
                top: item.top,
                width: item.w,
                ["--tilt" as string]: `${item.tilt}deg`,
                ["--drift-delay" as string]: `${item.delay}s`,
              }}
            >
              <Vial
                handle={item.product.handle}
                name={item.product.name}
                className="h-auto w-full"
              />
            </div>
            ))}
        </div>
      </section>

      {/* ---- Guarantees ---------------------------------------------------- */}
      <section className="border-y border-ink-100 bg-white">
        <div className="mx-auto grid max-w-7xl gap-px bg-ink-100 px-0 sm:grid-cols-3">
          {GUARANTEES.map((item) => (
            <div key={item.title} className="bg-white p-8">
              <h2 className="text-sm font-bold text-ink-950">{item.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-500">{item.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---- Subscription box ---------------------------------------------- */}
      <section className="grid items-center lg:grid-cols-2">
        <div className="pad-container-start px-4 py-20 pr-4 sm:px-6 sm:pr-6 lg:pr-12">
          <div className="mx-auto max-w-lg lg:mx-0">
            <span className="inline-flex items-center gap-2 rounded-full bg-copper-100 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-copper-800">
              New · Standing order
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-ink-950 sm:text-4xl">
              Pick any four.{" "}
              <span className="font-display font-normal italic">Save 40% every month.</span>
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-ink-600">
              Build a standing order from anything in the catalog. We pack and
              ship it on the same date each month at 40% off list, for as long as
              the order stands.
            </p>
            <ul className="mt-6 space-y-2.5">
              {[
                "Bacteriostatic water in every box",
                "Free 2-day delivery, every month",
                "Swap compounds any time after the first shipment",
                "COA-verified batches, third-party tested",
              ].map((line) => (
                <li key={line} className="flex items-start gap-2.5 text-sm text-ink-700">
                  <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-copper-600" fill="none" stroke="currentColor" strokeWidth="2.6">
                    <path d="M4 12.5 9.5 18 20 6.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {line}
                </li>
              ))}
            </ul>
            <Link
              href={`/${region}/subscription-box`}
              className="mt-8 inline-flex items-center rounded-full bg-ink-950 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-ink-800"
            >
              Build a box
            </Link>
          </div>
        </div>

        <div className="flex justify-center bg-linear-to-br from-ink-50 via-bone-200 to-copper-50 px-4 py-16 lg:py-24">
          <div className="w-full max-w-xs rounded-2xl border border-ink-100 bg-white p-5 shadow-[0_30px_60px_-30px_rgba(10,17,32,0.4)]">
            <div className="flex items-baseline justify-between">
              <h3 className="text-sm font-bold text-ink-950">Your box</h3>
              <span className="font-mono text-[10px] uppercase tracking-wider text-ink-400">
                4 items
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {boxPreview.map((product) => (
                <div key={product.handle} className="rounded-lg p-2" style={{ backgroundColor: tintFor(product.handle).bg }}>
                  <Vial handle={product.handle} name={product.name} className="mx-auto h-16 w-auto" />
                  <p className="mt-1 truncate text-center text-[10px] font-medium text-ink-700">
                    {product.name}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between rounded-lg bg-copper-50 px-3 py-2">
              <span className="text-xs font-medium text-ink-800">Bacteriostatic water</span>
              <span className="font-mono text-[10px] font-semibold uppercase text-copper-700">Free</span>
            </div>
            <div className="mt-4 flex items-baseline justify-between border-t border-ink-100 pt-4">
              <span className="font-mono text-xs text-ink-400 line-through">
                {formatPrice(boxRetail)}
              </span>
              <span className="font-display text-2xl font-semibold text-ink-950">
                {formatPrice(Math.round(boxRetail * 0.6))}
                <span className="font-sans text-xs font-normal text-ink-400">/mo</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Featured ------------------------------------------------------ */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-ink-950 sm:text-3xl">
              Featured compounds
            </h2>
            <p className="mt-1.5 text-sm text-ink-500">
              Third-party identity tested, certificate on every batch.
            </p>
          </div>
          <Link
            href={`/${region}/store`}
            className="rounded-full border border-ink-300 px-5 py-2.5 text-sm font-semibold text-ink-800 transition hover:border-ink-500"
          >
            View all {catalogue.length}
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((product) => (
            <ProductCard key={product.handle} product={product} />
          ))}
        </div>
      </section>

      {/* ---- Quality ------------------------------------------------------- */}
      <section className="bg-ink-950 py-20 text-ink-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-copper-400">
                Verified test results
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Every batch,{" "}
                <span className="font-display font-normal italic">independently verified.</span>
              </h2>
              <p className="mt-5 text-sm leading-relaxed text-ink-300">
                We do not ask you to take our word for it. Each batch is analyzed
                by an ISO 17025 accredited laboratory, and the released report is
                published against the batch code printed on the vial.
              </p>

              <dl className="mt-10 grid grid-cols-3 gap-6 border-t border-ink-800 pt-8">
                {[
                  [brand.purityClaim, "Purity guaranteed"],
                  [`${brand.assayCount}×`, "Assays per batch"],
                  ["100%", "US-based QC"],
                ].map(([value, label]) => (
                  <div key={label}>
                    <dt className="font-display text-3xl font-semibold text-white">{value}</dt>
                    <dd className="mt-1 text-xs text-ink-400">{label}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <ul className="divide-y divide-ink-800 border-y border-ink-800">
              {ASSAYS.map(([name, method], index) => (
                <li key={name} className="flex items-baseline gap-4 py-3.5">
                  <span className="font-mono text-[11px] tabular-nums text-copper-400">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">{name}</p>
                    <p className="mt-0.5 text-xs text-ink-400">{method}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ---- Closing CTA --------------------------------------------------- */}
      <section className="bg-linear-to-b from-bone-100 to-copper-50 px-4 py-24 text-center">
        <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-ink-950 sm:text-4xl">
          Everything your protocol needs, with the paperwork to match.
        </h2>
        <Link
          href={`/${region}/store`}
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-ink-950 px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-ink-800"
        >
          Shop all compounds
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 12h15M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </section>
    </main>
  );
}
