import { env } from "@/lib/config/env";
import { StorySessionController } from "@/server/api/controllers/story-session-controller";
import { runRoute } from "@/server/api/http/handler";

const controller = new StorySessionController();

export async function POST(request: Request) {
  return runRoute(request, async (context) => controller.create(request, context.requestId), {
    rateLimitKey: "story-session-create",
    rateLimitMaxRequests: env.GENERATION_RATE_LIMIT_MAX_REQUESTS,
    rateLimitWindowMs: env.GENERATION_RATE_LIMIT_WINDOW_MS,
  });
}

export async function GET(request: Request) {
  return runRoute(request, async (context) => controller.list(request, context.requestId));
}
