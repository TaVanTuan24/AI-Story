import { connectToDatabase } from "@/lib/db/mongoose";
import { AnalyticsEventModel } from "@/server/persistence/models/analytics-event-model";
import { APIUsageLogModel } from "@/server/persistence/models/api-usage-log-model";
import { StorySessionModel } from "@/server/persistence/models/story-session-model";
import type { AnalyticsEventType } from "@/server/persistence/types/data-models";

export type AnalyticsEventInput = {
  userId?: string;
  storySessionId?: string;
  eventType: AnalyticsEventType;
  eventTime?: Date;
  properties?: Record<string, unknown>;
};

export type ApiUsageInput = {
  userId?: string;
  storySessionId?: string;
  provider: string;
  model: string;
  operation: string;
  status: "success" | "error" | "rate_limited" | "timeout";
  latencyMs: number;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  requestId?: string;
  errorCode?: string;
  metadata?: Record<string, unknown>;
};

export class AnalyticsEventRepository {
  async create(input: AnalyticsEventInput) {
    await connectToDatabase();
    await AnalyticsEventModel.create({
      ...input,
      eventTime: input.eventTime ?? new Date(),
      properties: input.properties ?? {},
    });
  }

  async createApiUsage(input: ApiUsageInput) {
    await connectToDatabase();
    await APIUsageLogModel.create({
      ...input,
      promptTokens: input.promptTokens,
      completionTokens: input.completionTokens,
      totalTokens: input.totalTokens,
      metadata: input.metadata ?? {},
    });
  }

  async getOverview(days = 30) {
    await connectToDatabase();
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [
      eventCounts,
      actionCounts,
      latency,
      latencySamples,
      aiUsage,
      sessionStats,
      topGenres,
      topTones,
      abandonBuckets,
    ] = await Promise.all([
      AnalyticsEventModel.aggregate([
        { $match: { eventTime: { $gte: since } } },
        { $group: { _id: "$eventType", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      AnalyticsEventModel.aggregate([
        {
          $match: {
            eventTime: { $gte: since },
            eventType: { $in: ["choice_selected", "custom_action_submitted"] },
          },
        },
        { $group: { _id: "$eventType", count: { $sum: 1 } } },
      ]),
      AnalyticsEventModel.aggregate([
        { $match: { eventTime: { $gte: since }, eventType: "turn_generation_latency" } },
        {
          $group: {
            _id: null,
            averageMs: { $avg: "$properties.latencyMs" },
          },
        },
      ]),
      AnalyticsEventModel.find(
        { eventTime: { $gte: since }, eventType: "turn_generation_latency" },
        { "properties.latencyMs": 1, _id: 0 },
      )
        .sort({ eventTime: -1 })
        .limit(1000)
        .lean(),
      APIUsageLogModel.aggregate([
        { $match: { createdAt: { $gte: since } } },
        {
          $group: {
            _id: { provider: "$provider", model: "$model" },
            requests: { $sum: 1 },
            failures: { $sum: { $cond: [{ $eq: ["$status", "success"] }, 0, 1] } },
            promptTokens: { $sum: { $ifNull: ["$promptTokens", 0] } },
            completionTokens: { $sum: { $ifNull: ["$completionTokens", 0] } },
            totalTokens: { $sum: { $ifNull: ["$totalTokens", 0] } },
            averageLatencyMs: { $avg: "$latencyMs" },
          },
        },
        { $sort: { requests: -1 } },
      ]),
      StorySessionModel.aggregate([
        {
          $group: {
            _id: null,
            totalSessions: { $sum: 1 },
            averageSessionLengthTurns: { $avg: "$currentTurn" },
            activeSessions: {
              $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] },
            },
            pausedSessions: {
              $sum: { $cond: [{ $eq: ["$status", "paused"] }, 1, 0] },
            },
          },
        },
      ]),
      StorySessionModel.aggregate([
        { $group: { _id: "$genre", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 },
      ]),
      StorySessionModel.aggregate([
        { $group: { _id: "$tone", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 },
      ]),
      StorySessionModel.aggregate([
        {
          $bucket: {
            groupBy: "$currentTurn",
            boundaries: [0, 1, 2, 4, 8, 16, 100000],
            default: "unknown",
            output: { count: { $sum: 1 } },
          },
        },
      ]),
    ]);

    const choiceCount = Number(
      actionCounts.find((entry) => entry._id === "choice_selected")?.count ?? 0,
    );
    const customActionCount = Number(
      actionCounts.find((entry) => entry._id === "custom_action_submitted")?.count ?? 0,
    );
    const totalActions = choiceCount + customActionCount;

    return {
      windowDays: days,
      eventCounts: eventCounts.map((entry) => ({
        eventType: String(entry._id),
        count: Number(entry.count),
      })),
      actionMix: {
        choiceCount,
        customActionCount,
        customActionPercent: totalActions > 0 ? Math.round((customActionCount / totalActions) * 100) : 0,
        choicePercent: totalActions > 0 ? Math.round((choiceCount / totalActions) * 100) : 0,
      },
      generationLatency: {
        averageMs: Math.round(Number(latency[0]?.averageMs ?? 0)),
        p95Ms: calculateP95(
          latencySamples.map((entry) => Number(entry.properties?.latencyMs ?? 0)),
        ),
      },
      aiUsage: aiUsage.map((entry) => ({
        provider: String(entry._id.provider),
        model: String(entry._id.model),
        requests: Number(entry.requests),
        failures: Number(entry.failures),
        promptTokens: Number(entry.promptTokens),
        completionTokens: Number(entry.completionTokens),
        totalTokens: Number(entry.totalTokens),
        averageLatencyMs: Math.round(Number(entry.averageLatencyMs ?? 0)),
      })),
      sessions: {
        totalSessions: Number(sessionStats[0]?.totalSessions ?? 0),
        averageSessionLengthTurns: Number(
          Number(sessionStats[0]?.averageSessionLengthTurns ?? 0).toFixed(1),
        ),
        activeSessions: Number(sessionStats[0]?.activeSessions ?? 0),
        pausedSessions: Number(sessionStats[0]?.pausedSessions ?? 0),
      },
      topGenres: topGenres.map((entry) => ({ label: String(entry._id), count: Number(entry.count) })),
      topTones: topTones.map((entry) => ({ label: String(entry._id), count: Number(entry.count) })),
      abandonBuckets: abandonBuckets.map((entry) => ({
        bucket: formatTurnBucket(entry._id),
        count: Number(entry.count),
      })),
    };
  }
}

function calculateP95(values: number[]) {
  const sorted = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (sorted.length === 0) {
    return 0;
  }

  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1);
  return Math.round(sorted[index]);
}

function formatTurnBucket(bucket: unknown) {
  if (bucket === 0) {
    return "Before first turn";
  }
  if (bucket === 1) {
    return "After opening";
  }
  if (bucket === 2) {
    return "Turns 2-3";
  }
  if (bucket === 4) {
    return "Turns 4-7";
  }
  if (bucket === 8) {
    return "Turns 8-15";
  }
  if (bucket === 16) {
    return "16+ turns";
  }
  return "Unknown";
}
