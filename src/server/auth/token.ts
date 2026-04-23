import { SignJWT, jwtVerify } from "jose";

import { env } from "@/lib/config/env";
import { ApiError } from "@/server/api/errors/api-error";

const secret = new TextEncoder().encode(env.AUTH_SECRET);

export type AuthTokenPayload = {
  sub: string;
  email: string;
  displayName: string;
};

export async function signAuthToken(payload: AuthTokenPayload) {
  return new SignJWT({
    email: payload.email,
    displayName: payload.displayName,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(env.APP_URL)
    .setAudience("ai-story-app")
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${env.AUTH_TOKEN_TTL_HOURS}h`)
    .sign(secret);
}

export async function verifyAuthToken(token: string): Promise<AuthTokenPayload> {
  try {
    const verified = await jwtVerify(token, secret, {
      issuer: env.APP_URL,
      audience: "ai-story-app",
    });
    return {
      sub: verified.payload.sub!,
      email: String(verified.payload.email),
      displayName: String(verified.payload.displayName),
    };
  } catch {
    throw new ApiError("Authentication token is invalid.", 401, "INVALID_TOKEN");
  }
}
