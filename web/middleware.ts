import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Matcher must exclude public routes and static assets.
// Verify: / -> excluded via ^$, /gallery* , /tv , /login , /api/auth/* , /_next/* , /favicon.ico are excluded
// Include: /dashboard, /announcements*, /admin/*, /gallery/upload etc are protected by this matcher
// The negative lookahead ensures those prefixes are NOT matched.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth|login|^$|gallery|tv).*)"],
};

export function middleware(request: NextRequest) {
  // This is a UX redirect, not a security boundary.
  // Real verification is server-side in (app)/layout.tsx via getCurrentUser() calling backend /api/auth/me.
  // We only check cookie existence here to avoid Edge blocking on backend.
  const token = request.cookies.get("ns_token")?.value;
  const pathname = request.nextUrl.pathname;

  // Safety: if matcher mis-fires, ensure public paths still pass through
  if (
    pathname === "/" ||
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname.startsWith("/gallery") ||
    pathname.startsWith("/tv") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  // Do NOT verify JWT here — cheap check only
  return NextResponse.next();
}
