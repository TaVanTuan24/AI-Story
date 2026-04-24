import { UserAISettingsController } from "@/server/api/controllers/user-ai-settings-controller";
import { runRoute } from "@/server/api/http/handler";

const controller = new UserAISettingsController();

export async function GET(request: Request) {
  return runRoute(request, async ({ requestId }) => controller.get(request, requestId));
}

export async function PATCH(request: Request) {
  return runRoute(request, async ({ requestId }) => controller.update(request, requestId));
}
