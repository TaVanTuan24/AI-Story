import { env } from "@/lib/config/env";
import { StorySessionController } from "@/server/api/controllers/story-session-controller";
import { runRoute } from "@/server/api/http/handler";

const controller = new StorySessionController();

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return runRoute(request, async (ctx) => controller.recap(request, ctx.requestId, id), {
    rateLimitKey: "story-session-recap",
    rateLimitMaxRequests: Math.max(3, Math.floor(env.GENERATION_RATE_LIMIT_MAX_REQUESTS / 2)),
    rateLimitWindowMs: env.GENERATION_RATE_LIMIT_WINDOW_MS,
  });
}
