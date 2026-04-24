import type { Types } from "mongoose";

import type {
  ACTION_SOURCES,
  ANALYTICS_EVENT_TYPES,
  API_PROVIDERS,
  API_USAGE_STATUSES,
  INTERFACE_LANGUAGES,
  RELATIONSHIP_BUCKETS,
  SESSION_STATUSES,
  SNAPSHOT_KINDS,
  STORY_GENRES,
  STORY_OUTPUT_LANGUAGES,
  SUMMARY_KINDS,
  AI_REASONING_EFFORTS,
  APP_THEMES,
  USER_AI_PROVIDERS,
  USER_AI_TASKS,
} from "@/server/persistence/shared/constants";

export type StoryGenre = (typeof STORY_GENRES)[number];
export type SessionStatus = (typeof SESSION_STATUSES)[number];
export type ActionSource = (typeof ACTION_SOURCES)[number];
export type RelationshipBucket = (typeof RELATIONSHIP_BUCKETS)[number];
export type SnapshotKind = (typeof SNAPSHOT_KINDS)[number];
export type SummaryKind = (typeof SUMMARY_KINDS)[number];
export type AnalyticsEventType = (typeof ANALYTICS_EVENT_TYPES)[number];
export type ApiProvider = (typeof API_PROVIDERS)[number];
export type ApiUsageStatus = (typeof API_USAGE_STATUSES)[number];
export type UserAIProvider = (typeof USER_AI_PROVIDERS)[number];
export type UserAITask = (typeof USER_AI_TASKS)[number];
export type InterfaceLanguage = (typeof INTERFACE_LANGUAGES)[number];
export type StoryOutputLanguage = (typeof STORY_OUTPUT_LANGUAGES)[number];
export type AIReasoningEffort = (typeof AI_REASONING_EFFORTS)[number];
export type AppTheme = (typeof APP_THEMES)[number];

export type ObjectIdLike = Types.ObjectId | string;

export type PresentedChoice = {
  id: string;
  label: string;
  intent: string;
};

export type CanonicalCharacterState = {
  name: string;
  role: string;
  personality: string[];
  relationshipScore: number;
  relationshipBucket: RelationshipBucket;
  statusFlags: string[];
  secretsKnown: string[];
  isPlayer: boolean;
};

export type UserRecord = {
  email: string;
  displayName: string;
  avatarUrl?: string;
  isActive: boolean;
  lastSeenAt?: Date;
};

export type StorySessionRecord = {
  userId: ObjectIdLike;
  title: string;
  genre: StoryGenre;
  tone: string;
  status: SessionStatus;
  currentTurn: number;
  currentSceneSummary: string;
  startTime: Date;
  lastPlayedAt: Date;
  recommendationTags: string[];
  searchKeywords: string[];
};

export type StoryWorldRecord = {
  storySessionId: ObjectIdLike;
  setting: string;
  worldRules: string[];
  playerRole: string;
  conflict: string;
  startingLocation: string;
  seed: string;
  contentWarnings: string[];
};

export type CharacterStateRecord = CanonicalCharacterState & {
  storySessionId: ObjectIdLike;
  externalId: string;
};

export type SessionStateSnapshotRecord = {
  storySessionId: ObjectIdLike;
  turnNumber: number;
  kind: SnapshotKind;
  sceneId?: string;
  summaryRefId?: ObjectIdLike;
  canonicalState: {
    sceneSummary: string;
    worldState: Record<string, unknown>;
    characters: CanonicalCharacterState[];
    inventory: string[];
    questFlags: string[];
    customState: Record<string, unknown>;
  };
};

export type TurnLogRecord = {
  storySessionId: ObjectIdLike;
  turnNumber: number;
  sceneTitle?: string;
  sceneText: string;
  sceneSummary: string;
  presentedChoices: PresentedChoice[];
  chosenAction: string;
  actionSource: ActionSource;
  selectedChoiceId?: string;
  rawActionInput?: string;
  gameOver?: boolean;
  snapshotId?: ObjectIdLike;
  aiResponseRef?: {
    provider: ApiProvider;
    requestId?: string;
    model?: string;
    task?: string;
    promptVersion?: string;
    attempts?: number;
    retryCount?: number;
    providerRequestId?: string;
    structuredOutput?: {
      status: "validated" | "repaired" | "fallback";
      repairCount: number;
      hadValidationRetry: boolean;
    };
    consistency?: {
      checked: boolean;
      valid: boolean;
      issues: string[];
      recommendations: string[];
      repairAttempts: number;
      repaired: boolean;
      usedFallbackRepair: boolean;
    };
    usageLogId?: ObjectIdLike;
    responseObjectPath?: string;
  };
};

export type StorySummaryRecord = {
  storySessionId: ObjectIdLike;
  turnNumber: number;
  kind: SummaryKind;
  content: string;
  tokensEstimated?: number;
  sourceTurnRange?: {
    from: number;
    to: number;
  };
  isCanonical: boolean;
};

export type UserPreferenceRecord = {
  userId: ObjectIdLike;
  preferredGenres: StoryGenre[];
  avoidedGenres: StoryGenre[];
  preferredTones: string[];
  avoidedThemes: string[];
  customPromptHints: string[];
  interfaceLanguage: InterfaceLanguage;
  storyOutputLanguage: StoryOutputLanguage;
  themePreference: AppTheme;
};

export type UserAIProviderSettingsRecord = {
  provider: UserAIProvider;
  isEnabled: boolean;
  hasApiKey: boolean;
  encryptedApiKey?: string;
  apiKeyMasked?: string;
  baseUrl?: string;
  defaultModel?: string;
  reasoningEffort?: AIReasoningEffort;
  taskModels: Partial<Record<UserAITask, { model: string; reasoningEffort?: AIReasoningEffort }>>;
  headers: {
    organizationId?: string;
    projectId?: string;
  };
};

export type UserAISettingsRecord = {
  userId: ObjectIdLike;
  defaultProvider?: UserAIProvider;
  providers: UserAIProviderSettingsRecord[];
  taskOverrides: Partial<Record<UserAITask, {
    provider: UserAIProvider;
    model?: string;
    reasoningEffort?: AIReasoningEffort;
  }>>;
};

export type AnalyticsEventRecord = {
  userId?: ObjectIdLike;
  storySessionId?: ObjectIdLike;
  eventType: AnalyticsEventType;
  eventTime: Date;
  properties: Record<string, unknown>;
};

export type ApiUsageLogRecord = {
  userId?: ObjectIdLike;
  storySessionId?: ObjectIdLike;
  provider: ApiProvider;
  model: string;
  operation: string;
  status: ApiUsageStatus;
  latencyMs: number;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  estimatedCostUsd?: number;
  requestId?: string;
  errorCode?: string;
  metadata: Record<string, unknown>;
};
