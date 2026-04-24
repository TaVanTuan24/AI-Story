import { env } from "@/lib/config/env";
import {
  isProviderModelSupported,
  normalizeProviderModelId,
} from "@/lib/ai/provider-catalog";
import { resolveTaskReasoningEffort } from "@/server/ai/task-profile";
import { getRecommendedTaskModel } from "@/server/ai/task-profile";
import { ApiError } from "@/server/api/errors/api-error";
import type { AiRoute, AiTaskName } from "@/server/ai/types";
import { toUserAITask } from "@/server/ai/routing/tasks";
import { logger } from "@/server/logging/logger";
import { UserAISettingsService } from "@/server/services/user-ai-settings-service";
import type { UserAIProvider, UserAITask } from "@/server/persistence/types/data-models";

export class ModelRoutingService {
  constructor(private readonly userSettingsService = new UserAISettingsService()) {}

  async resolveRoute(input: {
    userId?: string;
    task: AiTaskName;
    allowAppFallback?: boolean;
  }): Promise<AiRoute> {
    const userTask = toUserAITask(input.task);

    if (input.userId) {
      const userRoute = await this.userSettingsService.resolveTaskAssignment(
        input.userId,
        userTask,
      );
      if (userRoute?.model) {
        const normalizedModel = normalizeProviderModelId(userRoute.provider, userRoute.model);
        if (!isProviderModelSupported(userRoute.provider, normalizedModel)) {
          throw new ApiError(
            `The saved ${userRoute.provider} model is not supported anymore.`,
            400,
            "AI_MODEL_NOT_SUPPORTED",
            {
              provider: userRoute.provider,
              model: userRoute.model,
              normalizedModel,
              task: userTask,
            },
          );
        }

        const route: AiRoute = {
          task: userTask,
          provider: userRoute.provider,
          model: normalizedModel,
          credentials: {
            apiKey: userRoute.apiKey,
            baseUrl: userRoute.baseUrl,
            headers: userRoute.headers,
          },
          reasoningEffort: resolveTaskReasoningEffort(
            input.task,
            userRoute.reasoningEffort,
          ),
          capabilities: resolveRouteCapabilities(userRoute.provider, userRoute.baseUrl),
          source: userRoute.source,
          userId: input.userId,
        };
        auditRoute(route);
        return route;
      }
    }

    if (input.allowAppFallback ?? env.AI_ALLOW_APP_PROVIDER_FALLBACK) {
      const appRoute = resolveAppFallback(userTask);
      auditRoute(appRoute);
      return appRoute;
    }

    throw new ApiError(
      "No AI provider is configured for this task. Add an API key in Settings or enable app-level provider fallback.",
      503,
      "AI_ROUTE_NOT_CONFIGURED",
      { task: userTask },
    );
  }
}

function resolveAppFallback(task: UserAITask): AiRoute {
  switch (env.AI_PROVIDER) {
    case "bootstrap":
      return {
        task,
        provider: "bootstrap",
        model: "bootstrap-local",
        source: "bootstrap",
      };
    case "anthropic":
      requireAppKey("anthropic", env.ANTHROPIC_API_KEY);
      validateAppFallbackModel("anthropic", preferredAppFallbackModel("anthropic", task), task);
      return {
        task,
        provider: "anthropic",
        model: normalizeProviderModelId("anthropic", preferredAppFallbackModel("anthropic", task)),
        credentials: { apiKey: env.ANTHROPIC_API_KEY },
        reasoningEffort: resolveTaskReasoningEffort(toAiTaskName(task), undefined),
        capabilities: resolveRouteCapabilities("anthropic"),
        source: "app_fallback",
      };
    case "google_gemini":
      requireAppKey("google_gemini", env.GOOGLE_GEMINI_API_KEY);
      validateAppFallbackModel(
        "google_gemini",
        preferredAppFallbackModel("google_gemini", task),
        task,
      );
      return {
        task,
        provider: "google_gemini",
        model: normalizeProviderModelId(
          "google_gemini",
          preferredAppFallbackModel("google_gemini", task),
        ),
        credentials: { apiKey: env.GOOGLE_GEMINI_API_KEY },
        reasoningEffort: resolveTaskReasoningEffort(toAiTaskName(task), undefined),
        capabilities: resolveRouteCapabilities("google_gemini"),
        source: "app_fallback",
      };
    case "xai":
      requireAppKey("xai", env.XAI_API_KEY);
      validateAppFallbackModel("xai", preferredAppFallbackModel("xai", task), task);
      return {
        task,
        provider: "xai",
        model: normalizeProviderModelId("xai", preferredAppFallbackModel("xai", task)),
        credentials: {
          apiKey: env.XAI_API_KEY,
          baseUrl: env.XAI_BASE_URL,
        },
        reasoningEffort: resolveTaskReasoningEffort(toAiTaskName(task), undefined),
        capabilities: resolveRouteCapabilities("xai", env.XAI_BASE_URL),
        source: "app_fallback",
      };
    case "openai":
    default:
      requireAppKey("openai", env.OPENAI_API_KEY);
      validateAppFallbackModel("openai", preferredAppFallbackModel("openai", task), task);
      return {
        task,
        provider: "openai",
        model: normalizeProviderModelId("openai", preferredAppFallbackModel("openai", task)),
        credentials: {
          apiKey: env.OPENAI_API_KEY,
          baseUrl: env.OPENAI_BASE_URL,
        },
        reasoningEffort: resolveTaskReasoningEffort(toAiTaskName(task), undefined),
        capabilities: resolveRouteCapabilities("openai", env.OPENAI_BASE_URL),
        source: "app_fallback",
      };
  }
}

function requireAppKey(provider: UserAIProvider, apiKey?: string) {
  if (!apiKey) {
    throw new ApiError(
      `No ${provider} API key is configured for app-level AI fallback.`,
      503,
      "AI_ROUTE_NOT_CONFIGURED",
      { provider },
    );
  }
}

function validateAppFallbackModel(
  provider: UserAIProvider,
  model: string,
  task: UserAITask,
) {
  const normalizedModel = normalizeProviderModelId(provider, model);
  if (isProviderModelSupported(provider, normalizedModel)) {
    return;
  }

  throw new ApiError(
    `The app fallback model ${model} is not supported by ${provider}.`,
    500,
    "AI_MODEL_NOT_SUPPORTED",
    {
      provider,
      model,
      normalizedModel,
      task,
      source: "app_fallback",
    },
  );
}

function auditRoute(route: AiRoute) {
  logger.info("ai.route_selected", {
    userId: route.userId,
    task: route.task,
    provider: route.provider,
    model: route.model,
    reasoningEffort: route.reasoningEffort,
    source: route.source,
    credentialSource:
      route.source === "app_fallback"
        ? "app_fallback_env"
        : route.source === "bootstrap"
          ? "bootstrap"
          : "user_settings",
    hasUserCredentials: route.source !== "app_fallback" && route.source !== "bootstrap",
  });
}

function preferredAppFallbackModel(
  provider: UserAIProvider,
  task: UserAITask,
) {
  return (
    getRecommendedTaskModel(provider, task) ??
    (provider === "anthropic"
      ? env.ANTHROPIC_MODEL
      : provider === "google_gemini"
        ? env.GOOGLE_GEMINI_MODEL
        : provider === "xai"
          ? env.XAI_MODEL
          : env.OPENAI_MODEL)
  );
}

function resolveRouteCapabilities(
  provider: UserAIProvider | "bootstrap",
  baseUrl?: string,
) {
  if (provider === "bootstrap") {
    return {
      wireApi: "responses" as const,
      supportsNativeStrictJson: false,
      supportsReasoningEffort: false,
      isOpenAiCompatible: false,
    };
  }

  if (provider !== "openai") {
    return {
      wireApi: "responses" as const,
      supportsNativeStrictJson: provider !== "anthropic",
      supportsReasoningEffort: false,
      isOpenAiCompatible: false,
    };
  }

  const normalizedBaseUrl = (baseUrl ?? env.OPENAI_BASE_URL ?? "").toLowerCase();
  const isOfficialOpenAi =
    !normalizedBaseUrl ||
    normalizedBaseUrl.includes("api.openai.com");

  return {
    wireApi: "responses" as const,
    supportsNativeStrictJson: isOfficialOpenAi,
    supportsReasoningEffort: true,
    isOpenAiCompatible: true,
  };
}

function toAiTaskName(task: UserAITask): AiTaskName {
  switch (task) {
    case "world_generation":
      return "generateWorld";
    case "character_generation":
      return "generateCharacters";
    case "opening_scene":
      return "generateOpeningScene";
    case "next_scene":
      return "generateNextScene";
    case "choice_generation":
      return "generateChoices";
    case "custom_action_interpretation":
      return "interpretCustomAction";
    case "summarization":
      return "summarizeTurns";
    case "consistency_check":
      return "checkConsistency";
    case "session_title":
      return "generateSessionTitle";
    case "recap":
    default:
      return "generateRecap";
  }
}
