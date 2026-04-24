import { connectToDatabase } from "@/lib/db/mongoose";
import { UserPreferenceModel } from "@/server/persistence/models/user-preference-model";

export class UserPreferenceRepository {
  async upsertDefault(userId: string) {
    await connectToDatabase();
    return UserPreferenceModel.findOneAndUpdate(
      { userId },
      {
        $setOnInsert: {
          userId,
          preferredGenres: [],
          avoidedGenres: [],
          preferredTones: [],
          avoidedThemes: [],
          customPromptHints: [],
          interfaceLanguage: "en",
          storyOutputLanguage: "en",
          themePreference: "system",
        },
      },
      { upsert: true, returnDocument: "after" },
    ).lean();
  }

  async findByUserId(userId: string) {
    await connectToDatabase();
    return UserPreferenceModel.findOne({ userId }).lean();
  }

  async update(userId: string, input: Record<string, unknown>) {
    await connectToDatabase();
    return UserPreferenceModel.findOneAndUpdate({ userId }, input, {
      upsert: true,
      returnDocument: "after",
      runValidators: true,
    }).lean();
  }
}
