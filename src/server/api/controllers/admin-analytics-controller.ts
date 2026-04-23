import { ok } from "@/server/api/http/response";
import { analytics } from "@/server/analytics/analytics-service";
import { requireAdmin } from "@/server/middleware/admin";

export class AdminAnalyticsController {
  async overview(request: Request, requestId: string) {
    await requireAdmin(request);
    const url = new URL(request.url);
    const days = Number(url.searchParams.get("days") ?? "30");
    const overview = await analytics.getOverview(Number.isFinite(days) ? days : 30);

    return ok(requestId, overview);
  }
}
