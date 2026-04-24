import {
  getRecommendedModelsForTask,
  getSuitableModelsForTask,
  type AIProviderCatalogName,
} from "@/lib/ai/provider-catalog";
import type { AiReasoningEffort, AiTaskName } from "@/server/ai/types";

export type AiTaskRuntimeProfile = {
  defaultReasoningEffort: AiReasoningEffort;
  maxReasoningEffort: AiReasoningEffort;
  maxOutputTokens: number;
  timeoutMs: number;
  retryAttempts: number;
  context: {
    shortTermTurns: number;
    rollingSummariesMax: number;
    canonFactsMax: number;
    storyHistoryMax: number;
    worldMemoryMax: number;
    knownFactsMax: number;
    relationshipsMax: number;
  };
};

const DEFAULT_CONTEXT = {
  shortTermTurns: 4,
  rollingSummariesMax: 2,
  canonFactsMax: 12,
  storyHistoryMax: 4,
  worldMemoryMax: 8,
  knownFactsMax: 10,
  relationshipsMax: 8,
} as const;

const SUPPORT_CONTEXT = {
  shortTermTurns: 3,
  rollingSummariesMax: 2,
  canonFactsMax: 10,
  storyHistoryMax: 3,
  worldMemoryMax: 6,
  knownFactsMax: 8,
  relationshipsMax: 6,
} as const;

export const AI_TASK_RUNTIME_PROFILES: Record<AiTaskName, AiTaskRuntimeProfile> = {
  generateWorld: {
    defaultReasoningEffort: "medium",
    maxReasoningEffort: "medium",
    maxOutputTokens: 900,
    timeoutMs: 12_000,
    retryAttempts: 1,
    context: SUPPORT_CONTEXT,
  },
  generateCharacters: {
    defaultReasoningEffort: "medium",
    maxReasoningEffort: "medium",
    maxOutputTokens: 1_000,
    timeoutMs: 12_000,
    retryAttempts: 1,
    context: SUPPORT_CONTEXT,
  },
  generateOpeningScene: {
    defaultReasoningEffort: "high",
    maxReasoningEffort: "high",
    maxOutputTokens: 2_400,
    timeoutMs: 35_000,
    retryAttempts: 2,
    context: {
      ...DEFAULT_CONTEXT,
      shortTermTurns: 3,
      canonFactsMax: 10,
      storyHistoryMax: 3,
      worldMemoryMax: 6,
    },
  },
  generateNextScene: {
    defaultReasoningEffort: "medium",
    maxReasoningEffort: "high",
    maxOutputTokens: 2_000,
    timeoutMs: 25_000,
    retryAttempts: 1,
    context: DEFAULT_CONTEXT,
  },
  generateChoices: {
    defaultReasoningEffort: "low",
    maxReasoningEffort: "medium",
    maxOutputTokens: 350,
    timeoutMs: 7_000,
    retryAttempts: 1,
    context: SUPPORT_CONTEXT,
  },
  interpretCustomAction: {
    defaultReasoningEffort: "low",
    maxReasoningEffort: "medium",
    maxOutputTokens: 250,
    timeoutMs: 7_000,
    retryAttempts: 1,
    context: SUPPORT_CONTEXT,
  },
  summarizeTurns: {
    defaultReasoningEffort: "low",
    maxReasoningEffort: "medium",
    maxOutputTokens: 700,
    timeoutMs: 10_000,
    retryAttempts: 1,
    context: SUPPORT_CONTEXT,
  },
  checkConsistency: {
    defaultReasoningEffort: "medium",
    maxReasoningEffort: "medium",
    maxOutputTokens: 400,
    timeoutMs: 10_000,
    retryAttempts: 1,
    context: SUPPORT_CONTEXT,
  },
  generateSessionTitle: {
    defaultReasoningEffort: "low",
    maxReasoningEffort: "medium",
    maxOutputTokens: 120,
    timeoutMs: 6_000,
    retryAttempts: 1,
    context: SUPPORT_CONTEXT,
  },
  generateRecap: {
    defaultReasoningEffort: "low",
    maxReasoningEffort: "medium",
    maxOutputTokens: 900,
    timeoutMs: 12_000,
    retryAttempts: 1,
    context: SUPPORT_CONTEXT,
  },
};

export function getAiTaskRuntimeProfile(task: AiTaskName) {
  return AI_TASK_RUNTIME_PROFILES[task];
}

export function resolveTaskReasoningEffort(
  task: AiTaskName,
  requested: AiReasoningEffort | undefined,
  input?: unknown,
) {
  const profile = getAiTaskRuntimeProfile(task);
  const desired =
    requested ??
    (task === "generateNextScene" && shouldUseHighReasoningForNextScene(input)
      ? "high"
      : profile.defaultReasoningEffort);

  return clampReasoningEffort(desired, profile.maxReasoningEffort);
}

export function getRecommendedTaskModel(
  provider: AIProviderCatalogName,
  task:
    | "world_generation"
    | "character_generation"
    | "opening_scene"
    | "next_scene"
    | "choice_generation"
    | "custom_action_interpretation"
    | "summarization"
    | "consistency_check"
    | "session_title"
    | "recap",
) {
  const preferred = TASK_MODEL_RECOMMENDATIONS[provider][task];
  if (preferred) {
    return preferred;
  }

  return (
    getRecommendedModelsForTask(provider, task)[0]?.id ??
    getSuitableModelsForTask(provider, task)[0]?.id
  );
}

const TASK_MODEL_RECOMMENDATIONS: Record<
  AIProviderCatalogName,
  Record<
    | "world_generation"
    | "character_generation"
    | "opening_scene"
    | "next_scene"
    | "choice_generation"
    | "custom_action_interpretation"
    | "summarization"
    | "consistency_check"
    | "session_title"
    | "recap",
    string
  >
> = {
  openai: {
    world_generation: "gpt-5.4-mini",
    character_generation: "gpt-5.2",
    opening_scene: "gpt-5.4",
    next_scene: "gpt-5.4-mini",
    choice_generation: "gpt-5.4-mini",
    custom_action_interpretation: "gpt-5.4-mini",
    summarization: "gpt-5.4-mini",
    consistency_check: "gpt-5.4",
    session_title: "gpt-5.4-mini",
    recap: "gpt-5.4-mini",
  },
  anthropic: {
    world_generation: "claude-sonnet-4-20250514",
    character_generation: "claude-sonnet-4-20250514",
    opening_scene: "claude-opus-4-20250514",
    next_scene: "claude-sonnet-4-20250514",
    choice_generation: "claude-haiku-4-20250514",
    custom_action_interpretation: "claude-haiku-4-20250514",
    summarization: "claude-haiku-4-20250514",
    consistency_check: "claude-sonnet-4-20250514",
    session_title: "claude-haiku-4-20250514",
    recap: "claude-haiku-4-20250514",
  },
  google_gemini: {
    world_generation: "gemini-2.5-pro",
    character_generation: "gemini-2.5-flash",
    opening_scene: "gemini-2.5-pro",
    next_scene: "gemini-2.5-flash",
    choice_generation: "gemini-2.5-flash",
    custom_action_interpretation: "gemini-2.5-flash",
    summarization: "gemini-2.0-flash",
    consistency_check: "gemini-2.5-pro",
    session_title: "gemini-2.0-flash",
    recap: "gemini-2.5-flash",
  },
  xai: {
    world_generation: "grok-4-1-fast-reasoning",
    character_generation: "grok-4-1-fast-non-reasoning",
    opening_scene: "grok-4.20-reasoning",
    next_scene: "grok-4-1-fast-non-reasoning",
    choice_generation: "grok-4-1-fast-non-reasoning",
    custom_action_interpretation: "grok-4-1-fast-reasoning",
    summarization: "grok-3-mini",
    consistency_check: "grok-4-1-fast-reasoning",
    session_title: "grok-3-mini-fast",
    recap: "grok-3-mini",
  },
};

function shouldUseHighReasoningForNextScene(input: unknown) {
  if (!input || typeof input !== "object") {
    return false;
  }

  const contextPack = (input as { contextPack?: { currentTurn?: unknown; repairContext?: unknown } })
    .contextPack;
  const currentTurn =
    typeof contextPack?.currentTurn === "number" ? contextPack.currentTurn : 0;

  return currentTurn >= 8 || Boolean(contextPack?.repairContext);
}

function clampReasoningEffort(
  value: AiReasoningEffort,
  maxAllowed: AiReasoningEffort,
) {
  const rank: Record<AiReasoningEffort, number> = {
    low: 1,
    medium: 2,
    high: 3,
  };

  if (rank[value] <= rank[maxAllowed]) {
    return value;
  }

  return maxAllowed;
}
