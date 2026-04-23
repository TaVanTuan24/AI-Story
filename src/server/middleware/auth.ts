import { Types } from "mongoose";

import { ApiError } from "@/server/api/errors/api-error";
import { verifyAuthToken } from "@/server/auth/token";
import { extractAuthCookie } from "@/server/security/auth-cookie";

export type AuthenticatedUser = {
  userId: string;
  email: string;
  displayName: string;
};

export async function requireAuth(request: Request): Promise<AuthenticatedUser> {
  const header = request.headers.get("authorization");
  const cookieToken = extractAuthCookie(request.headers.get("cookie"));
  const bearerToken = header?.startsWith("Bearer ")
    ? header.slice("Bearer ".length).trim()
    : null;
  const token = bearerToken ?? cookieToken;

  if (!token) {
    throw new ApiError("Authentication is required.", 401, "UNAUTHORIZED");
  }
  const payload = await verifyAuthToken(token);

  if (!Types.ObjectId.isValid(payload.sub)) {
    throw new ApiError("Authentication token is invalid.", 401, "INVALID_TOKEN");
  }

  return {
    userId: payload.sub,
    email: payload.email,
    displayName: payload.displayName,
  };
}
