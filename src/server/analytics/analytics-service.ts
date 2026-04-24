import {
  estimateModelUsageCostUsd,
  type AIProviderCatalogName,
} from "@/lib/ai/provider-catalog";
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
      const provider = normalizeCatalogProvider(entry.provider);
      const estimatedCostUsd = provider
        ? estimateModelUsageCostUsd(provider, entry.model, {
            inputTokens: entry.usage?.inputTokens,
            outputTokens: entry.usage?.outputTokens,
          })
        : undefined;
      const metadata = (entry.metadata ?? {}) as Record<string, unknown>;

      await this.repository.createApiUsage({
        userId: typeof metadata.userId === "string" ? metadata.userId : undefined,
        storySessionId:
          typeof metadata.storySessionId === "string" ? metadata.storySessionId : undefined,
        provider: entry.provider,
        model: entry.model,
        operation: entry.task,
        status: entry.success ? "success" : "error",
        latencyMs: entry.latencyMs,
        promptTokens: entry.usage?.inputTokens,
        completionTokens: entry.usage?.outputTokens,
        totalTokens: entry.usage?.totalTokens,
        estimatedCostUsd,
        requestId: entry.requestId,
        metadata: {
          attempts: entry.attempts,
          promptVersion: entry.metadata?.promptVersion,
          routeSource: entry.metadata?.routeSource,
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
            estimatedCostUsd,
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

function normalizeCatalogProvider(provider: string): AIProviderCatalogName | null {
  return provider === "openai" ||
    provider === "anthropic" ||
    provider === "google_gemini" ||
    provider === "xai"
    ? provider
    : null;
}

function sanitizeProperties(properties: Record<string, unknown>) {
  const blockedKeys = new Set(["email", "displayName", "password", "token", "rawActionInput"]);
  return Object.fromEntries(
    Object.entries(properties).filter(([key]) => !blockedKeys.has(key)),
  );
}

export const analytics = new AnalyticsService();
