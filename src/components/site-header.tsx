import Link from "next/link";
import { brand, primaryNav } from "@/lib/brand";
import { getCartId, } from "@/lib/session";
import { resolveCart } from "@/lib/db";

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex flex-col leading-none ${className}`}>
      <span className="font-display text-2xl font-semibold tracking-tight">
        {brand.name}
      </span>
      <span className="font-mono text-[9px] uppercase tracking-[0.32em] text-ink-400">
        Research Co.
      </span>
    </span>
  );
}

async function cartCount(): Promise<number> {
  const cartId = await getCartId();
  if (!cartId) return 0;
  const { lines } = await resolveCart(cartId);
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}

export async function SiteHeader() {
  const count = await cartCount();

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-ink-100 bg-bone-50/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">
          <Link href={`/${brand.defaultRegion}`} className="shrink-0 text-ink-950">
            <Wordmark />
          </Link>

          <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex">
            {primaryNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full px-3 py-2 text-sm font-medium text-ink-600 transition hover:bg-ink-50 hover:text-ink-950"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1 lg:ml-0">
            <Link
              href={`/${brand.defaultRegion}/account`}
              className="rounded-full p-2.5 text-ink-600 transition hover:bg-ink-50 hover:text-ink-950"
              aria-label="Account"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
                <circle cx="12" cy="8" r="3.5" />
                <path d="M4.5 20a7.5 7.5 0 0 1 15 0" strokeLinecap="round" />
              </svg>
            </Link>

            <Link
              href={`/${brand.defaultRegion}/cart`}
              className="relative rounded-full p-2.5 text-ink-600 transition hover:bg-ink-50 hover:text-ink-950"
              aria-label={`Cart, ${count} ${count === 1 ? "item" : "items"}`}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M4 7h16l-1.3 11.2a2 2 0 0 1-2 1.8H7.3a2 2 0 0 1-2-1.8L4 7Z" strokeLinejoin="round" />
                <path d="M9 7V5.5a3 3 0 0 1 6 0V7" strokeLinecap="round" />
              </svg>
              <span
                className={`absolute right-0.5 top-0.5 grid h-4 min-w-4 place-items-center rounded-full px-1 font-mono text-[10px] font-medium tabular-nums ${
                  count > 0 ? "bg-copper-600 text-white" : "bg-ink-200 text-ink-600"
                }`}
              >
                {count}
              </span>
            </Link>
          </div>
        </div>

        {/* Mobile nav — the primary links wrap to a scroller under the bar. */}
        <nav className="flex gap-1 overflow-x-auto border-t border-ink-100 px-4 py-2 lg:hidden">
          {primaryNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium text-ink-600"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <p className="bg-ink-950 px-4 py-2 text-center font-mono text-[11px] uppercase tracking-wider text-ink-200">
        <span className="text-copper-300">For research use only.</span>{" "}
        Not for human or veterinary use.
      </p>
    </>
  );
}
