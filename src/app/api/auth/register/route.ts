import { AuthController } from "@/server/api/controllers/auth-controller";
import { runRoute } from "@/server/api/http/handler";

const controller = new AuthController();

export async function POST(request: Request) {
  return runRoute(
    request,
    async (context) => controller.register(request, context.requestId),
    {
      rateLimitKey: "auth-register",
      rateLimitMaxRequests: 10,
    },
  );
}
