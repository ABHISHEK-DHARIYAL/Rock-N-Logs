/**
 * Admin route guard (UX only). Next 16 renamed `middleware` to `proxy`.
 *
 * Redirects visitors without a session cookie away from /admin/*. This is
 * NOT the security boundary — the backend verifies the JWT on every
 * /api/admin/* call, so a forged cookie gets a 401 and no data. Keeping the
 * JWT secret out of the frontend is deliberate.
 */
import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_SESSION_COOKIE } from "@/lib/constants";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/admin/login")) return NextResponse.next();

  if (!request.cookies.get(ADMIN_SESSION_COOKIE)?.value) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*"] };
