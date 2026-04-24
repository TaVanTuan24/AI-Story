import { z } from "zod";

import {
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
  AI_REASONING_EFFORTS,
  APP_THEMES,
  SUMMARY_KINDS,
  USER_AI_PROVIDERS,
  USER_AI_TASKS,
} from "@/server/persistence/shared/constants";

const objectIdSchema = z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid ObjectId.");
const aiModelNameSchema = z
  .string()
  .min(1)
  .max(160)
  .regex(/^[A-Za-z0-9._:-]+$/, "Invalid AI model name.");

export const storyGenreSchema = z.enum(STORY_GENRES);
export const sessionStatusSchema = z.enum(SESSION_STATUSES);
export const actionSourceSchema = z.enum(ACTION_SOURCES);
export const relationshipBucketSchema = z.enum(RELATIONSHIP_BUCKETS);
export const snapshotKindSchema = z.enum(SNAPSHOT_KINDS);
export const summaryKindSchema = z.enum(SUMMARY_KINDS);
export const analyticsEventTypeSchema = z.enum(ANALYTICS_EVENT_TYPES);
export const apiProviderSchema = z.enum(API_PROVIDERS);
export const apiUsageStatusSchema = z.enum(API_USAGE_STATUSES);
export const userAiProviderSchema = z.enum(USER_AI_PROVIDERS);
export const userAiTaskSchema = z.enum(USER_AI_TASKS);
export const interfaceLanguageSchema = z.enum(INTERFACE_LANGUAGES);
export const storyOutputLanguageSchema = z.enum(STORY_OUTPUT_LANGUAGES);
export const aiReasoningEffortSchema = z.enum(AI_REASONING_EFFORTS);
export const appThemeSchema = z.enum(APP_THEMES);

export const presentedChoiceSchema = z.object({
  id: z.string().min(1).max(120),
  label: z.string().min(1).max(300),
  intent: z.string().min(1).max(300),
});

export const canonicalCharacterStateSchema = z.object({
  name: z.string().min(1).max(120),
  role: z.string().min(1).max(160),
  personality: z.array(z.string().min(1).max(80)).max(20).default([]),
  relationshipScore: z.number().min(-100).max(100),
  relationshipBucket: relationshipBucketSchema,
  statusFlags: z.array(z.string().min(1).max(80)).default([]),
  secretsKnown: z.array(z.string().min(1).max(200)).default([]),
  isPlayer: z.boolean().default(false),
});

export const userModelSchema = z.object({
  email: z.email().max(320),
  displayName: z.string().min(2).max(80),
  passwordHash: z.string().min(20).max(200),
  avatarUrl: z.url().max(2_048).optional(),
  isActive: z.boolean().default(true),
  lastSeenAt: z.date().optional(),
});

export const storySessionModelSchema = z.object({
  userId: objectIdSchema,
  title: z.string().min(2).max(160),
  premise: z.string().min(12).max(2_000),
  genre: storyGenreSchema,
  enginePreset: z.enum(["freeform", "rpg-lite", "mystery", "social-drama"]).default("freeform"),
  tone: z.string().min(2).max(120),
  status: sessionStatusSchema.default("active"),
  currentTurn: z.number().int().min(0).default(0),
  currentSceneSummary: z.string().min(1).max(4_000),
  startTime: z.date(),
  lastPlayedAt: z.date(),
  recommendationTags: z.array(z.string().min(1).max(60)).max(24).default([]),
  searchKeywords: z.array(z.string().min(1).max(80)).max(40).default([]),
  storyDocumentId: objectIdSchema.optional(),
  branchKey: z.string().min(1).max(120).optional(),
  deterministic: z.boolean().default(false),
  seed: z.string().min(1).max(240).optional(),
  latestSceneTitle: z.string().min(1).max(240).optional(),
  latestSceneText: z.string().min(1).max(30_000).optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export const storyWorldModelSchema = z.object({
  storySessionId: objectIdSchema,
  setting: z.string().min(1).max(2_000),
  worldRules: z.array(z.string().min(1).max(300)).max(100).default([]),
  playerRole: z.string().min(1).max(240),
  conflict: z.string().min(1).max(2_000),
  startingLocation: z.string().min(1).max(240),
  seed: z.string().min(1).max(240),
  contentWarnings: z.array(z.string().min(1).max(120)).default([]),
});

export const characterStateModelSchema = z.object({
  storySessionId: objectIdSchema,
  externalId: z.string().min(1).max(120),
  name: z.string().min(1).max(120),
  role: z.string().min(1).max(160),
  personality: z.array(z.string().min(1).max(80)).max(20).default([]),
  relationshipScore: z.number().min(-100).max(100).default(0),
  relationshipBucket: relationshipBucketSchema.default("neutral"),
  statusFlags: z.array(z.string().min(1).max(80)).default([]),
  secretsKnown: z.array(z.string().min(1).max(200)).default([]),
  isPlayer: z.boolean().default(false),
});

export const sessionStateSnapshotModelSchema = z.object({
  storySessionId: objectIdSchema,
  turnNumber: z.number().int().min(0),
  kind: snapshotKindSchema.default("turn"),
  sceneId: z.string().min(1).max(120).optional(),
  summaryRefId: objectIdSchema.optional(),
  canonicalState: z.object({
    sceneSummary: z.string().min(1).max(6_000),
    worldState: z.record(z.string(), z.unknown()).default({}),
    characters: z.array(canonicalCharacterStateSchema).default([]),
    inventory: z.array(z.string().min(1).max(120)).default([]),
    questFlags: z.array(z.string().min(1).max(120)).default([]),
    customState: z.record(z.string(), z.unknown()).default({}),
  }),
});

export const turnLogModelSchema = z
  .object({
    storySessionId: objectIdSchema,
    turnNumber: z.number().int().min(1),
    sceneTitle: z.string().min(1).max(240).optional(),
    sceneText: z.string().min(1).max(30_000),
    sceneSummary: z.string().min(1).max(4_000),
    presentedChoices: z.array(presentedChoiceSchema).max(8),
    chosenAction: z.string().min(1).max(2_000),
    actionSource: actionSourceSchema,
    selectedChoiceId: z.string().min(1).max(120).optional(),
    rawActionInput: z.string().min(1).max(2_000).optional(),
    gameOver: z.boolean().optional(),
    snapshotId: objectIdSchema.optional(),
    aiResponseRef: z
      .object({
        provider: apiProviderSchema,
        requestId: z.string().min(1).max(180).optional(),
        model: aiModelNameSchema.optional(),
        task: z.string().min(1).max(160).optional(),
        promptVersion: z.string().min(1).max(16).optional(),
        attempts: z.number().int().min(1).optional(),
        retryCount: z.number().int().min(0).optional(),
        providerRequestId: z.string().min(1).max(180).optional(),
        structuredOutput: z
          .object({
            status: z.enum(["validated", "repaired", "fallback"]),
            repairCount: z.number().int().min(0),
            hadValidationRetry: z.boolean(),
          })
          .optional(),
        consistency: z
          .object({
            checked: z.boolean(),
            valid: z.boolean(),
            issues: z.array(z.string().min(1).max(500)).max(12),
            recommendations: z.array(z.string().min(1).max(500)).max(12),
            repairAttempts: z.number().int().min(0).max(3),
            repaired: z.boolean(),
            usedFallbackRepair: z.boolean(),
          })
          .optional(),
        usageLogId: objectIdSchema.optional(),
        responseObjectPath: z.string().min(1).max(400).optional(),
      })
      .optional(),
  })
  .superRefine((value, ctx) => {
    if (value.actionSource === "choice" && !value.selectedChoiceId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "selectedChoiceId is required for choice actions.",
        path: ["selectedChoiceId"],
      });
    }

    if (value.actionSource === "custom" && !value.rawActionInput) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "rawActionInput is required for custom actions.",
        path: ["rawActionInput"],
      });
    }

    if (!value.gameOver && value.presentedChoices.length < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one presented choice is required unless the turn ended the story.",
        path: ["presentedChoices"],
      });
    }
  });

export const storySummaryModelSchema = z.object({
  storySessionId: objectIdSchema,
  turnNumber: z.number().int().min(0),
  kind: summaryKindSchema,
  content: z.string().min(1).max(12_000),
  tokensEstimated: z.number().int().min(0).optional(),
  sourceTurnRange: z
    .object({
      from: z.number().int().min(0),
      to: z.number().int().min(0),
    })
    .refine((range) => range.to >= range.from, {
      message: "sourceTurnRange.to must be greater than or equal to from.",
      path: ["to"],
    })
    .optional(),
  isCanonical: z.boolean().default(false),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export const userPreferenceModelSchema = z.object({
  userId: objectIdSchema,
  preferredGenres: z.array(storyGenreSchema).default([]),
  avoidedGenres: z.array(storyGenreSchema).default([]),
  preferredTones: z.array(z.string().min(1).max(120)).default([]),
  avoidedThemes: z.array(z.string().min(1).max(160)).default([]),
  customPromptHints: z.array(z.string().min(1).max(500)).default([]),
  interfaceLanguage: interfaceLanguageSchema.default("en"),
  storyOutputLanguage: storyOutputLanguageSchema.default("en"),
  themePreference: appThemeSchema.default("system"),
});

export const userAiProviderSettingsModelSchema = z.object({
  provider: userAiProviderSchema,
  isEnabled: z.boolean().default(false),
  hasApiKey: z.boolean().default(false),
  encryptedApiKey: z.string().min(1).max(6_000).optional(),
  apiKeyMasked: z.string().min(1).max(80).optional(),
  baseUrl: z.url().max(500).optional(),
  defaultModel: aiModelNameSchema.optional(),
  reasoningEffort: aiReasoningEffortSchema.optional(),
  taskModels: z
    .partialRecord(
      userAiTaskSchema,
      z.object({
        model: aiModelNameSchema,
        reasoningEffort: aiReasoningEffortSchema.optional(),
      }),
    )
    .default({}),
  headers: z
    .object({
      organizationId: z.string().min(1).max(200).optional(),
      projectId: z.string().min(1).max(200).optional(),
    })
    .default({}),
});

export const userAiSettingsModelSchema = z.object({
  userId: objectIdSchema,
  defaultProvider: userAiProviderSchema.optional(),
  providers: z.array(userAiProviderSettingsModelSchema).default([]),
  taskOverrides: z
    .partialRecord(
      userAiTaskSchema,
      z.object({
        provider: userAiProviderSchema,
        model: aiModelNameSchema.optional(),
        reasoningEffort: aiReasoningEffortSchema.optional(),
      }),
    )
    .default({}),
});

export const analyticsEventModelSchema = z.object({
  userId: objectIdSchema.optional(),
  storySessionId: objectIdSchema.optional(),
  eventType: analyticsEventTypeSchema,
  eventTime: z.date(),
  properties: z.record(z.string(), z.unknown()).default({}),
});

export const apiUsageLogModelSchema = z.object({
  userId: objectIdSchema.optional(),
  storySessionId: objectIdSchema.optional(),
  provider: apiProviderSchema,
  model: aiModelNameSchema,
  operation: z.string().min(1).max(160),
  status: apiUsageStatusSchema,
  latencyMs: z.number().int().min(0),
  promptTokens: z.number().int().min(0).optional(),
  completionTokens: z.number().int().min(0).optional(),
  totalTokens: z.number().int().min(0).optional(),
  estimatedCostUsd: z.number().min(0).optional(),
  requestId: z.string().min(1).max(180).optional(),
  errorCode: z.string().min(1).max(120).optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export type UserModelInput = z.infer<typeof userModelSchema>;
export type StorySessionModelInput = z.infer<typeof storySessionModelSchema>;
export type StoryWorldModelInput = z.infer<typeof storyWorldModelSchema>;
export type CharacterStateModelInput = z.infer<typeof characterStateModelSchema>;
export type SessionStateSnapshotModelInput = z.infer<
  typeof sessionStateSnapshotModelSchema
>;
export type TurnLogModelInput = z.infer<typeof turnLogModelSchema>;
export type StorySummaryModelInput = z.infer<typeof storySummaryModelSchema>;
export type UserPreferenceModelInput = z.infer<typeof userPreferenceModelSchema>;
export type UserAISettingsModelInput = z.infer<typeof userAiSettingsModelSchema>;
export type AnalyticsEventModelInput = z.infer<typeof analyticsEventModelSchema>;
export type APIUsageLogModelInput = z.infer<typeof apiUsageLogModelSchema>;
