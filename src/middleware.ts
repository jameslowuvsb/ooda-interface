import { NextRequest, NextResponse } from "next/server";

/**
 * Password gate — protects all pages behind a simple password.
 * Password is checked via a session cookie set by /api/auth.
 */

const PUBLIC_PATHS = ["/login", "/api/auth", "/cesium/"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths and static assets
  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.endsWith(".ico") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".jpg") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".js") ||
    pathname.endsWith(".css") ||
    pathname.endsWith(".woff") ||
    pathname.endsWith(".woff2")
  ) {
    return NextResponse.next();
  }

  // Check auth cookie
  const authCookie = req.cookies.get("ooda-auth");
  if (authCookie?.value === "authenticated") {
    return NextResponse.next();
  }

  // Redirect to login
  const loginUrl = new URL("/login", req.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
