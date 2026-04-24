import { StoryAiOrchestrator } from "@/server/ai/ai-orchestrator";
import { NarrativeEngine } from "@/server/narrative/engine";
import { StoryEngineService } from "@/server/narrative/story-engine-service";
import type {
  InitializeStoryInput,
  PlayerAction,
  ProcessedTurn,
  StoryState,
} from "@/server/narrative/types";

export class TurnProcessingService {
  constructor(
    private readonly engine = new NarrativeEngine(),
    private readonly aiOrchestrator = new StoryAiOrchestrator(),
    private readonly storyEngineService = new StoryEngineService(),
  ) {}

  async createInitialTurn(input: InitializeStoryInput, sessionId?: string) {
    return this.createInitialTurnWithOrchestrator(input, sessionId, this.aiOrchestrator);
  }

  async createInitialTurnWithOrchestrator(
    input: InitializeStoryInput,
    sessionId: string | undefined,
    aiOrchestrator: StoryAiOrchestrator,
  ): Promise<ProcessedTurn> {
    return this.storyEngineService.createInitialTurnWithOrchestrator(
      input,
      sessionId,
      aiOrchestrator,
    );
  }

  async processTurn(
    state: StoryState,
    action: PlayerAction,
    sessionId?: string,
  ): Promise<ProcessedTurn> {
    return this.processTurnWithOrchestrator(state, action, sessionId, this.aiOrchestrator);
  }

  async processTurnWithOrchestrator(
    state: StoryState,
    action: PlayerAction,
    sessionId: string | undefined,
    aiOrchestrator: StoryAiOrchestrator,
  ): Promise<ProcessedTurn> {
    this.engine.validateAction(state, action);
    return this.storyEngineService.processTurnWithOrchestrator(
      state,
      action,
      sessionId,
      aiOrchestrator,
    );
  }
}
