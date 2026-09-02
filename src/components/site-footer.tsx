import Link from "next/link";
import { brand, footerNav, researchUseDisclaimer } from "@/lib/brand";
import { Wordmark } from "@/components/site-header";

export function SiteFooter() {
  return (
    <footer className="mt-24 bg-ink-950 text-ink-200">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Link href={`/${brand.defaultRegion}`} className="text-white">
              <Wordmark />
            </Link>
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-ink-300">
              Research-grade peptides for controlled laboratory studies.
              Third-party tested, with a certificate of analysis on every batch.
            </p>
            <p className="mt-5 font-mono text-xs text-ink-400">
              {brand.supportEmail}
            </p>
          </div>

          {footerNav.map((group) => (
            <div key={group.heading}>
              <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-400">
                {group.heading}
              </h2>
              <ul className="mt-4 space-y-2.5">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-ink-200 transition hover:text-copper-300"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Regulatory notice. Prominent by design — this is the whole posture. */}
        <div className="mt-14 rounded-xl border-l-4 border-copper-500 bg-ink-900/80 p-5">
          <h2 className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-copper-300">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 3 2.5 20h19L12 3Z" strokeLinejoin="round" />
              <path d="M12 10v4.5M12 17.2v.3" strokeLinecap="round" />
            </svg>
            Research use only
          </h2>
          <p className="mt-3 text-xs leading-relaxed text-ink-300">
            {researchUseDisclaimer} Nothing on this site is medical advice or a
            substitute for consulting a qualified professional.
          </p>
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-ink-800 pt-6 text-xs text-ink-400 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {brand.legalName}. All rights reserved.
          </p>
          <p className="font-mono uppercase tracking-wider">
            {brand.purityClaim} purity · {brand.assayCount}× tested · Secure checkout
          </p>
        </div>
      </div>
    </footer>
  );
}
