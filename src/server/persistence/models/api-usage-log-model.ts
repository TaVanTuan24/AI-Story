import {
  InferSchemaType,
  type HydratedDocument,
  model,
  models,
  Schema,
  Types,
} from "mongoose";

import {
  API_PROVIDERS,
  API_USAGE_STATUSES,
} from "@/server/persistence/shared/constants";

const apiUsageLogSchema = new Schema(
  {
    userId: {
      type: Types.ObjectId,
      ref: "User",
      index: true,
    },
    storySessionId: {
      type: Types.ObjectId,
      ref: "StorySession",
      index: true,
    },
    provider: {
      type: String,
      required: true,
      enum: API_PROVIDERS,
      index: true,
    },
    model: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    operation: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: API_USAGE_STATUSES,
      index: true,
    },
    latencyMs: {
      type: Number,
      required: true,
      min: 0,
    },
    promptTokens: {
      type: Number,
      min: 0,
    },
    completionTokens: {
      type: Number,
      min: 0,
    },
    totalTokens: {
      type: Number,
      min: 0,
    },
    estimatedCostUsd: {
      type: Number,
      min: 0,
    },
    requestId: {
      type: String,
      trim: true,
      maxlength: 180,
      index: true,
    },
    errorCode: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    metadata: {
      type: Schema.Types.Mixed,
      required: true,
      default: {},
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

apiUsageLogSchema.index({ provider: 1, createdAt: -1 });
apiUsageLogSchema.index({ storySessionId: 1, createdAt: -1 });
apiUsageLogSchema.index({ status: 1, createdAt: -1 });

export type ApiUsageLogDocument = HydratedDocument<
  InferSchemaType<typeof apiUsageLogSchema>
>;
export const APIUsageLogModel =
  models.APIUsageLog ?? model("APIUsageLog", apiUsageLogSchema);
