import { ApiError } from "@/server/api/errors/api-error";
import {
  AI_PROVIDER_CATALOG,
  getProviderDefaultModel,
  isProviderModelSupported,
  normalizeProviderModelId,
} from "@/lib/ai/provider-catalog";
import { getRecommendedTaskModel } from "@/server/ai/task-profile";
import {
  USER_AI_PROVIDERS,
  USER_AI_TASKS,
} from "@/server/persistence/shared/constants";
import { UserAISettingsRepository } from "@/server/persistence/repositories/user-ai-settings-repository";
import type {
  AiProviderCredentials,
  AiRoute,
} from "@/server/ai/types";
import type {
  UserAIProvider,
  UserAITask,
  AIReasoningEffort,
} from "@/server/persistence/types/data-models";
import {
  decryptSecret,
  encryptSecret,
  maskSecret,
} from "@/server/security/secret-encryption";
import { AiCredentialDecryptError } from "@/server/ai/errors";
import type { UpdateUserAISettingsInput } from "@/server/validation/api-schemas";

type StoredProvider = {
  provider: UserAIProvider;
  isEnabled?: boolean;
  hasApiKey?: boolean;
  encryptedApiKey?: string;
  apiKeyMasked?: string;
  baseUrl?: string;
  defaultModel?: string;
  reasoningEffort?: AIReasoningEffort;
  taskModels?:
    | Map<string, { model?: string; reasoningEffort?: AIReasoningEffort }>
    | Record<string, { model?: string; reasoningEffort?: AIReasoningEffort }>;
  headers?: {
    organizationId?: string;
    projectId?: string;
  };
  createdAt?: Date;
  updatedAt?: Date;
};

type StoredSettings = {
  userId: unknown;
  defaultProvider?: UserAIProvider;
  providers?: StoredProvider[];
  taskOverrides?:
    | Map<
        string,
        { provider?: UserAIProvider; model?: string; reasoningEffort?: AIReasoningEffort }
      >
    | Record<
        string,
        { provider?: UserAIProvider; model?: string; reasoningEffort?: AIReasoningEffort }
      >;
  createdAt?: Date;
  updatedAt?: Date;
};

export class UserAISettingsService {
  constructor(private readonly repository = new UserAISettingsRepository()) {}

  async getUserAISettings(userId: string) {
    const settings = await this.repository.upsertDefault(userId);
    return this.present(settings as StoredSettings);
  }

  async updateUserAISettings(userId: string, payload: UpdateUserAISettingsInput) {
    const existing = (await this.repository.findByUserId(userId, true)) as StoredSettings | null;
    const existingProviders = new Map(
      (existing?.providers ?? []).map((provider) => [provider.provider, provider]),
    );

    const providers = new Map<UserAIProvider, StoredProvider>();
    for (const provider of existing?.providers ?? []) {
      providers.set(provider.provider, provider);
    }

    for (const input of payload.providers ?? []) {
      const current = existingProviders.get(input.provider);
      const apiKeyUpdate = buildApiKeyUpdate(
        {
          provider: input.provider,
          newApiKey: input.newApiKey ?? input.apiKey,
          replaceApiKey: Boolean(input.replaceApiKey),
          clearApiKey: Boolean(input.clearApiKey),
        },
        current,
      );

      providers.set(input.provider, {
        provider: input.provider,
        isEnabled: input.isEnabled ?? current?.isEnabled ?? false,
        hasApiKey: apiKeyUpdate.hasApiKey,
        encryptedApiKey: apiKeyUpdate.encryptedApiKey,
        apiKeyMasked: apiKeyUpdate.apiKeyMasked,
        baseUrl: input.baseUrl === undefined ? current?.baseUrl : input.baseUrl ?? undefined,
        defaultModel:
          input.defaultModel === undefined
            ? current?.defaultModel
            : input.defaultModel ?? undefined,
        reasoningEffort:
          input.reasoningEffort === undefined
            ? current?.reasoningEffort
            : input.reasoningEffort ?? undefined,
        taskModels: input.taskModels ?? current?.taskModels ?? {},
        headers:
          input.headers === undefined
            ? normalizeHeaders(current?.headers)
            : normalizeHeaders(input.headers),
      });
    }

    const taskOverrides = normalizeTaskOverrides(existing?.taskOverrides);
    for (const [task, assignment] of Object.entries(payload.taskOverrides ?? {})) {
      if (!assignment) {
        delete taskOverrides[task as UserAITask];
      } else {
        taskOverrides[task as UserAITask] = assignment;
      }
    }

    const defaultProvider =
      payload.defaultProvider === null
        ? undefined
        : payload.defaultProvider ?? existing?.defaultProvider ?? undefined;

    validateAssignments(defaultProvider, providers, taskOverrides);

    const updated = await this.repository.update(userId, {
      defaultProvider,
      providers: Array.from(providers.values()),
      taskOverrides,
    });

    return this.present(updated as StoredSettings);
  }

  async isProviderConfigured(userId: string, provider: UserAIProvider) {
    const settings = (await this.repository.findByUserId(userId, true)) as StoredSettings | null;
    const stored = settings?.providers?.find((entry) => entry.provider === provider);
    return Boolean(stored?.isEnabled && stored.encryptedApiKey);
  }

  async resolveTaskAssignment(userId: string, task: UserAITask): Promise<{
    provider: UserAIProvider;
    model: string;
    apiKey: string;
    baseUrl?: string;
    headers: AiProviderCredentials["headers"];
    reasoningEffort?: AIReasoningEffort;
    source: Extract<AiRoute["source"], "task_override" | "default_provider" | "first_configured">;
  } | null> {
    const settings = (await this.repository.findByUserId(userId, true)) as StoredSettings | null;
    if (!settings) {
      return null;
    }

    const providers = settings.providers ?? [];
    const overrides = normalizeTaskOverrides(settings.taskOverrides);
    const override = overrides[task];
    const overrideProvider = override
      ? providers.find((entry) => entry.provider === override.provider)
      : undefined;
    const defaultProvider = settings.defaultProvider
      ? providers.find((entry) => entry.provider === settings.defaultProvider)
      : undefined;
    const firstConfiguredProvider = providers.find(isUsableProvider);
    const provider = [overrideProvider, defaultProvider, firstConfiguredProvider].find(
      isUsableProvider,
    );

    if (!provider) {
      return null;
    }

    const providerTaskConfig = normalizeTaskModels(provider.taskModels)[task];
    const source =
      overrideProvider && provider.provider === overrideProvider.provider
        ? "task_override"
        : defaultProvider && provider.provider === defaultProvider.provider
          ? "default_provider"
          : "first_configured";

    let apiKey: string;
    try {
      apiKey = decryptSecret(provider.encryptedApiKey);
    } catch (error) {
      throw new AiCredentialDecryptError(
        `The saved ${provider.provider} API key could not be decrypted.`,
        {
          provider: provider.provider,
          userId,
          task,
          source,
          reason: error instanceof Error ? error.message : String(error),
        },
      );
    }

    return {
      provider: provider.provider,
      model: resolveProviderModel(
        provider.provider,
        (source === "task_override" ? override?.model : undefined) ??
          providerTaskConfig?.model ??
          getRecommendedTaskModel(provider.provider, task) ??
          provider.defaultModel ??
          defaultModelForProvider(provider.provider),
        task,
      ),
      reasoningEffort:
        (source === "task_override" ? override?.reasoningEffort : undefined) ??
        providerTaskConfig?.reasoningEffort ??
        provider.reasoningEffort,
      apiKey,
      baseUrl: provider.baseUrl,
      headers: provider.headers ?? {},
      source,
    };
  }

  private present(settings: StoredSettings) {
    const providers = new Map(
      (settings.providers ?? []).map((provider) => [provider.provider, provider]),
    );

    return {
      defaultProvider: settings.defaultProvider ?? null,
      providers: USER_AI_PROVIDERS.map((providerName) => {
        const provider = providers.get(providerName);
        return {
          provider: providerName,
          isEnabled: Boolean(provider?.isEnabled),
          hasApiKey: hasStoredApiKey(provider),
          apiKeyMasked: provider?.apiKeyMasked ?? null,
          baseUrl: provider?.baseUrl ?? null,
          defaultModel: provider?.defaultModel ?? null,
          reasoningEffort: provider?.reasoningEffort ?? null,
          taskModels: normalizeTaskModels(provider?.taskModels),
          headers: normalizeHeaders(provider?.headers),
          updatedAt: provider?.updatedAt ? new Date(provider.updatedAt).toISOString() : null,
        };
      }),
      taskOverrides: normalizeTaskOverrides(settings.taskOverrides),
      supportedProviders: USER_AI_PROVIDERS,
      supportedTasks: USER_AI_TASKS,
      providerCatalog: Object.fromEntries(
        USER_AI_PROVIDERS.map((provider) => [provider, AI_PROVIDER_CATALOG[provider]]),
      ),
      fallbackStrategy:
        "task override provider/model -> default provider provider task model -> provider default model -> first enabled configured provider -> global server provider",
      updatedAt: settings.updatedAt ? new Date(settings.updatedAt).toISOString() : null,
    };
  }
}

function buildApiKeyUpdate(
  input: {
    provider: UserAIProvider;
    newApiKey?: string;
    replaceApiKey: boolean;
    clearApiKey: boolean;
  },
  current?: StoredProvider,
) {
  if (input.clearApiKey) {
    return { hasApiKey: false, encryptedApiKey: undefined, apiKeyMasked: undefined };
  }

  const nextApiKey = input.newApiKey?.trim();

  if (nextApiKey) {
    return {
      hasApiKey: true,
      encryptedApiKey: encryptSecret(nextApiKey),
      apiKeyMasked: maskSecret(nextApiKey),
    };
  }

  if (input.replaceApiKey) {
    throw new ApiError(
      "Paste a new API key before replacing the saved key.",
      400,
      "INVALID_AI_SETTINGS",
      {
          fieldErrors: {
            providers: {
              [input.provider]:
                "Paste a new API key before replacing the currently saved key.",
            },
          },
        },
      );
  }

  return {
    hasApiKey: hasStoredApiKey(current),
    encryptedApiKey: current?.encryptedApiKey,
    apiKeyMasked: current?.apiKeyMasked,
  };
}

function normalizeHeaders(
  headers?: {
    organizationId?: string | null;
    projectId?: string | null;
  },
) {
  return {
    organizationId: headers?.organizationId || undefined,
    projectId: headers?.projectId || undefined,
  };
}

function normalizeTaskModels(
  taskModels?: StoredProvider["taskModels"],
): Partial<Record<UserAITask, { model: string; reasoningEffort?: AIReasoningEffort }>> {
  const entries =
    taskModels instanceof Map ? Array.from(taskModels.entries()) : Object.entries(taskModels ?? {});

  return Object.fromEntries(
    entries
      .filter(
        ([task, value]) =>
          isKnownTask(task) && (value?.model || value?.reasoningEffort),
      )
      .map(([task, value]) => [
        task,
        {
          ...(value?.model ? { model: String(value.model) } : {}),
          ...(value?.reasoningEffort ? { reasoningEffort: value.reasoningEffort } : {}),
        },
      ]),
  ) as Partial<Record<UserAITask, { model: string; reasoningEffort?: AIReasoningEffort }>>;
}

function normalizeTaskOverrides(
  taskOverrides?: StoredSettings["taskOverrides"],
): Partial<
  Record<UserAITask, { provider: UserAIProvider; model?: string; reasoningEffort?: AIReasoningEffort }>
> {
  const entries =
    taskOverrides instanceof Map
      ? Array.from(taskOverrides.entries())
      : Object.entries(taskOverrides ?? {});

  return Object.fromEntries(
    entries
      .filter(([task, value]) => isKnownTask(task) && isKnownProvider(value?.provider))
      .map(([task, value]) => [
        task,
        {
          provider: value!.provider!,
          model: value!.model,
          reasoningEffort: value!.reasoningEffort,
        },
      ]),
  ) as Partial<
    Record<UserAITask, { provider: UserAIProvider; model?: string; reasoningEffort?: AIReasoningEffort }>
  >;
}

function validateAssignments(
  defaultProvider: UserAIProvider | null | undefined,
  providers: Map<UserAIProvider, StoredProvider>,
  taskOverrides: Partial<
    Record<UserAITask, { provider: UserAIProvider; model?: string; reasoningEffort?: AIReasoningEffort }>
  >,
) {
  if (defaultProvider && !providers.has(defaultProvider)) {
    throw new ApiError("Default provider must be included in provider settings.", 400, "INVALID_AI_SETTINGS");
  }

  if (defaultProvider) {
    const provider = providers.get(defaultProvider);
    if (!hasUsableConfiguration(provider)) {
      throw new ApiError(
        "Your default AI provider must be enabled and have a saved API key.",
        400,
        "INVALID_AI_SETTINGS",
        {
          fieldErrors: {
            defaultProvider:
              "Choose a provider that is enabled and has a saved API key before making it the default.",
          },
        },
      );
    }

    validateProviderModelSelection(defaultProvider, provider?.defaultModel, "defaultProvider");
  }

  for (const [task, assignment] of Object.entries(taskOverrides)) {
    if (assignment && !providers.has(assignment.provider)) {
      throw new ApiError(
        "Task override provider must be included in provider settings.",
        400,
        "INVALID_AI_SETTINGS",
      );
    }

    if (assignment) {
      const provider = providers.get(assignment.provider);
      if (!hasUsableConfiguration(provider)) {
        throw new ApiError(
          `The provider selected for ${task} must be enabled and have a saved API key.`,
          400,
          "INVALID_AI_SETTINGS",
          {
            fieldErrors: {
              taskOverrides: {
                [task]:
                  "Save an API key and enable this provider before routing the task to it.",
              },
            },
          },
        );
      }

      validateProviderModelSelection(assignment.provider, assignment.model, task);
    }
  }

  for (const [providerName, provider] of providers.entries()) {
    validateProviderModelSelection(providerName, provider.defaultModel, providerName);

    const taskModels = normalizeTaskModels(provider.taskModels);
    for (const [task, config] of Object.entries(taskModels)) {
      validateProviderModelSelection(providerName, config.model, task);
    }
  }
}

function isKnownTask(value: string): value is UserAITask {
  return (USER_AI_TASKS as readonly string[]).includes(value);
}

function isKnownProvider(value: unknown): value is UserAIProvider {
  return typeof value === "string" && (USER_AI_PROVIDERS as readonly string[]).includes(value);
}

function isUsableProvider(provider?: StoredProvider): provider is StoredProvider & {
  encryptedApiKey: string;
} {
  return Boolean(provider?.isEnabled && provider.encryptedApiKey);
}

function hasStoredApiKey(provider?: StoredProvider) {
  return Boolean(provider?.hasApiKey || provider?.encryptedApiKey || provider?.apiKeyMasked);
}

function hasUsableConfiguration(provider?: StoredProvider) {
  return Boolean(provider?.isEnabled && hasStoredApiKey(provider));
}

function defaultModelForProvider(provider: UserAIProvider) {
  return getProviderDefaultModel(provider);
}

function resolveProviderModel(
  provider: UserAIProvider,
  model: string,
  task: UserAITask,
) {
  const normalized = normalizeProviderModelId(provider, model);
  if (!isProviderModelSupported(provider, normalized)) {
    throw new ApiError(
      `The selected ${provider} model is no longer supported for ${task}.`,
      400,
      "AI_MODEL_NOT_SUPPORTED",
      {
        fieldErrors: {
          taskOverrides: {
            [task]: "Choose a currently supported model for this task and save settings again.",
          },
        },
        provider,
        model,
        normalizedModel: normalized,
        task,
      },
    );
  }

  return normalized;
}

function validateProviderModelSelection(
  provider: UserAIProvider,
  model: string | undefined,
  field: string,
) {
  if (!model) {
    return;
  }

  if (isProviderModelSupported(provider, model)) {
    return;
  }

  throw new ApiError(
    `The selected model ${model} is not supported by ${provider}.`,
    400,
    "AI_MODEL_NOT_SUPPORTED",
    {
      fieldErrors:
        field === "defaultProvider"
          ? {
              defaultProvider:
                "Choose a supported model for the selected default provider.",
            }
          : {
              taskOverrides: {
                [field]:
                  "Choose a supported model for this task and save again.",
              },
            },
      provider,
      model,
      normalizedModel: normalizeProviderModelId(provider, model),
      field,
    },
  );
}
