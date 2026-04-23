import { AdminAnalyticsController } from "@/server/api/controllers/admin-analytics-controller";
import { runRoute } from "@/server/api/http/handler";

const controller = new AdminAnalyticsController();

export async function GET(request: Request) {
  return runRoute(request, ({ requestId }) => controller.overview(request, requestId), {
    rateLimitKey: "admin:analytics",
    rateLimitMaxRequests: 30,
    rateLimitWindowMs: 60_000,
  });
}
