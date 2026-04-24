import { z } from "zod";

import {
  storyGenreSchema,
  interfaceLanguageSchema,
  storyOutputLanguageSchema,
  aiReasoningEffortSchema,
  appThemeSchema,
  userAiProviderSchema,
  userAiTaskSchema,
} from "@/server/validation/data-model-schemas";

const safeText = () =>
  z
    .string()
    .trim()
    .min(1)
    .max(2_000)
    .refine((value) => !/[<>]/.test(value), {
      message: "Angle bracket markup is not allowed.",
    });

const modelNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(160)
  .regex(/^[A-Za-z0-9._:-]+$/, "Model names may only include letters, numbers, dots, dashes, underscores, and colons.");

export const registerSchema = z.object({
  email: z.email().trim().max(320),
  displayName: z.string().trim().min(2).max(80),
  password: z
    .string()
    .min(12)
    .max(100)
    .regex(/[A-Z]/, "Password must include an uppercase letter.")
    .regex(/[a-z]/, "Password must include a lowercase letter.")
    .regex(/[0-9]/, "Password must include a number."),
});

export const loginSchema = z.object({
  email: z.email().trim().max(320),
  password: z.string().min(12).max(100),
});

export const createStorySessionSchema = z.object({
  titleHint: safeText().min(2).max(120).optional(),
  premise: safeText().min(12).max(2_000),
  seedPrompt: safeText().min(3).max(500).optional(),
  genre: storyGenreSchema,
  tone: safeText().min(3).max(120),
  enginePreset: z
    .enum(["freeform", "rpg-lite", "mystery", "social-drama"])
    .default("freeform"),
  difficulty: z.enum(["relaxed", "standard", "hard"]).default("standard"),
  lengthPreference: z.enum(["short", "medium", "long", "endless"]).default("endless"),
  deterministic: z.boolean().default(false),
  seed: z.string().trim().min(3).max(120).optional(),
});

export const storySessionActionSchema = z.object({
  choiceId: z.string().min(1).max(120),
});

export const storySessionCustomActionSchema = z.object({
  customInput: safeText().min(2).max(1_000),
});

export const rewriteStoryIdeaSchema = z.object({
  text: safeText().min(12).max(2_000),
});

export const updatePreferencesSchema = z.object({
  preferredGenres: z.array(storyGenreSchema).optional(),
  avoidedGenres: z.array(storyGenreSchema).optional(),
  preferredTones: z.array(safeText().min(1).max(120)).optional(),
  avoidedThemes: z.array(safeText().min(1).max(160)).optional(),
  customPromptHints: z.array(safeText().min(1).max(500)).optional(),
  interfaceLanguage: interfaceLanguageSchema.optional(),
  storyOutputLanguage: storyOutputLanguageSchema.optional(),
  themePreference: appThemeSchema.optional(),
});

export const aiTaskAssignmentSchema = z.object({
  provider: userAiProviderSchema,
  model: modelNameSchema.optional(),
  reasoningEffort: aiReasoningEffortSchema.optional(),
});

const userAiProviderUpdateSchema = z.object({
  provider: userAiProviderSchema,
  isEnabled: z.boolean().optional(),
  apiKey: z.string().trim().min(1).max(4_000).optional(),
  newApiKey: z.string().trim().min(1).max(4_000).optional(),
  replaceApiKey: z.boolean().optional(),
  clearApiKey: z.boolean().optional(),
  baseUrl: z.string().url().max(500).nullish(),
  defaultModel: modelNameSchema.nullish(),
  reasoningEffort: aiReasoningEffortSchema.nullish(),
  taskModels: z
    .partialRecord(
      userAiTaskSchema,
      z.object({
        model: modelNameSchema,
        reasoningEffort: aiReasoningEffortSchema.optional(),
      }),
    )
    .optional(),
  headers: z
    .object({
      organizationId: z.string().trim().min(1).max(200).nullish(),
      projectId: z.string().trim().min(1).max(200).nullish(),
    })
    .optional(),
});

export const updateUserAISettingsSchema = z
  .object({
    defaultProvider: userAiProviderSchema.nullish(),
    providers: z.array(userAiProviderUpdateSchema).max(4).optional(),
    taskOverrides: z.partialRecord(userAiTaskSchema, aiTaskAssignmentSchema.nullable()).optional(),
  })
  .refine(
    (value) =>
      !value.providers ||
      new Set(value.providers.map((provider) => provider.provider)).size ===
        value.providers.length,
    {
      message: "Provider settings must be unique.",
      path: ["providers"],
    },
  )
  .superRefine((value, ctx) => {
    for (const [index, provider] of (value.providers ?? []).entries()) {
      if (provider.clearApiKey && (provider.apiKey || provider.newApiKey)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Choose either clearing the saved key or saving a new key, not both.",
          path: ["providers", index, "clearApiKey"],
        });
      }

      if (provider.replaceApiKey && !provider.apiKey && !provider.newApiKey) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Paste a new API key before replacing the saved key.",
          path: ["providers", index, "newApiKey"],
        });
      }
    }
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateStorySessionInput = z.infer<typeof createStorySessionSchema>;
export type StorySessionActionInput = z.infer<typeof storySessionActionSchema>;
export type StorySessionCustomActionInput = z.infer<typeof storySessionCustomActionSchema>;
export type RewriteStoryIdeaInput = z.infer<typeof rewriteStoryIdeaSchema>;
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;
export type UpdateUserAISettingsInput = z.infer<typeof updateUserAISettingsSchema>;
