import type { Types } from "mongoose";

import type {
  ACTION_SOURCES,
  ANALYTICS_EVENT_TYPES,
  API_PROVIDERS,
  API_USAGE_STATUSES,
  RELATIONSHIP_BUCKETS,
  SESSION_STATUSES,
  SNAPSHOT_KINDS,
  STORY_GENRES,
  SUMMARY_KINDS,
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
  snapshotId?: ObjectIdLike;
  aiResponseRef?: {
    provider: ApiProvider;
    requestId?: string;
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
