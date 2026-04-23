import { z } from "zod";

const genreSchema = z.enum([
  "fantasy",
  "mystery",
  "romance",
  "sci-fi",
  "horror",
  "politics",
  "school-life",
  "survival",
  "custom",
]);

const enginePresetSchema = z.enum([
  "freeform",
  "rpg-lite",
  "mystery",
  "social-drama",
]);

export const createStorySchema = z.object({
  titleHint: z.string().min(2).max(120).optional(),
  genre: genreSchema,
  premise: z.string().min(12).max(2_000),
  tone: z.string().min(3).max(120).default("cinematic"),
  enginePreset: enginePresetSchema.default("freeform"),
  deterministic: z.boolean().default(false),
  seed: z.string().min(3).max(120).optional(),
});

export const continueStorySchema = z
  .object({
    actionType: z.enum(["choice", "custom"]),
    choiceId: z.string().min(1).optional(),
    customInput: z.string().min(1).max(1_000).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.actionType === "choice" && !value.choiceId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "choiceId is required when actionType is choice.",
        path: ["choiceId"],
      });
    }

    if (value.actionType === "custom" && !value.customInput) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "customInput is required when actionType is custom.",
        path: ["customInput"],
      });
    }
  });

export type CreateStoryInput = z.infer<typeof createStorySchema>;
export type ContinueStoryInput = z.infer<typeof continueStorySchema>;
