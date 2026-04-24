import { env } from "@/lib/config/env";
import { ok } from "@/server/api/http/response";
import { parseJson, runRoute } from "@/server/api/http/handler";
import { requireAuth } from "@/server/middleware/auth";
import { withGenerationPermit } from "@/server/security/generation-guard";
import { StoryIdeaRewriteService } from "@/server/services/story-idea-rewrite-service";
import { rewriteStoryIdeaSchema } from "@/server/validation/api-schemas";

const rewriteService = new StoryIdeaRewriteService();

export async function POST(request: Request) {
  return runRoute(
    request,
    async (context) => {
      const auth = await requireAuth(request);
      const payload = await parseJson(request, rewriteStoryIdeaSchema);
      const rewritten = await withGenerationPermit(
        `rewrite:${auth.userId}`,
        () => rewriteService.rewrite(auth.userId, payload.text),
      );
      return ok(context.requestId, rewritten);
    },
    {
      rateLimitKey: "story-rewrite",
      rateLimitMaxRequests: env.GENERATION_RATE_LIMIT_MAX_REQUESTS,
      rateLimitWindowMs: env.GENERATION_RATE_LIMIT_WINDOW_MS,
    },
  );
}
