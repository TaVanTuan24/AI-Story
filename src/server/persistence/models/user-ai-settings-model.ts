import {
  InferSchemaType,
  type HydratedDocument,
  model,
  models,
  Schema,
  Types,
} from "mongoose";

import {
  USER_AI_PROVIDERS,
  USER_AI_TASKS,
} from "@/server/persistence/shared/constants";

const taskModelSchema = new Schema(
  {
    model: { type: String, trim: true, maxlength: 160 },
    reasoningEffort: {
      type: String,
      enum: ["low", "medium", "high"],
    },
  },
  { _id: false },
);

const taskOverrideSchema = new Schema(
  {
    provider: {
      type: String,
      enum: USER_AI_PROVIDERS,
      required: true,
    },
    model: {
      type: String,
      trim: true,
      maxlength: 160,
    },
    reasoningEffort: {
      type: String,
      enum: ["low", "medium", "high"],
    },
  },
  { _id: false },
);

const providerSettingsSchema = new Schema(
  {
    provider: {
      type: String,
      required: true,
      enum: USER_AI_PROVIDERS,
    },
    isEnabled: {
      type: Boolean,
      required: true,
      default: false,
    },
    hasApiKey: {
      type: Boolean,
      required: true,
      default: false,
    },
    encryptedApiKey: {
      type: String,
      trim: true,
      maxlength: 6_000,
      select: false,
    },
    apiKeyMasked: {
      type: String,
      trim: true,
      maxlength: 80,
    },
    baseUrl: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    defaultModel: {
      type: String,
      trim: true,
      maxlength: 160,
    },
    reasoningEffort: {
      type: String,
      enum: ["low", "medium", "high"],
    },
    taskModels: {
      type: Map,
      of: taskModelSchema,
      default: {},
    },
    headers: {
      organizationId: { type: String, trim: true, maxlength: 200 },
      projectId: { type: String, trim: true, maxlength: 200 },
    },
  },
  {
    _id: false,
    timestamps: true,
  },
);

const userAiSettingsSchema = new Schema(
  {
    userId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    defaultProvider: {
      type: String,
      enum: USER_AI_PROVIDERS,
    },
    providers: {
      type: [providerSettingsSchema],
      default: [],
      validate: [
        (providers: Array<{ provider: string }>) =>
          new Set(providers.map((entry) => entry.provider)).size === providers.length,
        "Provider settings must be unique per provider.",
      ],
    },
    taskOverrides: {
      type: Map,
      of: taskOverrideSchema,
      default: {},
      validate: [
        (value: Map<string, unknown>) =>
          Array.from(value.keys()).every((key) =>
            (USER_AI_TASKS as readonly string[]).includes(key),
          ),
        "Unknown AI task override.",
      ],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export type UserAISettingsDocument = HydratedDocument<
  InferSchemaType<typeof userAiSettingsSchema>
>;
export const UserAISettingsModel =
  models.UserAISettings ?? model("UserAISettings", userAiSettingsSchema);
