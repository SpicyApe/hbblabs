import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { brand, researchUseDisclaimer } from "@/lib/brand";
import { COMPLIANCE_COOKIE } from "@/lib/constants";
import { Wordmark } from "@/components/site-header";
import { Vial } from "@/components/vial";
import { GateForm } from "./gate-form";

export const metadata: Metadata = {
  title: "Researcher verification",
  robots: { index: false, follow: false },
};

/** Scattered behind the card. Fixed values so the layout is stable across renders. */
const FIELD = [
  { handle: "bpc-157", name: "BPC-157", left: "6%", top: "12%", size: 92, tilt: -12, delay: 0 },
  { handle: "nad-plus", name: "NAD+", left: "18%", top: "62%", size: 128, tilt: 8, delay: 2.5 },
  { handle: "ghk-cu", name: "GHK-Cu", left: "31%", top: "26%", size: 76, tilt: 16, delay: 5 },
  { handle: "tb-500", name: "TB-500", left: "62%", top: "8%", size: 84, tilt: -6, delay: 1.2 },
  { handle: "dsip", name: "DSIP", left: "78%", top: "58%", size: 116, tilt: 12, delay: 3.8 },
  { handle: "semax", name: "Semax", left: "88%", top: "20%", size: 72, tilt: -18, delay: 6.1 },
  { handle: "kpv", name: "KPV", left: "48%", top: "78%", size: 68, tilt: 4, delay: 4.4 },
] as const;

export default async function GatePage({
  searchParams,
}: {
  searchParams: Promise<{ return?: string }>;
}) {
  // Already attested? Don't make them do it twice.
  if ((await cookies()).has(COMPLIANCE_COOKIE)) {
    redirect(`/${brand.defaultRegion}`);
  }

  const params = await searchParams;

  /*
   * Only accept same-origin relative paths. Reflecting an arbitrary `return`
   * value into a redirect is an open-redirect hole, and "//evil.com" is a
   * protocol-relative URL that a naive startsWith("/") check would wave through.
   */
  const raw = params.return ?? "";
  const destination =
    raw.startsWith("/") && !raw.startsWith("//") ? raw : `/${brand.defaultRegion}`;

  return (
    <main className="relative min-h-screen overflow-hidden bg-linear-to-b from-bone-50 via-copper-50/50 to-bone-200">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        {FIELD.map((item) => (
          <div
            key={item.handle}
            className="animate-drift absolute opacity-70"
            style={{
              left: item.left,
              top: item.top,
              width: item.size,
              ["--tilt" as string]: `${item.tilt}deg`,
              ["--drift-delay" as string]: `${item.delay}s`,
              ["--drift-duration" as string]: `${12 + (item.size % 7)}s`,
            }}
          >
            <Vial handle={item.handle} name={item.name} className="h-auto w-full" />
          </div>
        ))}
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">
          <div className="mb-6 flex justify-center text-ink-950">
            <Wordmark />
          </div>

          <div className="rounded-2xl border border-ink-100 bg-white/95 p-6 shadow-[0_24px_70px_-28px_rgba(10,17,32,0.35)] backdrop-blur md:p-8">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-ink-950 md:text-3xl">
              Researcher verification
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-ink-500">
              {brand.legalName} supplies research peptides exclusively to
              qualified researchers and laboratories for in vitro and laboratory
              use. Please confirm before continuing.
            </p>

            <GateForm destination={destination} />

            <p className="mt-6 text-[11px] leading-relaxed text-ink-400">
              By proceeding you affirm the statements above are true.{" "}
              {researchUseDisclaimer}{" "}
              <a
                href={`/${brand.defaultRegion}/disclaimer`}
                className="underline underline-offset-2 hover:text-ink-600"
              >
                Full disclaimer
              </a>
              .
            </p>
          </div>

          <p className="mt-6 text-center text-sm text-ink-400">
            Not a researcher?{" "}
            <a href="https://www.google.com" className="font-medium text-ink-600 underline underline-offset-2">
              Exit
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
