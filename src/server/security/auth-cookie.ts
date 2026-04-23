import type { NextResponse } from "next/server";

import { env } from "@/lib/config/env";

export function setAuthCookie(response: NextResponse, token: string) {
  response.cookies.set(env.AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.AUTH_COOKIE_SECURE || env.NODE_ENV === "production",
    sameSite: env.AUTH_COOKIE_SAME_SITE,
    path: "/",
    maxAge: env.AUTH_TOKEN_TTL_HOURS * 60 * 60,
  });
}

export function clearAuthCookie(response: NextResponse) {
  response.cookies.set(env.AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    secure: env.AUTH_COOKIE_SECURE || env.NODE_ENV === "production",
    sameSite: env.AUTH_COOKIE_SAME_SITE,
    path: "/",
    maxAge: 0,
  });
}

export function extractAuthCookie(cookieHeader: string | null) {
  if (!cookieHeader) {
    return null;
  }

  const cookie = cookieHeader
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${env.AUTH_COOKIE_NAME}=`));

  if (!cookie) {
    return null;
  }

  return decodeURIComponent(cookie.slice(`${env.AUTH_COOKIE_NAME}=`.length));
}
