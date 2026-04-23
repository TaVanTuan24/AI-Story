import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { env } from "@/lib/config/env";

const protectedPrefixes = ["/dashboard", "/profile", "/story-sessions", "/stories", "/admin"];
const publicAuthRoutes = ["/login", "/register"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(env.AUTH_COOKIE_NAME)?.value);

  if (protectedPrefixes.some((prefix) => pathname.startsWith(prefix)) && !hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (hasSession && publicAuthRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/profile/:path*", "/story-sessions/:path*", "/stories/:path*", "/admin/:path*", "/login", "/register"],
};
