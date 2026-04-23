import { AuthController } from "@/server/api/controllers/auth-controller";
import { runRoute } from "@/server/api/http/handler";

const controller = new AuthController();

export async function GET(request: Request) {
  return runRoute(request, async (context) => controller.me(request, context.requestId));
}
