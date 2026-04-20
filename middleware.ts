import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ACCESS_COOKIE_NAME, ACCESS_COOKIE_VALUE } from "@/lib/auth";

function requiresAccess(pathname: string): boolean {
  return pathname.startsWith("/dashboard") || pathname.startsWith("/api/refunds");
}

export function middleware(request: NextRequest) {
  if (!requiresAccess(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const hasAccess = request.cookies.get(ACCESS_COOKIE_NAME)?.value === ACCESS_COOKIE_VALUE;
  if (hasAccess) {
    return NextResponse.next();
  }

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized. Complete checkout first." }, { status: 401 });
  }

  const url = new URL("/", request.url);
  url.searchParams.set("paywall", "locked");
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/refunds/:path*"]
};
