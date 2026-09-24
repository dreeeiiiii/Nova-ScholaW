import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Positive list of protected paths — everything else is public.
// Layout and pages decide shell/content.
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/gallery/upload",
    "/gallery/mine",
    "/announcements/manage",
    "/announcements/create",
  ],
};

export function middleware(request: NextRequest) {
  // UX redirect, not a security boundary.
  // Real verification is server-side in (app)/layout.tsx and protected pages via getCurrentUser().
  const token = request.cookies.get("ns_token")?.value;
  if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}
