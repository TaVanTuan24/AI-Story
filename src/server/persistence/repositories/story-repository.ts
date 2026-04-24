import { Types } from "mongoose";

import { connectToDatabase } from "@/lib/db/mongoose";
import { ensureStoryStateDefaults } from "@/server/narrative/state-normalizer";
import type { StoryState } from "@/server/narrative/types";
import { StoryModel } from "@/server/persistence/models/story-model";

export type StoryDocumentState = StoryState & { id: string };

export class StoryRepository {
  async create(story: StoryState) {
    await connectToDatabase();
    const created = await StoryModel.create(this.toPersistenceShape(story));
    return this.toState(created.toObject());
  }

  async findById(storyId: string) {
    await connectToDatabase();

    if (!Types.ObjectId.isValid(storyId)) {
      return null;
    }

    const story = await StoryModel.findById(storyId).lean();
    return story ? this.toState(story) : null;
  }

  async update(storyId: string, story: StoryState) {
    await connectToDatabase();
    const updated = await StoryModel.findByIdAndUpdate(
      storyId,
      this.toPersistenceShape(story),
      {
      returnDocument: "after",
      runValidators: true,
      },
    ).lean();

    return updated ? this.toState(updated) : null;
  }

  async delete(storyId: string) {
    await connectToDatabase();
    if (!Types.ObjectId.isValid(storyId)) {
      return null;
    }
    return StoryModel.findByIdAndDelete(storyId).lean();
  }

  private toState(document: Record<string, unknown>) {
    return ensureStoryStateDefaults({
      id: String(document._id),
      ...document,
    } as StoryDocumentState);
  }

  private toPersistenceShape(story: StoryState) {
    return {
      title: story.title,
      genre: story.genre,
      premise: story.premise,
      tone: story.tone,
      enginePreset: story.enginePreset,
      currentScene: story.currentScene,
      scenes: story.scenes,
      summary: story.summary,
      summaryCandidate: story.summaryCandidate,
      worldRules: story.worldRules,
      memory: story.memory,
      canonicalState: story.canonicalState,
      availableActions: story.availableActions,
      turnHistory: story.turnHistory,
      storyHistory: story.storyHistory,
      coreState: story.coreState,
      dynamicStats: story.dynamicStats,
      relationships: story.relationships,
      playerStats: story.playerStats,
      inventory: story.inventory,
      abilities: story.abilities,
      flags: story.flags,
      worldMemory: story.worldMemory,
      lastChoice: story.lastChoice,
      gameOver: story.gameOver,
      metadata: story.metadata,
    };
  }
}
