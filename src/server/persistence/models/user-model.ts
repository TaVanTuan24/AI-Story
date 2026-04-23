import {
  InferSchemaType,
  type HydratedDocument,
  model,
  models,
  Schema,
} from "mongoose";

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 320,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    passwordHash: {
      type: String,
      required: true,
      minlength: 20,
      maxlength: 200,
      select: false,
    },
    avatarUrl: {
      type: String,
      trim: true,
      maxlength: 2_048,
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
      index: true,
    },
    lastSeenAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ createdAt: -1 });

export type UserDocument = HydratedDocument<InferSchemaType<typeof userSchema>>;
export const UserModel = models.User ?? model("User", userSchema);
