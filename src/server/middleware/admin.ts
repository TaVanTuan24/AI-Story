import { env } from "@/lib/config/env";
import { ApiError } from "@/server/api/errors/api-error";
import { requireAuth } from "@/server/middleware/auth";

export async function requireAdmin(request: Request) {
  const auth = await requireAuth(request);
  const email = auth.email.toLowerCase();

  if (!env.ADMIN_EMAILS.includes(email)) {
    throw new ApiError("Admin access is required.", 403, "ADMIN_REQUIRED");
  }

  return auth;
}
