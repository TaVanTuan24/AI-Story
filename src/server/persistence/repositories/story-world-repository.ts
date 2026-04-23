import { connectToDatabase } from "@/lib/db/mongoose";
import { StoryWorldModel } from "@/server/persistence/models/story-world-model";

export class StoryWorldRepository {
  async upsertBySessionId(storySessionId: string, input: Record<string, unknown>) {
    await connectToDatabase();
    return StoryWorldModel.findOneAndUpdate(
      { storySessionId },
      input,
      { upsert: true, returnDocument: "after", runValidators: true },
    ).lean();
  }

  async findBySessionId(storySessionId: string) {
    await connectToDatabase();
    return StoryWorldModel.findOne({ storySessionId }).lean();
  }

  async deleteBySessionId(storySessionId: string) {
    await connectToDatabase();
    await StoryWorldModel.deleteOne({ storySessionId });
  }
}
