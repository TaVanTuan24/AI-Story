import { connectToDatabase } from "@/lib/db/mongoose";
import { StorySummaryModel } from "@/server/persistence/models/story-summary-model";

export class StorySummaryRepository {
  async replaceTurnSummaries(storySessionId: string, turnNumber: number, summaries: Array<Record<string, unknown>>) {
    await connectToDatabase();
    await StorySummaryModel.deleteMany({ storySessionId, turnNumber });
    if (summaries.length === 0) {
      return [];
    }
    return StorySummaryModel.insertMany(summaries, { ordered: true });
  }

  async listBySessionId(storySessionId: string) {
    await connectToDatabase();
    return StorySummaryModel.find({ storySessionId }).sort({ turnNumber: 1 }).lean();
  }

  async listRollingBySessionId(storySessionId: string, limit: number) {
    await connectToDatabase();
    return StorySummaryModel.find({
      storySessionId,
      kind: "rolling",
    })
      .sort({ turnNumber: -1 })
      .limit(limit)
      .lean();
  }

  async findLatestCanonBySessionId(storySessionId: string) {
    await connectToDatabase();
    return StorySummaryModel.findOne({
      storySessionId,
      kind: "canon",
    })
      .sort({ turnNumber: -1 })
      .lean();
  }

  async deleteBySessionId(storySessionId: string) {
    await connectToDatabase();
    await StorySummaryModel.deleteMany({ storySessionId });
  }
}
