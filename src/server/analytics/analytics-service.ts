import { logger, serializeError } from "@/server/logging/logger";
import { AnalyticsEventRepository } from "@/server/persistence/repositories/analytics-event-repository";
import type { AnalyticsEventType } from "@/server/persistence/types/data-models";
import type { AiUsageHook } from "@/server/ai/types";

export type AnalyticsTracker = {
  track(input: {
    eventType: AnalyticsEventType;
    userId?: string;
    storySessionId?: string;
    properties?: Record<string, unknown>;
  }): Promise<void>;
  trackAiUsage: AiUsageHook;
};

export class AnalyticsService implements AnalyticsTracker {
  constructor(private readonly repository = new AnalyticsEventRepository()) {}

  async track(input: {
    eventType: AnalyticsEventType;
    userId?: string;
    storySessionId?: string;
    properties?: Record<string, unknown>;
  }) {
    try {
      await this.repository.create({
        userId: input.userId,
        storySessionId: input.storySessionId,
        eventType: input.eventType,
        properties: sanitizeProperties(input.properties ?? {}),
      });
    } catch (error) {
      logger.warn("analytics.track_failed", {
        eventType: input.eventType,
        error: serializeError(error),
      });
    }
  }

  trackAiUsage: AiUsageHook = async (entry) => {
    try {
      await this.repository.createApiUsage({
        provider: entry.provider,
        model: entry.model,
        operation: entry.task,
        status: entry.success ? "success" : "error",
        latencyMs: entry.latencyMs,
        promptTokens: entry.usage?.inputTokens,
        completionTokens: entry.usage?.outputTokens,
        totalTokens: entry.usage?.totalTokens,
        requestId: entry.requestId,
        metadata: {
          attempts: entry.attempts,
          promptVersion: entry.metadata?.promptVersion,
        },
      });

      await this.track({
        eventType: "ai_provider_usage",
        properties: {
          provider: entry.provider,
          model: entry.model,
          task: entry.task,
          latencyMs: entry.latencyMs,
          attempts: entry.attempts,
          success: entry.success,
        },
      });

      if (entry.usage?.totalTokens) {
        await this.track({
          eventType: "token_usage",
          properties: {
            provider: entry.provider,
            model: entry.model,
            task: entry.task,
            promptTokens: entry.usage.inputTokens ?? 0,
            completionTokens: entry.usage.outputTokens ?? 0,
            totalTokens: entry.usage.totalTokens,
          },
        });
      }
    } catch (error) {
      logger.warn("analytics.ai_usage_failed", {
        error: serializeError(error),
      });
    }
  };

  getOverview(days?: number) {
    return this.repository.getOverview(days);
  }
}

function sanitizeProperties(properties: Record<string, unknown>) {
  const blockedKeys = new Set(["email", "displayName", "password", "token", "rawActionInput"]);
  return Object.fromEntries(
    Object.entries(properties).filter(([key]) => !blockedKeys.has(key)),
  );
}

export const analytics = new AnalyticsService();
