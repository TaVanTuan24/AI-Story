import { z } from "zod";

import { storyGenreSchema } from "@/server/validation/data-model-schemas";

const safeText = () =>
  z
    .string()
    .trim()
    .min(1)
    .max(2_000)
    .refine((value) => !/[<>]/.test(value), {
      message: "Angle bracket markup is not allowed.",
    });

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

export const updatePreferencesSchema = z.object({
  preferredGenres: z.array(storyGenreSchema).optional(),
  avoidedGenres: z.array(storyGenreSchema).optional(),
  preferredTones: z.array(safeText().min(1).max(120)).optional(),
  avoidedThemes: z.array(safeText().min(1).max(160)).optional(),
  customPromptHints: z.array(safeText().min(1).max(500)).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateStorySessionInput = z.infer<typeof createStorySessionSchema>;
export type StorySessionActionInput = z.infer<typeof storySessionActionSchema>;
export type StorySessionCustomActionInput = z.infer<typeof storySessionCustomActionSchema>;
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;
