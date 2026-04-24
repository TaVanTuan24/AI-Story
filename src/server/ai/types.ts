import type { z } from "zod";

import type {
  ActionIntent,
  EnginePreset,
  NarrativeContextPack,
  StoryChoice,
  StoryGenre,
  StoryScene,
  StoryGenerationResult,
  SummaryCandidate,
} from "@/server/narrative/types";
import type {
  UserAIProvider,
  UserAITask,
  StoryOutputLanguage,
} from "@/server/persistence/types/data-models";

export type AiTaskName =
  | "generateWorld"
  | "generateCharacters"
  | "generateOpeningScene"
  | "generateChoices"
  | "interpretCustomAction"
  | "generateNextScene"
  | "summarizeTurns"
  | "checkConsistency"
  | "generateSessionTitle"
  | "generateRecap";

export type PromptVersion = `v${number}`;

export type AiPromptDefinition<TInput, TOutput> = {
  task: AiTaskName;
  version: PromptVersion;
  purpose: string;
  inputVariables: string[];
  system: string;
  user: (input: TInput) => string;
  fallback: (input: TInput) => TOutput;
  expectedOutputJsonSchema: Record<string, unknown>;
  notes: {
    tokenBudget: string;
    failureModes: string[];
  };
};

export type AiReasoningEffort = "low" | "medium" | "high";

export type AiStructuredRequest<TInput> = {
  task: AiTaskName;
  promptVersion: PromptVersion;
  input: TInput;
  systemPrompt: string;
  userPrompt: string;
  jsonSchemaName: string;
  jsonSchema: Record<string, unknown>;
  responseSchema: z.ZodTypeAny;
  fallback: () => unknown;
  reasoningEffort?: AiReasoningEffort;
  maxOutputTokens?: number;
  timeoutMs?: number;
  retryAttempts?: number;
  postValidateOutput?: (output: unknown) => void;
  requestId?: string;
  metadata?: Record<string, unknown>;
};

export type AiProviderCredentials = {
  apiKey?: string;
  baseUrl?: string;
  headers?: {
    organizationId?: string;
    projectId?: string;
  };
};

export type AiProviderCapabilities = {
  wireApi: "responses";
  supportsNativeStrictJson: boolean;
  supportsReasoningEffort: boolean;
  isOpenAiCompatible: boolean;
};

export type AiRoute = {
  task: UserAITask;
  provider: UserAIProvider | "bootstrap";
  model: string;
  credentials?: AiProviderCredentials;
  reasoningEffort?: AiReasoningEffort;
  capabilities?: AiProviderCapabilities;
  source: "task_override" | "default_provider" | "first_configured" | "app_fallback" | "bootstrap";
  userId?: string;
};

export type AiTokenUsage = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
};

export type AiStructuredOutputMetadata = {
  status: "validated" | "repaired" | "fallback";
  repairCount: number;
  hadValidationRetry: boolean;
};

export type AiInvocationResult<TResult> = {
  requestId: string;
  task: AiTaskName;
  promptVersion: PromptVersion;
  provider: string;
  model: string;
  attempts: number;
  usedFallback: boolean;
  usage?: AiTokenUsage;
  providerRequestId?: string;
  structuredOutput: AiStructuredOutputMetadata;
  output: TResult;
  rawText: string;
};

export type AiTaskExecution<TResult> = {
  output: TResult;
  invocation: AiInvocationResult<TResult>;
  route: AiRoute;
};

export type AiLogger = {
  info(entry: Record<string, unknown>): void;
  warn(entry: Record<string, unknown>): void;
  error(entry: Record<string, unknown>): void;
};

export type AiUsageHook = (entry: {
  requestId: string;
  provider: string;
  model: string;
  task: AiTaskName;
  usage?: AiTokenUsage;
  attempts: number;
  latencyMs: number;
  success: boolean;
  metadata?: Record<string, unknown>;
}) => Promise<void> | void;

export type GenerateWorldInput = {
  genre: StoryGenre;
  tone: string;
  premise: string;
  enginePreset: EnginePreset;
  storyOutputLanguage?: StoryOutputLanguage;
};

export type GenerateWorldOutput = {
  setting: string;
  worldRules: string[];
  playerRole: string;
  conflict: string;
  startingLocation: string;
  seedHint: string;
  contentWarnings: string[];
};

export type GenerateCharactersInput = {
  genre: StoryGenre;
  tone: string;
  premise: string;
  enginePreset: EnginePreset;
  world: GenerateWorldOutput;
  storyOutputLanguage?: StoryOutputLanguage;
};

export type GenerateCharactersOutput = {
  characters: Array<{
    id: string;
    name: string;
    role: string;
    personality: string[];
    initialRelationshipScore: number;
    statusFlags: string[];
    secretsKnown: string[];
    isPlayer: boolean;
  }>;
};

export type GenerateOpeningSceneInput = {
  contextPack: NarrativeContextPack;
};

export type GenerateOpeningSceneOutput = StoryGenerationResult;

export type GenerateChoicesInput = {
  contextPack: NarrativeContextPack;
  sceneSummary: string;
};

export type GenerateChoicesOutput = {
  choices: Array<{
    label: string;
    intent: ActionIntent;
    tags: string[];
  }>;
};

export type InterpretCustomActionInput = {
  contextPack: NarrativeContextPack;
  rawAction: string;
};

export type InterpretCustomActionOutput = {
  normalizedText: string;
  intent: ActionIntent;
  tags: string[];
  rationale: string;
};

export type GenerateNextSceneInput = {
  contextPack: NarrativeContextPack;
  latestScene?: Pick<StoryScene, "title" | "body">;
};

export type GenerateNextSceneOutput = StoryGenerationResult;

export type RewriteStoryIdeaInput = {
  text: string;
  storyOutputLanguage?: StoryOutputLanguage;
};

export type RewriteStoryIdeaOutput = {
  rewrittenText: string;
  suggestedGenre?: StoryGenre;
  suggestedTone?: string;
  dynamicStatsPreview?: Array<{
    key: string;
    label: string;
    description: string;
  }>;
};

export type SummarizeTurnsInput = {
  contextPack: NarrativeContextPack;
  recentTurns: Array<{
    turnNumber: number;
    sceneTitle: string;
    sceneSummary: string;
    actionText: string;
  }>;
};

export type SummarizeTurnsOutput = SummaryCandidate;

export type CheckConsistencyInput = {
  contextPack: NarrativeContextPack;
  candidateScene: {
    title: string;
    body: string;
    choices: StoryChoice[];
  };
};

export type CheckConsistencyOutput = {
  valid: boolean;
  issues: string[];
  recommendations: string[];
};

export type GenerateSessionTitleInput = {
  genre: StoryGenre;
  tone: string;
  premise: string;
  enginePreset: EnginePreset;
  worldSummary?: string;
  storyOutputLanguage?: StoryOutputLanguage;
};

export type GenerateSessionTitleOutput = {
  title: string;
  rationale: string;
};

export type GenerateRecapInput = {
  contextPack: NarrativeContextPack;
  recentTurns: Array<{
    turnNumber: number;
    sceneTitle: string;
    sceneSummary: string;
    actionText: string;
  }>;
};

export type GenerateRecapOutput = {
  recap: string;
  highlights: string[];
  openThreads: string[];
};

export type AiProvider = {
  readonly name: string;
  readonly defaultModel: string;
  readonly route?: AiRoute;
  invokeStructured<TResult>(request: AiStructuredRequest<unknown>): Promise<AiInvocationResult<TResult>>;
};

export type AiOrchestratorOptions = {
  logger?: AiLogger;
  usageHook?: AiUsageHook;
  userId?: string;
};

export type AiTaskRoutingMap = Record<AiTaskName, UserAITask>;
