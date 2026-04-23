import { Schema, model, models } from "mongoose";

const storySchema = new Schema(
  {
    title: { type: String, required: true },
    genre: { type: String, required: true },
    premise: { type: String, required: true },
    tone: { type: String, required: true },
    enginePreset: { type: String, required: true, default: "freeform" },
    currentScene: { type: Schema.Types.Mixed, required: true },
    scenes: { type: [Schema.Types.Mixed], required: true, default: [] },
    summary: { type: String, required: true },
    summaryCandidate: { type: String, required: true, default: "" },
    worldRules: { type: [String], required: true, default: [] },
    memory: {
      shortTerm: { type: [Schema.Types.Mixed], required: true, default: [] },
      rollingSummaries: { type: [Schema.Types.Mixed], required: true, default: [] },
      canon: {
        type: Schema.Types.Mixed,
        required: true,
        default: {
          facts: [],
          irreversibleEvents: [],
          importantFlags: [],
          conflicts: [],
        },
      },
      entities: { type: [String], required: true, default: [] },
    },
    canonicalState: { type: Schema.Types.Mixed, required: true },
    availableActions: { type: [Schema.Types.Mixed], required: true, default: [] },
    turnHistory: { type: [Schema.Types.Mixed], required: true, default: [] },
    metadata: {
      branchKey: { type: String, required: true },
      turnCount: { type: Number, required: true, default: 0 },
      status: {
        type: String,
        enum: ["active", "completed", "paused"],
        required: true,
        default: "active",
      },
      lastUpdatedAt: { type: String, required: true },
      deterministic: { type: Boolean, required: true, default: false },
      seed: { type: String, required: true },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const StoryModel = models.Story ?? model("Story", storySchema);
