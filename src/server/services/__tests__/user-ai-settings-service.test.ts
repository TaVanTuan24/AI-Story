import { describe, expect, it } from "vitest";

import { UserAISettingsService } from "@/server/services/user-ai-settings-service";
import type { UserAIProvider, UserAITask } from "@/server/persistence/types/data-models";

describe("UserAISettingsService", () => {
  it("saves a new key and returns only masked key metadata", async () => {
    const repository = new InMemoryUserAISettingsRepository();
    const service = new UserAISettingsService(repository as never);

    const saved = await service.updateUserAISettings("user-1", {
      providers: [
        {
          provider: "xai",
          isEnabled: true,
          newApiKey: "xai-secret-9876",
          defaultModel: "grok-4.20-reasoning",
        },
      ],
    });

    expect(saved.providers.find((provider) => provider.provider === "xai")).toMatchObject({
      isEnabled: true,
      hasApiKey: true,
      apiKeyMasked: "xai-****9876",
      defaultModel: "grok-4.20-reasoning",
    });
    expect(JSON.stringify(saved)).not.toContain("xai-secret-9876");
  });

  it("preserves a saved key on unrelated updates", async () => {
    const repository = new InMemoryUserAISettingsRepository();
    const service = new UserAISettingsService(repository as never);

    await service.updateUserAISettings("user-1", {
      providers: [
        {
          provider: "openai",
          isEnabled: true,
          newApiKey: "sk-openai-test-1234",
          defaultModel: "gpt-5.4",
        },
      ],
    });

    const updated = await service.updateUserAISettings("user-1", {
      defaultProvider: "openai",
      taskOverrides: {
        next_scene: {
          provider: "openai",
          model: "gpt-5.4",
        },
      },
    });

    expect(updated.providers.find((provider) => provider.provider === "openai")).toMatchObject({
      hasApiKey: true,
      apiKeyMasked: "sk-****1234",
      defaultModel: "gpt-5.4",
    });

    await expectResolved(service, "user-1", "next_scene", {
      provider: "openai",
      model: "gpt-5.4",
      source: "task_override",
      apiKey: "sk-openai-test-1234",
    });
  });

  it("replaces a saved key only when a new key is provided", async () => {
    const repository = new InMemoryUserAISettingsRepository();
    const service = new UserAISettingsService(repository as never);

    await service.updateUserAISettings("user-1", {
      providers: [
        {
          provider: "xai",
          isEnabled: true,
          newApiKey: "xai-secret-1111",
          defaultModel: "grok-4",
        },
      ],
    });

    const replaced = await service.updateUserAISettings("user-1", {
      providers: [
        {
          provider: "xai",
          replaceApiKey: true,
          newApiKey: "xai-secret-2222",
        },
      ],
    });

    expect(replaced.providers.find((provider) => provider.provider === "xai")).toMatchObject({
      hasApiKey: true,
      apiKeyMasked: "xai-****2222",
    });

    await expectResolved(service, "user-1", "recap", {
      provider: "xai",
      model: "grok-3-mini",
      source: "first_configured",
      apiKey: "xai-secret-2222",
    });
  });

  it("removes a saved key when clearApiKey is set", async () => {
    const repository = new InMemoryUserAISettingsRepository();
    const service = new UserAISettingsService(repository as never);

    await service.updateUserAISettings("user-1", {
      providers: [
        {
          provider: "openai",
          isEnabled: true,
          newApiKey: "sk-openai-test-1234",
          defaultModel: "gpt-5.4-mini",
        },
      ],
    });

    const cleared = await service.updateUserAISettings("user-1", {
      providers: [
        {
          provider: "openai",
          clearApiKey: true,
        },
      ],
    });

    expect(cleared.providers.find((provider) => provider.provider === "openai")).toMatchObject({
      hasApiKey: false,
      apiKeyMasked: null,
    });
    await expect(service.resolveTaskAssignment("user-1", "next_scene")).resolves.toBeNull();
  });

  it("treats masked saved keys as configured even when encrypted secrets are not loaded", async () => {
    const repository = new InMemoryUserAISettingsRepository({
      "user-1": {
        userId: "user-1",
        providers: [
          {
            provider: "xai",
            isEnabled: true,
            hasApiKey: true,
            apiKeyMasked: "xai-****9876",
            defaultModel: "grok-4.20-reasoning",
            headers: {},
            taskModels: {},
          },
        ],
        taskOverrides: {},
      },
    });
    const service = new UserAISettingsService(repository as never);

    const presented = await service.getUserAISettings("user-1");

    expect(presented.providers.find((provider) => provider.provider === "xai")).toMatchObject({
      hasApiKey: true,
      apiKeyMasked: "xai-****9876",
    });
  });

  it("resolves provider and model with task override, provider task model, and first configured fallback", async () => {
    const repository = new InMemoryUserAISettingsRepository({
      "user-1": {
        userId: "user-1",
        defaultProvider: "openai",
        providers: [
          {
            provider: "openai",
            isEnabled: true,
            hasApiKey: true,
            encryptedApiKey: "placeholder",
            apiKeyMasked: "sk-****1234",
            defaultModel: "gpt-5.4",
            taskModels: {
              next_scene: { model: "gpt-5.4-mini" },
            },
            headers: {},
          },
          {
            provider: "xai",
            isEnabled: true,
            hasApiKey: true,
            encryptedApiKey: "placeholder-xai",
            apiKeyMasked: "xai-****9876",
            defaultModel: "grok-4",
            taskModels: {},
            headers: {},
          },
        ],
        taskOverrides: {
          consistency_check: {
            provider: "xai",
            model: "grok-3-mini",
          },
        },
      },
    });
    const service = new UserAISettingsService(repository as never);

    await service.updateUserAISettings("user-1", {
      providers: [
        { provider: "openai", newApiKey: "sk-openai-test-1234" },
        { provider: "xai", newApiKey: "xai-secret-9876" },
      ],
    });

    await expectResolved(service, "user-1", "consistency_check", {
      provider: "xai",
      model: "grok-3-mini",
      source: "task_override",
      apiKey: "xai-secret-9876",
    });
    await expectResolved(service, "user-1", "next_scene", {
      provider: "openai",
      model: "gpt-5.4-mini",
      source: "default_provider",
      apiKey: "sk-openai-test-1234",
    });
  });

  it("supports custom OpenAI-compatible base URLs with persisted reasoning effort", async () => {
    const repository = new InMemoryUserAISettingsRepository();
    const service = new UserAISettingsService(repository as never);

    await service.updateUserAISettings("user-1", {
      providers: [
        {
          provider: "openai",
          isEnabled: true,
          newApiKey: "sk-krouter-test-1234",
          baseUrl: "https://api.krouter.net/v1",
          defaultModel: "gpt-5.4",
          reasoningEffort: "high",
        },
      ],
      defaultProvider: "openai",
    });

    await expect(service.getUserAISettings("user-1")).resolves.toMatchObject({
      providers: expect.arrayContaining([
        expect.objectContaining({
          provider: "openai",
          baseUrl: "https://api.krouter.net/v1",
          defaultModel: "gpt-5.4",
          reasoningEffort: "high",
        }),
      ]),
    });

    await expect(service.resolveTaskAssignment("user-1", "opening_scene")).resolves.toMatchObject({
      provider: "openai",
      model: "gpt-5.4",
      baseUrl: "https://api.krouter.net/v1",
      reasoningEffort: "high",
      source: "default_provider",
    });
  });
});

async function expectResolved(
  service: UserAISettingsService,
  userId: string,
  task: UserAITask,
  expected: {
    provider: UserAIProvider;
    model: string;
    source: "task_override" | "default_provider" | "first_configured";
    apiKey: string;
  },
) {
  await expect(service.resolveTaskAssignment(userId, task)).resolves.toMatchObject(expected);
}

class InMemoryUserAISettingsRepository {
  constructor(private readonly records: Record<string, Record<string, unknown>> = {}) {}

  async upsertDefault(userId: string) {
    const existing = this.records[userId];
    if (existing) {
      return structuredClone(existing);
    }

    const created = {
      userId,
      providers: [],
      taskOverrides: {},
    };
    this.records[userId] = created;
    return structuredClone(created);
  }

  async findByUserId(userId: string) {
    return this.records[userId] ? structuredClone(this.records[userId]) : null;
  }

  async update(userId: string, input: Record<string, unknown>) {
    const current = (await this.upsertDefault(userId)) as Record<string, unknown>;
    const updated = {
      ...current,
      ...structuredClone(input),
    };
    this.records[userId] = updated;
    return structuredClone(updated);
  }
}
