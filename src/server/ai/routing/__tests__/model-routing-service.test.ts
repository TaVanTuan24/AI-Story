import { describe, expect, it } from "vitest";

import { ModelRoutingService } from "@/server/ai/routing/model-routing-service";
import type { UserAIProvider, UserAITask } from "@/server/persistence/types/data-models";

describe("ModelRoutingService", () => {
  it("resolves the user task-specific provider and model for an AI task", async () => {
    const service = new ModelRoutingService(
      fakeSettingsService({
        provider: "anthropic",
        model: "claude-sonnet-4-20250514",
        task: "next_scene",
        source: "task_override",
      }),
    );

    const route = await service.resolveRoute({
      userId: "user-1",
      task: "generateNextScene",
      allowAppFallback: false,
    });

    expect(route).toMatchObject({
      task: "next_scene",
      provider: "anthropic",
      model: "claude-sonnet-4-20250514",
      source: "task_override",
    });
    expect(route.credentials?.apiKey).toBe("user-secret");
  });

  it("falls back from missing task override to a user's default provider route", async () => {
    const service = new ModelRoutingService(
      fakeSettingsService({
        provider: "openai",
        model: "gpt-5.4-mini",
        task: "summarization",
        source: "default_provider",
      }),
    );

    const route = await service.resolveRoute({
      userId: "user-1",
      task: "summarizeTurns",
      allowAppFallback: false,
    });

    expect(route).toMatchObject({
      task: "summarization",
      provider: "openai",
      model: "gpt-5.4-mini",
      source: "default_provider",
    });
  });

  it("routes any narrative task to xAI when the user assigns Grok", async () => {
    const service = new ModelRoutingService(
      fakeSettingsService({
        provider: "xai",
        model: "grok-4.20-reasoning",
        task: "opening_scene",
        source: "task_override",
      }),
    );

    const route = await service.resolveRoute({
      userId: "user-1",
      task: "generateOpeningScene",
      allowAppFallback: false,
    });

    expect(route).toMatchObject({
      task: "opening_scene",
      provider: "xai",
      model: "grok-4.20-reasoning",
      source: "task_override",
    });
    expect(route.credentials?.apiKey).toBe("user-secret");
  });

  it("fails clearly when no user route exists and app fallback is disabled", async () => {
    const service = new ModelRoutingService(fakeSettingsService(null));

    await expect(
      service.resolveRoute({
        userId: "user-1",
        task: "generateWorld",
        allowAppFallback: false,
      }),
    ).rejects.toMatchObject({
      code: "AI_ROUTE_NOT_CONFIGURED",
      status: 503,
    });
  });

  it("marks custom OpenAI-compatible base URLs with compatibility capabilities", async () => {
    const service = new ModelRoutingService(
      fakeSettingsService({
        provider: "openai",
        model: "gpt-5.4",
        task: "opening_scene",
        source: "task_override",
        baseUrl: "https://api.krouter.net/v1",
        reasoningEffort: "high",
      }),
    );

    const route = await service.resolveRoute({
      userId: "user-1",
      task: "generateOpeningScene",
      allowAppFallback: false,
    });

    expect(route).toMatchObject({
      provider: "openai",
      model: "gpt-5.4",
      reasoningEffort: "high",
      capabilities: {
        wireApi: "responses",
        supportsNativeStrictJson: false,
        supportsReasoningEffort: true,
        isOpenAiCompatible: true,
      },
    });
    expect(route.credentials?.baseUrl).toBe("https://api.krouter.net/v1");
  });
});

function fakeSettingsService(
  route: {
    provider: UserAIProvider;
    model: string;
    task: UserAITask;
    source: "task_override" | "default_provider" | "first_configured";
    baseUrl?: string;
    reasoningEffort?: "low" | "medium" | "high";
  } | null,
) {
  return {
    async resolveTaskAssignment(_userId: string, task: UserAITask) {
      if (!route || route.task !== task) {
        return null;
      }

      return {
        provider: route.provider,
        model: route.model,
        apiKey: "user-secret",
        baseUrl: route.baseUrl,
        reasoningEffort: route.reasoningEffort,
        headers: {},
        source: route.source,
      };
    },
  } as never;
}
