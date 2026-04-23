import { connectToDatabase } from "@/lib/db/mongoose";
import { CharacterStateModel } from "@/server/persistence/models/character-state-model";

export class CharacterStateRepository {
  async replaceForSession(storySessionId: string, characters: Array<Record<string, unknown>>) {
    await connectToDatabase();
    await CharacterStateModel.deleteMany({ storySessionId });
    if (characters.length === 0) {
      return [];
    }
    return CharacterStateModel.insertMany(characters, { ordered: true });
  }

  async findBySessionId(storySessionId: string) {
    await connectToDatabase();
    return CharacterStateModel.find({ storySessionId }).sort({ isPlayer: -1, name: 1 }).lean();
  }

  async deleteBySessionId(storySessionId: string) {
    await connectToDatabase();
    await CharacterStateModel.deleteMany({ storySessionId });
  }
}
