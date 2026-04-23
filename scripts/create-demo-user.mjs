import bcrypt from "bcryptjs";
import mongoose from "mongoose";

import { loadDotEnv } from "./shared-demo-data.mjs";

await loadDotEnv();

const mongoUri = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/ai-story";
const email = process.env.DEMO_EMAIL ?? "demo@aistory.local";
const displayName = process.env.DEMO_DISPLAY_NAME ?? "Demo Player";
const password = process.env.DEMO_PASSWORD ?? "DemoPass123!";
const pepper = process.env.PASSWORD_PEPPER ?? "";
const bcryptRounds = Number(process.env.PASSWORD_BCRYPT_ROUNDS ?? 12);

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, trim: true, lowercase: true },
    displayName: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    isActive: { type: Boolean, required: true, default: true },
    lastSeenAt: Date,
  },
  { timestamps: true, versionKey: false },
);

userSchema.index({ email: 1 }, { unique: true });

await mongoose.connect(mongoUri);

const User = mongoose.models.User ?? mongoose.model("User", userSchema);
const passwordHash = await bcrypt.hash(`${password}${pepper}`, bcryptRounds);

const user = await User.findOneAndUpdate(
  { email },
  {
    $set: {
      email,
      displayName,
      passwordHash,
      isActive: true,
    },
  },
  { upsert: true, new: true, setDefaultsOnInsert: true },
);

console.log(`Demo user ready: ${email}`);
console.log(`Password: ${password}`);
console.log(`User id: ${user._id}`);

await mongoose.disconnect();
