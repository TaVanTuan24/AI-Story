import { connectToDatabase } from "@/lib/db/mongoose";
import { SessionStateSnapshotModel } from "@/server/persistence/models/session-state-snapshot-model";

export class SessionStateSnapshotRepository {
  async create(input: Record<string, unknown>) {
    await connectToDatabase();
    const created = await SessionStateSnapshotModel.create(input);
    return created.toObject();
  }

  async listBySessionId(storySessionId: string) {
    await connectToDatabase();
    return SessionStateSnapshotModel.find({ storySessionId }).sort({ turnNumber: -1 }).lean();
  }

  async deleteBySessionId(storySessionId: string) {
    await connectToDatabase();
    await SessionStateSnapshotModel.deleteMany({ storySessionId });
  }
}
