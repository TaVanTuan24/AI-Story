import {
  InferSchemaType,
  type HydratedDocument,
  model,
  models,
  Schema,
  Types,
} from "mongoose";

import { ANALYTICS_EVENT_TYPES } from "@/server/persistence/shared/constants";

const analyticsEventSchema = new Schema(
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
    eventType: {
      type: String,
      required: true,
      enum: ANALYTICS_EVENT_TYPES,
      index: true,
    },
    eventTime: {
      type: Date,
      required: true,
      default: () => new Date(),
      index: true,
    },
    properties: {
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

analyticsEventSchema.index({ eventType: 1, eventTime: -1 });
analyticsEventSchema.index({ storySessionId: 1, eventTime: -1 });
analyticsEventSchema.index({ userId: 1, eventTime: -1 });

export type AnalyticsEventDocument = HydratedDocument<
  InferSchemaType<typeof analyticsEventSchema>
>;
export const AnalyticsEventModel =
  models.AnalyticsEvent ?? model("AnalyticsEvent", analyticsEventSchema);
