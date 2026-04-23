import { env } from "@/lib/config/env";
import { AuthController } from "@/server/api/controllers/auth-controller";
import { runRoute } from "@/server/api/http/handler";

const controller = new AuthController();

export async function POST(request: Request) {
  return runRoute(
    request,
    async (context) => controller.login(request, context.requestId),
    {
      rateLimitKey: "auth-login",
      rateLimitMaxRequests: env.AUTH_RATE_LIMIT_MAX_REQUESTS,
    },
  );
}
