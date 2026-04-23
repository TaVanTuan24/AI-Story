import {
  InferSchemaType,
  type HydratedDocument,
  model,
  models,
  Schema,
  Types,
} from "mongoose";

import { RELATIONSHIP_BUCKETS, SNAPSHOT_KINDS } from "@/server/persistence/shared/constants";

const canonicalCharacterSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    role: { type: String, required: true, trim: true, maxlength: 160 },
    personality: { type: [String], required: true, default: [] },
    relationshipScore: { type: Number, required: true, min: -100, max: 100, default: 0 },
    relationshipBucket: {
      type: String,
      required: true,
      enum: RELATIONSHIP_BUCKETS,
      default: "neutral",
    },
    statusFlags: { type: [String], required: true, default: [] },
    secretsKnown: { type: [String], required: true, default: [] },
    isPlayer: { type: Boolean, required: true, default: false },
  },
  { _id: false },
);

const sessionStateSnapshotSchema = new Schema(
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
      enum: SNAPSHOT_KINDS,
      default: "turn",
      index: true,
    },
    sceneId: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    summaryRefId: {
      type: Types.ObjectId,
      ref: "StorySummary",
    },
    canonicalState: {
      sceneSummary: {
        type: String,
        required: true,
        trim: true,
        maxlength: 6_000,
      },
      worldState: {
        type: Schema.Types.Mixed,
        required: true,
        default: {},
      },
      characters: {
        type: [canonicalCharacterSchema],
        required: true,
        default: [],
      },
      inventory: {
        type: [String],
        required: true,
        default: [],
      },
      questFlags: {
        type: [String],
        required: true,
        default: [],
      },
      customState: {
        type: Schema.Types.Mixed,
        required: true,
        default: {},
      },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

sessionStateSnapshotSchema.index({ storySessionId: 1, turnNumber: -1, kind: 1 });
sessionStateSnapshotSchema.index({ storySessionId: 1, createdAt: -1 });
sessionStateSnapshotSchema.index(
  { storySessionId: 1, turnNumber: 1, kind: 1 },
  { unique: true },
);

export type SessionStateSnapshotDocument = HydratedDocument<
  InferSchemaType<typeof sessionStateSnapshotSchema>
>;
export const SessionStateSnapshotModel =
  models.SessionStateSnapshot ??
  model("SessionStateSnapshot", sessionStateSnapshotSchema);
