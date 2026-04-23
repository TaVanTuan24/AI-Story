import mongoose from "mongoose";

import { demoSeeds, extractSearchKeywords, loadDotEnv } from "./shared-demo-data.mjs";

await loadDotEnv();

const mongoUri = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/ai-story";
const email = process.env.DEMO_EMAIL ?? "demo@aistory.local";

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, trim: true, lowercase: true },
    displayName: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    isActive: { type: Boolean, required: true, default: true },
  },
  { timestamps: true, versionKey: false },
);

const storySessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true },
    premise: { type: String, required: true, trim: true },
    genre: { type: String, required: true, index: true },
    enginePreset: { type: String, required: true, default: "freeform" },
    tone: { type: String, required: true, trim: true },
    status: { type: String, required: true, default: "paused", index: true },
    currentTurn: { type: Number, required: true, default: 0 },
    currentSceneSummary: { type: String, required: true, trim: true },
    startTime: { type: Date, required: true, default: () => new Date(), index: true },
    lastPlayedAt: { type: Date, required: true, default: () => new Date(), index: true },
    recommendationTags: { type: [String], default: [] },
    searchKeywords: { type: [String], default: [] },
    deterministic: { type: Boolean, required: true, default: false },
    seed: { type: String, trim: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, versionKey: false },
);

await mongoose.connect(mongoUri);

const User = mongoose.models.User ?? mongoose.model("User", userSchema);
const StorySession =
  mongoose.models.StorySession ?? mongoose.model("StorySession", storySessionSchema);

const user = await User.findOne({ email: email.toLowerCase() });
if (!user) {
  console.error(`No demo user found for ${email}. Run npm run demo:user first.`);
  await mongoose.disconnect();
  process.exit(1);
}

for (const seed of demoSeeds) {
  await StorySession.findOneAndUpdate(
    { userId: user._id, seed: `demo-${seed.id}` },
    {
      $set: {
        userId: user._id,
        title: seed.titleHint,
        premise: `${seed.premise} Seed prompt: ${seed.seedPrompt}`,
        genre: seed.genre,
        enginePreset: seed.enginePreset,
        tone: seed.tone,
        status: "paused",
        currentTurn: 0,
        currentSceneSummary: seed.premise,
        startTime: new Date(),
        lastPlayedAt: new Date(),
        recommendationTags: [seed.genre, seed.enginePreset],
        searchKeywords: extractSearchKeywords(seed.premise),
        deterministic: false,
        seed: `demo-${seed.id}`,
        metadata: {
          difficulty: seed.difficulty,
          lengthPreference: seed.lengthPreference,
          seedPrompt: seed.seedPrompt,
          demoSeed: seed.id,
        },
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}

console.log(`Created or updated ${demoSeeds.length} demo session blueprints for ${email}.`);
console.log("Open a session in the app and click Start session to call the configured AI provider.");

await mongoose.disconnect();
