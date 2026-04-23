import {
  InferSchemaType,
  type HydratedDocument,
  model,
  models,
  Schema,
  Types,
} from "mongoose";

import {
  SESSION_STATUSES,
  STORY_GENRES,
} from "@/server/persistence/shared/constants";
import { Schema as MongooseSchema } from "mongoose";

const storySessionSchema = new Schema(
  {
    userId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 160,
    },
    premise: {
      type: String,
      required: true,
      trim: true,
      minlength: 12,
      maxlength: 2_000,
    },
    genre: {
      type: String,
      required: true,
      enum: STORY_GENRES,
      index: true,
    },
    enginePreset: {
      type: String,
      required: true,
      enum: ["freeform", "rpg-lite", "mystery", "social-drama"],
      default: "freeform",
    },
    tone: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    status: {
      type: String,
      required: true,
      enum: SESSION_STATUSES,
      default: "active",
      index: true,
    },
    currentTurn: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    currentSceneSummary: {
      type: String,
      required: true,
      trim: true,
      maxlength: 4_000,
    },
    startTime: {
      type: Date,
      required: true,
      default: () => new Date(),
      index: true,
    },
    lastPlayedAt: {
      type: Date,
      required: true,
      default: () => new Date(),
      index: true,
    },
    recommendationTags: {
      type: [String],
      default: [],
      validate: [(value: string[]) => value.length <= 24, "Too many recommendation tags."],
    },
    searchKeywords: {
      type: [String],
      default: [],
      validate: [(value: string[]) => value.length <= 40, "Too many search keywords."],
    },
    storyDocumentId: {
      type: Types.ObjectId,
      ref: "Story",
      index: true,
    },
    branchKey: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    deterministic: {
      type: Boolean,
      required: true,
      default: false,
    },
    seed: {
      type: String,
      trim: true,
      maxlength: 240,
    },
    latestSceneTitle: {
      type: String,
      trim: true,
      maxlength: 240,
    },
    latestSceneText: {
      type: String,
      trim: true,
      maxlength: 30_000,
    },
    metadata: {
      type: MongooseSchema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

storySessionSchema.index({ userId: 1, lastPlayedAt: -1 });
storySessionSchema.index({ userId: 1, status: 1, lastPlayedAt: -1 });
storySessionSchema.index({ genre: 1, status: 1, updatedAt: -1 });
storySessionSchema.index({ recommendationTags: 1 });
storySessionSchema.index({ searchKeywords: 1 });

export type StorySessionDocument = HydratedDocument<
  InferSchemaType<typeof storySessionSchema>
>;
export const StorySessionModel =
  models.StorySession ?? model("StorySession", storySessionSchema);
