import {
  InferSchemaType,
  type HydratedDocument,
  model,
  models,
  Schema,
  Types,
} from "mongoose";

import { STORY_GENRES } from "@/server/persistence/shared/constants";

const userPreferenceSchema = new Schema(
  {
    userId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    preferredGenres: {
      type: [String],
      enum: STORY_GENRES,
      default: [],
    },
    avoidedGenres: {
      type: [String],
      enum: STORY_GENRES,
      default: [],
    },
    preferredTones: {
      type: [String],
      default: [],
    },
    avoidedThemes: {
      type: [String],
      default: [],
    },
    customPromptHints: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

userPreferenceSchema.index({ preferredGenres: 1 });
userPreferenceSchema.index({ avoidedGenres: 1 });

export type UserPreferenceDocument = HydratedDocument<
  InferSchemaType<typeof userPreferenceSchema>
>;
export const UserPreferenceModel =
  models.UserPreference ?? model("UserPreference", userPreferenceSchema);
