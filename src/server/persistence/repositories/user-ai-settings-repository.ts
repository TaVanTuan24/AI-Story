import { connectToDatabase } from "@/lib/db/mongoose";
import { UserAISettingsModel } from "@/server/persistence/models/user-ai-settings-model";

export class UserAISettingsRepository {
  async upsertDefault(userId: string) {
    await connectToDatabase();
    return UserAISettingsModel.findOneAndUpdate(
      { userId },
      {
        $setOnInsert: {
          userId,
          providers: [],
          taskOverrides: {},
        },
      },
      { upsert: true, returnDocument: "after" },
    ).lean();
  }

  async findByUserId(userId: string, includeSecrets = false) {
    await connectToDatabase();
    const query = UserAISettingsModel.findOne({ userId });
    if (includeSecrets) {
      query.select("+providers.encryptedApiKey");
    }
    return query.lean();
  }

  async update(userId: string, input: Record<string, unknown>) {
    await connectToDatabase();
    return UserAISettingsModel.findOneAndUpdate(
      { userId },
      { $set: input, $setOnInsert: { userId } },
      {
        upsert: true,
        returnDocument: "after",
        runValidators: true,
      },
    )
      .select("+providers.encryptedApiKey")
      .lean();
  }
}
