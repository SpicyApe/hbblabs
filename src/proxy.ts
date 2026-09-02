import { NextResponse, type NextRequest } from "next/server";
import { brand } from "@/lib/brand";
import { COMPLIANCE_COOKIE } from "@/lib/constants";

/**
 * Two jobs:
 *   1. Send bare "/" to the default region.
 *   2. Hold everything behind the researcher-verification gate until the
 *      visitor has attested.
 *
 * The gate is an attestation, not authentication — it records that the visitor
 * affirmed the statements, which is what the research-use-only posture
 * requires. It is not an access control and should not be treated as one.
 */
export default function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // The gate itself, and the legal pages it links to, must stay reachable.
  const isExempt =
    pathname === "/gate" ||
    pathname.startsWith("/api/") ||
    pathname.endsWith("/disclaimer") ||
    pathname.endsWith("/terms") ||
    pathname.endsWith("/privacy");

  if (!isExempt && !request.cookies.has(COMPLIANCE_COOKIE)) {
    const gate = request.nextUrl.clone();
    gate.pathname = "/gate";
    gate.search = "";
    gate.searchParams.set("return", pathname + search);
    return NextResponse.redirect(gate);
  }

  if (pathname === "/") {
    const home = request.nextUrl.clone();
    home.pathname = `/${brand.defaultRegion}`;
    return NextResponse.redirect(home);
  }

  return NextResponse.next();
}

export const config = {
  // Everything except Next internals and static files.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|webp|gif|ico)$).*)"],
};
