import { notFound } from "next/navigation";
import { brand } from "@/lib/brand";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

/** One region today. Adding another means adding it here and to the pricing logic. */
const REGIONS = new Set<string>([brand.defaultRegion]);

export function generateStaticParams() {
  return [...REGIONS].map((region) => ({ region }));
}

export default async function RegionLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ region: string }>;
}) {
  const { region } = await params;
  if (!REGIONS.has(region)) notFound();

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  );
}
