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
      validate: [
        (value: unknown[]) => value.length >= 1 && value.length <= 8,
        "Turn must contain between 1 and 8 presented choices.",
      ],
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

turnLogSchema.index({ storySessionId: 1, turnNumber: 1 }, { unique: true });
turnLogSchema.index({ storySessionId: 1, createdAt: -1 });
turnLogSchema.index({ actionSource: 1, createdAt: -1 });
turnLogSchema.index({ "aiResponseRef.requestId": 1 });

export type TurnLogDocument = HydratedDocument<InferSchemaType<typeof turnLogSchema>>;
export const TurnLogModel = models.TurnLog ?? model("TurnLog", turnLogSchema);
