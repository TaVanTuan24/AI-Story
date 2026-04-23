import { connectToDatabase } from "@/lib/db/mongoose";
import { TurnLogModel } from "@/server/persistence/models/turn-log-model";

export class TurnLogRepository {
  async create(input: Record<string, unknown>) {
    await connectToDatabase();
    const created = await TurnLogModel.create(input);
    return created.toObject();
  }

  async listBySessionId(storySessionId: string) {
    await connectToDatabase();
    return TurnLogModel.find({ storySessionId }).sort({ turnNumber: 1 }).lean();
  }

  async listRecentBySessionId(storySessionId: string, limit: number) {
    await connectToDatabase();
    const turns = await TurnLogModel.find({ storySessionId })
      .sort({ turnNumber: -1 })
      .limit(limit)
      .lean();

    return turns.reverse();
  }

  async deleteBySessionId(storySessionId: string) {
    await connectToDatabase();
    await TurnLogModel.deleteMany({ storySessionId });
  }
}
