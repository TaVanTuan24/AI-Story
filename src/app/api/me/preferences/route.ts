import { AuthController } from "@/server/api/controllers/auth-controller";
import { runRoute } from "@/server/api/http/handler";

const controller = new AuthController();

export async function PATCH(request: Request) {
  return runRoute(
    request,
    async (context) => controller.updatePreferences(request, context.requestId),
  );
}
