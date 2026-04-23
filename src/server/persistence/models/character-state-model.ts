import {
  InferSchemaType,
  type HydratedDocument,
  model,
  models,
  Schema,
  Types,
} from "mongoose";

import { RELATIONSHIP_BUCKETS } from "@/server/persistence/shared/constants";

const characterStateSchema = new Schema(
  {
    storySessionId: {
      type: Types.ObjectId,
      ref: "StorySession",
      required: true,
      index: true,
    },
    externalId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    role: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    personality: {
      type: [String],
      required: true,
      default: [],
      validate: [(value: string[]) => value.length <= 20, "Too many personality traits."],
    },
    relationshipScore: {
      type: Number,
      required: true,
      min: -100,
      max: 100,
      default: 0,
      index: true,
    },
    relationshipBucket: {
      type: String,
      required: true,
      enum: RELATIONSHIP_BUCKETS,
      default: "neutral",
      index: true,
    },
    statusFlags: {
      type: [String],
      required: true,
      default: [],
    },
    secretsKnown: {
      type: [String],
      required: true,
      default: [],
    },
    isPlayer: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

characterStateSchema.index({ storySessionId: 1, externalId: 1 }, { unique: true });
characterStateSchema.index({ storySessionId: 1, name: 1 });
characterStateSchema.index({ storySessionId: 1, relationshipBucket: 1 });

export type CharacterStateDocument = HydratedDocument<
  InferSchemaType<typeof characterStateSchema>
>;
export const CharacterStateModel =
  models.CharacterState ?? model("CharacterState", characterStateSchema);
