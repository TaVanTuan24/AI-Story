import {
  InferSchemaType,
  type HydratedDocument,
  model,
  models,
  Schema,
  Types,
} from "mongoose";

const storyWorldSchema = new Schema(
  {
    storySessionId: {
      type: Types.ObjectId,
      ref: "StorySession",
      required: true,
      unique: true,
      index: true,
    },
    setting: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2_000,
    },
    worldRules: {
      type: [String],
      required: true,
      default: [],
      validate: [(value: string[]) => value.length <= 100, "Too many world rules."],
    },
    playerRole: {
      type: String,
      required: true,
      trim: true,
      maxlength: 240,
    },
    conflict: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2_000,
    },
    startingLocation: {
      type: String,
      required: true,
      trim: true,
      maxlength: 240,
    },
    seed: {
      type: String,
      required: true,
      trim: true,
      maxlength: 240,
    },
    contentWarnings: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

storyWorldSchema.index({ seed: 1 });
storyWorldSchema.index({ updatedAt: -1 });

export type StoryWorldDocument = HydratedDocument<
  InferSchemaType<typeof storyWorldSchema>
>;
export const StoryWorldModel = models.StoryWorld ?? model("StoryWorld", storyWorldSchema);
