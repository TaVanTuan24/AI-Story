import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db/mongoose";
import { StorySessionModel } from "@/server/persistence/models/story-session-model";

export class StorySessionRepository {
  async create(input: Record<string, unknown>) {
    await connectToDatabase();
    const created = await StorySessionModel.create(input);
    return created.toObject();
  }

  async listByUserId(userId: string) {
    await connectToDatabase();
    return StorySessionModel.find({ userId }).sort({ lastPlayedAt: -1 }).lean();
  }

  async findOwnedById(userId: string, sessionId: string) {
    await connectToDatabase();
    if (!Types.ObjectId.isValid(sessionId)) {
      return null;
    }
    return StorySessionModel.findOne({ _id: sessionId, userId }).lean();
  }

  async updateOwned(userId: string, sessionId: string, update: Record<string, unknown>) {
    await connectToDatabase();
    return StorySessionModel.findOneAndUpdate(
      { _id: sessionId, userId },
      update,
      { returnDocument: "after", runValidators: true },
    ).lean();
  }

  async deleteOwned(userId: string, sessionId: string) {
    await connectToDatabase();
    return StorySessionModel.findOneAndDelete({ _id: sessionId, userId }).lean();
  }
}
