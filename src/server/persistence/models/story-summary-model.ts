import {
  InferSchemaType,
  type HydratedDocument,
  model,
  models,
  Schema,
  Types,
} from "mongoose";

import { SUMMARY_KINDS } from "@/server/persistence/shared/constants";

const storySummarySchema = new Schema(
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
      min: 0,
      index: true,
    },
    kind: {
      type: String,
      required: true,
      enum: SUMMARY_KINDS,
      index: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 12_000,
    },
    tokensEstimated: {
      type: Number,
      min: 0,
    },
    sourceTurnRange: {
      from: {
        type: Number,
        min: 0,
      },
      to: {
        type: Number,
        min: 0,
      },
    },
    isCanonical: {
      type: Boolean,
      required: true,
      default: false,
      index: true,
    },
    payload: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

storySummarySchema.index({ storySessionId: 1, kind: 1, turnNumber: -1 });
storySummarySchema.index({ storySessionId: 1, isCanonical: 1, turnNumber: -1 });
storySummarySchema.index(
  { storySessionId: 1, turnNumber: 1, kind: 1 },
  { unique: true },
);

export type StorySummaryDocument = HydratedDocument<
  InferSchemaType<typeof storySummarySchema>
>;
export const StorySummaryModel =
  models.StorySummary ?? model("StorySummary", storySummarySchema);
