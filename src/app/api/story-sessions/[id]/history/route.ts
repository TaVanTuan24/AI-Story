import { StorySessionController } from "@/server/api/controllers/story-session-controller";
import { runRoute } from "@/server/api/http/handler";

const controller = new StorySessionController();

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return runRoute(request, async (ctx) => controller.history(request, ctx.requestId, id));
}
