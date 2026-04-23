import type { CreateStoryInput, ContinueStoryInput } from "@/server/validation/story-schemas";
import { TurnProcessingService } from "@/server/narrative/turn-processing-service";
import { StoryRepository } from "@/server/persistence/repositories/story-repository";

export class StoryService {
  constructor(
    private readonly turnProcessingService = new TurnProcessingService(),
    private readonly storyRepository = new StoryRepository(),
  ) {}

  async createStory(input: CreateStoryInput) {
    const processed = await this.turnProcessingService.createInitialTurn(input);
    return this.storyRepository.create(processed.state);
  }

  async getStory(storyId: string) {
    return this.storyRepository.findById(storyId);
  }

  async continueStory(storyId: string, input: ContinueStoryInput) {
    const existingStory = await this.storyRepository.findById(storyId);

    if (!existingStory) {
      throw new Error("Story not found.");
    }

    const processed = await this.turnProcessingService.processTurn(
      existingStory,
      toPlayerAction(input),
      storyId,
    );
    return this.storyRepository.update(storyId, processed.state);
  }
}

function toPlayerAction(input: ContinueStoryInput) {
  if (input.actionType === "choice") {
    return {
      type: "choice" as const,
      choiceId: input.choiceId!,
    };
  }

  return {
    type: "custom" as const,
    input: input.customInput!,
  };
}
