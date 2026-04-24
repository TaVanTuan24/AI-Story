import type { AITaskName } from "@/lib/api/client";

export type AIProviderCatalogName = "openai" | "anthropic" | "google_gemini" | "xai";
export type AIModelCapabilityTag =
  | "storytelling"
  | "reasoning"
  | "summarization"
  | "consistency_check"
  | "fast"
  | "low_cost"
  | "structured_output"
  | "long_context"
  | "dialogue";
export type AIModelStatus = "stable" | "recommended" | "experimental";
export type AIModelGroup =
  | "flagship"
  | "balanced"
  | "reasoning"
  | "fast"
  | "economy"
  | "specialized";

export type AIModelPricing = {
  inputPer1MTokensUsd: number;
  outputPer1MTokensUsd: number;
};

export type AIModelCatalogEntry = {
  id: string;
  displayName: string;
  provider: AIProviderCatalogName;
  status: AIModelStatus;
  capabilityTags: AIModelCapabilityTag[];
  suitableTasks: AITaskName[];
  notes: string;
  group: AIModelGroup;
  latency: "fast" | "balanced" | "slow";
  costTier: "low" | "medium" | "high";
  pricing?: AIModelPricing;
  isDefault?: boolean;
  isPrimaryStorytellingDefault?: boolean;
  isSupportDefault?: boolean;
};

export type AIProviderCatalogEntry = {
  label: string;
  shortLabel: string;
  description: string;
  defaultModel: string;
  models: AIModelCatalogEntry[];
  supportsStructuredJson: boolean;
  supportsCustomBaseUrl: boolean;
  supportsReasoningEffort?: boolean;
  wireApi?: "responses";
  defaultBaseUrl?: string;
  quirks?: string[];
};

type ProviderMetadata = Omit<AIProviderCatalogEntry, "defaultModel" | "models">;
type ProviderModelAliasMap = Partial<Record<AIProviderCatalogName, Record<string, string>>>;

function defineModel(entry: AIModelCatalogEntry) {
  return entry;
}

const PROVIDER_METADATA: Record<AIProviderCatalogName, ProviderMetadata> = {
  openai: {
    label: "OpenAI",
    shortLabel: "OpenAI",
    description:
      "Strong default for balanced long-form narration, structured output, and continuity checks.",
    supportsStructuredJson: true,
    supportsCustomBaseUrl: true,
    supportsReasoningEffort: true,
    wireApi: "responses",
    quirks: [
      "Good default when you want one provider that can handle both story writing and support tasks.",
    ],
  },
  anthropic: {
    label: "Anthropic",
    shortLabel: "Claude",
    description: "Useful for prose-heavy scenes, careful reasoning, and nuanced character dialogue.",
    supportsStructuredJson: true,
    supportsCustomBaseUrl: false,
    supportsReasoningEffort: false,
    wireApi: "responses",
    quirks: ["Strong fit for dialogue-heavy scenes and careful continuity work."],
  },
  google_gemini: {
    label: "Google Gemini",
    shortLabel: "Gemini",
    description: "Good fit for broad context handling and fast support tasks when configured.",
    supportsStructuredJson: true,
    supportsCustomBaseUrl: true,
    supportsReasoningEffort: false,
    wireApi: "responses",
    quirks: ["Useful when long context handling matters as much as prose style."],
  },
  xai: {
    label: "xAI Grok",
    shortLabel: "Grok",
    description:
      "OpenAI-compatible xAI provider with strong Grok options for punchy storytelling, reasoning, and fast support work.",
    supportsStructuredJson: true,
    supportsCustomBaseUrl: true,
    supportsReasoningEffort: false,
    wireApi: "responses",
    defaultBaseUrl: "https://api.x.ai/v1",
    quirks: [
      "Uses xAI inference API conventions through an OpenAI-compatible chat completions interface.",
      "Reasoning-oriented Grok models are best for critical story turns and consistency tasks.",
    ],
  },
};

const PROVIDER_MODEL_ALIASES: ProviderModelAliasMap = {
  xai: {
    "grok-4.20": "grok-4.20-non-reasoning",
    "grok-4.20-multi-agent": "grok-4.20-reasoning",
    "grok-4": "grok-4",
    "grok-4-fast": "grok-4-1-fast-non-reasoning",
  },
};

const PROVIDER_MODELS: Record<AIProviderCatalogName, AIModelCatalogEntry[]> = {
  openai: [
    defineModel({
      id: "gpt-5.4-mini",
      displayName: "GPT-5.4 Mini",
      provider: "openai",
      status: "recommended",
      capabilityTags: ["storytelling", "reasoning", "summarization", "structured_output"],
      suitableTasks: ["next_scene", "choice_generation", "recap", "session_title"],
      notes: "Balanced default for everyday story generation and support tasks.",
      group: "balanced",
      latency: "balanced",
      costTier: "medium",
      isDefault: true,
    }),
    defineModel({
      id: "gpt-5.4",
      displayName: "GPT-5.4",
      provider: "openai",
      status: "recommended",
      capabilityTags: ["storytelling", "reasoning", "consistency_check", "structured_output"],
      suitableTasks: ["world_generation", "opening_scene", "next_scene", "consistency_check"],
      notes: "Highest-quality OpenAI option here for critical writing and reasoning.",
      group: "flagship",
      latency: "slow",
      costTier: "high",
    }),
    defineModel({
      id: "gpt-5.2",
      displayName: "GPT-5.2",
      provider: "openai",
      status: "stable",
      capabilityTags: ["storytelling", "reasoning", "summarization", "structured_output"],
      suitableTasks: ["character_generation", "recap", "session_title"],
      notes: "Reliable fallback when you want a capable general-purpose model.",
      group: "balanced",
      latency: "balanced",
      costTier: "medium",
    }),
  ],
  anthropic: [
    defineModel({
      id: "claude-sonnet-4-20250514",
      displayName: "Claude Sonnet 4",
      provider: "anthropic",
      status: "recommended",
      capabilityTags: ["storytelling", "reasoning", "dialogue", "consistency_check"],
      suitableTasks: ["character_generation", "opening_scene", "next_scene"],
      notes: "Well-balanced for long-form prose, dialogue, and continuity-sensitive tasks.",
      group: "balanced",
      latency: "balanced",
      costTier: "medium",
      isDefault: true,
    }),
    defineModel({
      id: "claude-opus-4-20250514",
      displayName: "Claude Opus 4",
      provider: "anthropic",
      status: "stable",
      capabilityTags: ["storytelling", "reasoning", "dialogue", "consistency_check"],
      suitableTasks: ["world_generation", "next_scene", "consistency_check"],
      notes: "Highest-quality Claude option for premium writing and deeper reasoning.",
      group: "flagship",
      latency: "slow",
      costTier: "high",
    }),
    defineModel({
      id: "claude-haiku-4-20250514",
      displayName: "Claude Haiku 4",
      provider: "anthropic",
      status: "stable",
      capabilityTags: ["summarization", "fast", "low_cost"],
      suitableTasks: ["summarization", "session_title", "recap"],
      notes: "Fast, lighter-weight option for summaries and lower-cost support tasks.",
      group: "fast",
      latency: "fast",
      costTier: "low",
    }),
  ],
  google_gemini: [
    defineModel({
      id: "gemini-2.5-pro",
      displayName: "Gemini 2.5 Pro",
      provider: "google_gemini",
      status: "recommended",
      capabilityTags: ["storytelling", "reasoning", "consistency_check", "long_context"],
      suitableTasks: ["world_generation", "custom_action_interpretation", "consistency_check"],
      notes: "High-context choice for story setup, worldbuilding, and reasoning-heavy tasks.",
      group: "flagship",
      latency: "slow",
      costTier: "high",
      isDefault: true,
    }),
    defineModel({
      id: "gemini-2.5-flash",
      displayName: "Gemini 2.5 Flash",
      provider: "google_gemini",
      status: "stable",
      capabilityTags: ["summarization", "fast", "consistency_check", "long_context"],
      suitableTasks: ["choice_generation", "summarization", "recap"],
      notes: "Faster model for structured support work and responsive scene utilities.",
      group: "fast",
      latency: "fast",
      costTier: "low",
    }),
    defineModel({
      id: "gemini-2.0-flash",
      displayName: "Gemini 2.0 Flash",
      provider: "google_gemini",
      status: "stable",
      capabilityTags: ["summarization", "fast", "low_cost"],
      suitableTasks: ["session_title", "summarization"],
      notes: "Lowest-cost Gemini option for simple helper tasks.",
      group: "economy",
      latency: "fast",
      costTier: "low",
    }),
  ],
  xai: [
    defineModel({
      id: "grok-4.20-reasoning",
      displayName: "Grok 4.20 Reasoning",
      provider: "xai",
      status: "recommended",
      capabilityTags: ["storytelling", "reasoning", "consistency_check", "structured_output"],
      suitableTasks: ["world_generation", "opening_scene", "next_scene", "consistency_check"],
      notes: "Best xAI default for critical story writing, world design, and consistency checks.",
      group: "reasoning",
      latency: "slow",
      costTier: "high",
      isDefault: true,
      isPrimaryStorytellingDefault: true,
    }),
    defineModel({
      id: "grok-4.20-non-reasoning",
      displayName: "Grok 4.20",
      provider: "xai",
      status: "stable",
      capabilityTags: ["storytelling", "reasoning", "structured_output"],
      suitableTasks: ["opening_scene", "next_scene", "character_generation", "recap"],
      notes: "Strong flagship Grok model for premium scene writing with less reasoning overhead.",
      group: "flagship",
      latency: "balanced",
      costTier: "high",
    }),
    defineModel({
      id: "grok-4",
      displayName: "Grok 4",
      provider: "xai",
      status: "stable",
      capabilityTags: ["storytelling", "reasoning", "structured_output"],
      suitableTasks: ["world_generation", "opening_scene", "next_scene", "consistency_check"],
      notes: "Reasoning-first Grok 4 option when you want strong narrative quality with broad compatibility.",
      group: "reasoning",
      latency: "slow",
      costTier: "high",
    }),
    defineModel({
      id: "grok-4-1-fast-reasoning",
      displayName: "Grok 4.1 Fast Reasoning",
      provider: "xai",
      status: "recommended",
      capabilityTags: ["reasoning", "consistency_check", "fast", "structured_output"],
      suitableTasks: ["custom_action_interpretation", "consistency_check", "choice_generation"],
      notes: "Fast reasoning-oriented Grok choice for structured interpretation and checks.",
      group: "fast",
      latency: "fast",
      costTier: "medium",
    }),
    defineModel({
      id: "grok-4-1-fast-non-reasoning",
      displayName: "Grok 4.1 Fast",
      provider: "xai",
      status: "stable",
      capabilityTags: ["storytelling", "fast", "structured_output"],
      suitableTasks: ["choice_generation", "character_generation", "recap", "session_title"],
      notes: "Faster Grok 4.1 variant for responsive support and lighter storytelling tasks.",
      group: "fast",
      latency: "fast",
      costTier: "medium",
    }),
    defineModel({
      id: "grok-3",
      displayName: "Grok 3",
      provider: "xai",
      status: "stable",
      capabilityTags: ["storytelling", "reasoning", "summarization"],
      suitableTasks: ["choice_generation", "recap", "session_title"],
      notes: "Capable general-purpose Grok option for mixed writing and support tasks.",
      group: "balanced",
      latency: "balanced",
      costTier: "medium",
    }),
    defineModel({
      id: "grok-3-mini",
      displayName: "Grok 3 Mini",
      provider: "xai",
      status: "recommended",
      capabilityTags: ["summarization", "fast", "low_cost"],
      suitableTasks: ["summarization", "session_title", "recap"],
      notes: "Low-cost Grok option for summaries, recaps, and frequent background tasks.",
      group: "economy",
      latency: "fast",
      costTier: "low",
      isSupportDefault: true,
    }),
    defineModel({
      id: "grok-3-mini-fast",
      displayName: "Grok 3 Mini Fast",
      provider: "xai",
      status: "stable",
      capabilityTags: ["summarization", "fast", "low_cost"],
      suitableTasks: ["summarization", "choice_generation", "session_title"],
      notes: "Fastest lower-cost Grok option for frequent support work.",
      group: "fast",
      latency: "fast",
      costTier: "low",
    }),
  ],
};

export const AI_PROVIDER_CATALOG: Record<AIProviderCatalogName, AIProviderCatalogEntry> =
  Object.fromEntries(
    (Object.keys(PROVIDER_METADATA) as AIProviderCatalogName[]).map((provider) => {
      const models = PROVIDER_MODELS[provider];
      const defaultModel = models.find((model) => model.isDefault)?.id ?? models[0]?.id ?? "";

      return [
        provider,
        {
          ...PROVIDER_METADATA[provider],
          defaultModel,
          models,
        },
      ];
    }),
  ) as Record<AIProviderCatalogName, AIProviderCatalogEntry>;

export function getProviderModelCatalog(provider: AIProviderCatalogName) {
  return AI_PROVIDER_CATALOG[provider].models;
}

export function getProviderModelOptions(provider: AIProviderCatalogName) {
  return getProviderModelCatalog(provider).map((modelOption) => modelOption.id);
}

export function getProviderModelEntry(provider: AIProviderCatalogName, modelId: string) {
  const normalizedModelId = normalizeProviderModelId(provider, modelId);
  return getProviderModelCatalog(provider).find((modelOption) => modelOption.id === normalizedModelId);
}

export function getProviderDefaultModel(provider: AIProviderCatalogName) {
  return AI_PROVIDER_CATALOG[provider].defaultModel;
}

export function estimateModelUsageCostUsd(
  provider: AIProviderCatalogName,
  modelId: string,
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
  },
) {
  const entry = getProviderModelEntry(provider, modelId);
  if (!entry?.pricing) {
    return undefined;
  }

  const inputTokens = Math.max(0, usage?.inputTokens ?? 0);
  const outputTokens = Math.max(0, usage?.outputTokens ?? 0);
  const estimated =
    (inputTokens / 1_000_000) * entry.pricing.inputPer1MTokensUsd +
    (outputTokens / 1_000_000) * entry.pricing.outputPer1MTokensUsd;

  return Number(estimated.toFixed(6));
}

export function normalizeProviderModelId(
  provider: AIProviderCatalogName,
  modelId: string,
) {
  return PROVIDER_MODEL_ALIASES[provider]?.[modelId] ?? modelId;
}

export function isProviderModelSupported(
  provider: AIProviderCatalogName,
  modelId: string,
) {
  return Boolean(getProviderModelEntry(provider, modelId));
}

export function getSuitableModelsForTask(
  provider: AIProviderCatalogName,
  task: AITaskName,
) {
  return getProviderModelCatalog(provider).filter((modelOption) =>
    modelOption.suitableTasks.includes(task),
  );
}

export function getRecommendedModelsForTask(
  provider: AIProviderCatalogName,
  task: AITaskName,
) {
  return getSuitableModelsForTask(provider, task).filter(
    (modelOption) =>
      modelOption.status === "recommended" ||
      (task === "next_scene" && modelOption.isPrimaryStorytellingDefault) ||
      (task === "summarization" && modelOption.isSupportDefault),
  );
}

export function isModelSuitableForTask(model: AIModelCatalogEntry, task: AITaskName) {
  return model.suitableTasks.includes(task);
}

export function sortModelsForTask(
  models: AIModelCatalogEntry[],
  task?: AITaskName,
) {
  if (!task) {
    return [...models];
  }

  return [...models].sort((left, right) => {
    const leftSuitable = Number(isModelSuitableForTask(left, task));
    const rightSuitable = Number(isModelSuitableForTask(right, task));
    if (leftSuitable !== rightSuitable) {
      return rightSuitable - leftSuitable;
    }

    const leftRecommended = Number(
      left.status === "recommended" ||
        (task === "next_scene" && left.isPrimaryStorytellingDefault) ||
        (task === "summarization" && left.isSupportDefault),
    );
    const rightRecommended = Number(
      right.status === "recommended" ||
        (task === "next_scene" && right.isPrimaryStorytellingDefault) ||
        (task === "summarization" && right.isSupportDefault),
    );
    if (leftRecommended !== rightRecommended) {
      return rightRecommended - leftRecommended;
    }

    return left.displayName.localeCompare(right.displayName);
  });
}

export function getXaiStorytellingDefaultModel() {
  return (
    getProviderModelCatalog("xai").find((modelOption) => modelOption.isPrimaryStorytellingDefault) ??
    getProviderModelCatalog("xai")[0]
  );
}

export function getXaiSupportDefaultModel() {
  return (
    getProviderModelCatalog("xai").find((modelOption) => modelOption.isSupportDefault) ??
    getProviderModelCatalog("xai")[0]
  );
}
