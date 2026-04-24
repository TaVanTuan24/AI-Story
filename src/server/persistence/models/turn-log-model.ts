import {
  InferSchemaType,
  type HydratedDocument,
  model,
  models,
  Schema,
  Types,
} from "mongoose";

import { ACTION_SOURCES, API_PROVIDERS } from "@/server/persistence/shared/constants";

const presentedChoiceSchema = new Schema(
  {
    id: { type: String, required: true, trim: true, maxlength: 120 },
    label: { type: String, required: true, trim: true, maxlength: 300 },
    intent: { type: String, required: true, trim: true, maxlength: 300 },
  },
  { _id: false },
);

const aiResponseRefSchema = new Schema(
  {
    provider: {
      type: String,
      required: true,
      enum: API_PROVIDERS,
    },
    requestId: {
      type: String,
      trim: true,
      maxlength: 180,
    },
    model: {
      type: String,
      trim: true,
      maxlength: 160,
    },
    task: {
      type: String,
      trim: true,
      maxlength: 160,
    },
    promptVersion: {
      type: String,
      trim: true,
      maxlength: 16,
    },
    attempts: {
      type: Number,
      min: 1,
    },
    retryCount: {
      type: Number,
      min: 0,
    },
    providerRequestId: {
      type: String,
      trim: true,
      maxlength: 180,
    },
    structuredOutput: {
      status: {
        type: String,
        enum: ["validated", "repaired", "fallback"],
      },
      repairCount: {
        type: Number,
        min: 0,
        default: 0,
      },
      hadValidationRetry: {
        type: Boolean,
        default: false,
      },
    },
    consistency: {
      checked: { type: Boolean, default: false },
      valid: { type: Boolean, default: true },
      issues: { type: [String], default: [] },
      recommendations: { type: [String], default: [] },
      repairAttempts: { type: Number, min: 0, default: 0 },
      repaired: { type: Boolean, default: false },
      usedFallbackRepair: { type: Boolean, default: false },
    },
    usageLogId: {
      type: Types.ObjectId,
      ref: "APIUsageLog",
    },
    responseObjectPath: {
      type: String,
      trim: true,
      maxlength: 400,
    },
  },
  { _id: false },
);

const turnLogSchema = new Schema(
  {
    storySessionId: {
      type: Types.ObjectId,
      ref: "StorySession",
      required: true,
      index: true,
    },
    turnNumber: {
      type: Number,
      required: true,
      min: 1,
      index: true,
    },
    sceneTitle: {
      type: String,
      trim: true,
      maxlength: 240,
    },
    sceneText: {
      type: String,
      required: true,
      trim: true,
      maxlength: 30_000,
    },
    sceneSummary: {
      type: String,
      required: true,
      trim: true,
      maxlength: 4_000,
    },
    presentedChoices: {
      type: [presentedChoiceSchema],
      required: true,
      default: [],
    },
    chosenAction: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2_000,
    },
    actionSource: {
      type: String,
      required: true,
      enum: ACTION_SOURCES,
      index: true,
    },
    selectedChoiceId: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    rawActionInput: {
      type: String,
      trim: true,
      maxlength: 2_000,
    },
    gameOver: {
      type: Boolean,
      required: true,
      default: false,
    },
    snapshotId: {
      type: Types.ObjectId,
      ref: "SessionStateSnapshot",
    },
    aiResponseRef: {
      type: aiResponseRefSchema,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

turnLogSchema.path("presentedChoices").validate(function (value: unknown[]) {
  if ((this as { gameOver?: boolean }).gameOver) {
    return value.length <= 8;
  }

  return value.length >= 1 && value.length <= 8;
}, "Turn must contain between 1 and 8 presented choices unless the story has ended.");

turnLogSchema.index({ storySessionId: 1, turnNumber: 1 }, { unique: true });
turnLogSchema.index({ storySessionId: 1, createdAt: -1 });
turnLogSchema.index({ actionSource: 1, createdAt: -1 });
turnLogSchema.index({ "aiResponseRef.requestId": 1 });

export type TurnLogDocument = HydratedDocument<InferSchemaType<typeof turnLogSchema>>;
export const TurnLogModel = models.TurnLog ?? model("TurnLog", turnLogSchema);
