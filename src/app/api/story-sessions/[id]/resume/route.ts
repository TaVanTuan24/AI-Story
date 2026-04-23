import { StorySessionController } from "@/server/api/controllers/story-session-controller";
import { runRoute } from "@/server/api/http/handler";

const controller = new StorySessionController();

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return runRoute(request, async (ctx) => controller.resume(request, ctx.requestId, id));
}
