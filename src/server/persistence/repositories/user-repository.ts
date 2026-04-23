import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db/mongoose";
import { UserModel } from "@/server/persistence/models/user-model";

export class UserRepository {
  async create(input: {
    email: string;
    displayName: string;
    passwordHash: string;
  }) {
    await connectToDatabase();
    const created = await UserModel.create({
      ...input,
      isActive: true,
    });
    return created.toObject();
  }

  async findByEmail(email: string, includePasswordHash = false) {
    await connectToDatabase();
    const query = UserModel.findOne({ email: email.toLowerCase().trim() });
    if (includePasswordHash) {
      query.select("+passwordHash");
    }
    return query.lean();
  }

  async findById(userId: string, includePasswordHash = false) {
    await connectToDatabase();
    if (!Types.ObjectId.isValid(userId)) {
      return null;
    }
    const query = UserModel.findById(userId);
    if (includePasswordHash) {
      query.select("+passwordHash");
    }
    return query.lean();
  }

  async updateLastSeen(userId: string) {
    await connectToDatabase();
    await UserModel.findByIdAndUpdate(userId, { lastSeenAt: new Date() });
  }
}
