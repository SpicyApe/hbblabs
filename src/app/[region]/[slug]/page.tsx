import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { infoPages, infoPagesBySlug } from "@/data/pages";
import { brand } from "@/lib/brand";

/*
 * Catch-all for the informational routes. Static segments (store, cart,
 * checkout, products, order) resolve before this one, so it only ever sees
 * slugs from src/data/pages.ts.
 */
export function generateStaticParams() {
  return infoPages.map((page) => ({ region: brand.defaultRegion, slug: page.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = infoPagesBySlug.get(slug);
  if (!page) return { title: "Not found" };

  return {
    title: page.title,
    description: page.lede,
    robots: page.placeholder ? { index: false, follow: true } : undefined,
  };
}

export default async function InfoPageRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = infoPagesBySlug.get(slug);
  if (!page) notFound();

  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-copper-700">
        {page.eyebrow}
      </p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-ink-950">{page.title}</h1>
      <p className="mt-5 text-lg leading-relaxed text-ink-600">{page.lede}</p>

      {page.placeholder && (
        <p className="mt-8 rounded-xl border-l-4 border-copper-500 bg-copper-50 px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-copper-800">
          Placeholder — not legal advice, not reviewed by counsel
        </p>
      )}

      <div className="mt-14 space-y-14">
        {page.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="text-xl font-bold tracking-tight text-ink-950">
              {section.heading}
            </h2>

            {section.body.map((paragraph) => (
              <p key={paragraph} className="mt-4 text-sm leading-relaxed text-ink-600">
                {paragraph}
              </p>
            ))}

            {section.list && (
              <dl className="mt-6 divide-y divide-ink-100 border-y border-ink-100">
                {section.list.map(([term, definition]) => (
                  <div key={term} className="grid gap-1 py-4 sm:grid-cols-3 sm:gap-4">
                    <dt className="text-sm font-semibold text-ink-900">{term}</dt>
                    <dd className="text-sm leading-relaxed text-ink-600 sm:col-span-2">
                      {definition}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </section>
        ))}
      </div>
    </main>
  );
}
