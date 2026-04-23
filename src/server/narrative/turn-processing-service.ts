import { StoryAiOrchestrator } from "@/server/ai/ai-orchestrator";
import { getMemoryConfig } from "@/server/memory/config";
import { MemoryService } from "@/server/memory/memory-service";
import { NarrativeEngine } from "@/server/narrative/engine";
import type {
  InitializeStoryInput,
  NarrativeContextPack,
  PlayerAction,
  ProcessedTurn,
  StoryChoice,
  StoryGenerationResult,
  StoryState,
} from "@/server/narrative/types";

export class TurnProcessingService {
  constructor(
    private readonly engine = new NarrativeEngine(),
    private readonly aiOrchestrator = new StoryAiOrchestrator(),
    private readonly memoryService = new MemoryService(),
  ) {}

  async createInitialTurn(input: InitializeStoryInput, sessionId?: string) {
    const initialState = this.engine.createInitialState(input);
    const contextPack = await this.memoryService.buildContextPack({
      sessionId,
      state: initialState,
    });

    const generated = await this.generateOpeningSceneWithContinuityGuard(contextPack);

    const prepared = this.engine.prepareTurn(initialState, {
      type: "custom",
      input: "Begin the story.",
    });

    return this.engine.finalizeTurn(prepared, generated);
  }

  async processTurn(
    state: StoryState,
    action: PlayerAction,
    sessionId?: string,
  ): Promise<ProcessedTurn> {
    const prepared = this.engine.prepareTurn(state, action);
    const contextPack = await this.memoryService.buildContextPack({
      sessionId,
      state: prepared.projectedState,
      normalizedAction: prepared.normalizedAction,
    });

    const { generated, consistency } = await this.generateNextSceneWithContinuityGuard(
      sessionId,
      prepared.projectedState,
      contextPack,
      {
        title: state.currentScene.title,
        body: state.currentScene.body,
      },
      prepared.normalizedAction,
    );

    const processed = this.engine.finalizeTurn(prepared, generated);
    return {
      ...processed,
      contextPack,
      consistency,
    };
  }

  private async generateOpeningSceneWithContinuityGuard(contextPack: NarrativeContextPack) {
    const generated = await this.aiOrchestrator.generateOpeningScene({ contextPack });
    const config = getMemoryConfig();

    if (!config.consistencyCheckEnabled) {
      return generated;
    }

    const consistency = await this.aiOrchestrator.checkConsistency({
      contextPack,
      candidateScene: toCandidateScene(generated.scene.choices, generated.scene.title, generated.scene.body),
    });

    if (consistency.valid) {
      return generated;
    }

    return buildContinuityFallbackScene(contextPack, consistency.issues);
  }

  private async generateNextSceneWithContinuityGuard(
    sessionId: string | undefined,
    projectedState: StoryState,
    contextPack: NarrativeContextPack,
    latestScene: { title: string; body: string },
    normalizedAction: NarrativeContextPack["normalizedAction"],
  ) {
    const config = getMemoryConfig();
    let generated = await this.aiOrchestrator.generateNextScene({
      contextPack,
      latestScene,
    });

    if (!config.consistencyCheckEnabled) {
      return {
        generated,
        consistency: {
          repaired: false,
          issues: [],
          recommendations: [],
          repairAttempts: 0,
          usedFallbackRepair: false,
        },
      };
    }

    let check = await this.aiOrchestrator.checkConsistency({
      contextPack,
      candidateScene: toCandidateScene(generated.scene.choices, generated.scene.title, generated.scene.body),
    });
    let repairAttempts = 0;

    while (
      !check.valid &&
      config.sceneRepairEnabled &&
      repairAttempts < config.maxRepairAttempts
    ) {
      repairAttempts += 1;
      const repairContext = await this.memoryService.buildContextPack({
        sessionId,
        state: projectedState,
        normalizedAction,
        repairContext: {
          attempt: repairAttempts,
          issues: check.issues,
          recommendations: check.recommendations,
        },
      });

      generated = await this.aiOrchestrator.generateNextScene({
        contextPack: repairContext,
        latestScene,
      });
      check = await this.aiOrchestrator.checkConsistency({
        contextPack: repairContext,
        candidateScene: toCandidateScene(generated.scene.choices, generated.scene.title, generated.scene.body),
      });
    }

    if (!check.valid) {
      return {
        generated: buildContinuityFallbackScene(contextPack, check.issues),
        consistency: {
          repaired: true,
          issues: check.issues,
          recommendations: check.recommendations,
          repairAttempts,
          usedFallbackRepair: true,
        },
      };
    }

    return {
      generated,
      consistency: {
        repaired: repairAttempts > 0,
        issues: check.issues,
        recommendations: check.recommendations,
        repairAttempts,
        usedFallbackRepair: false,
      },
    };
  }
}

function toCandidateScene(
  choices: Array<{ label: string; intent: StoryChoice["intent"]; tags?: string[] }>,
  title: string,
  body: string,
) {
  return {
    title,
    body,
    choices: choices.map((choice, index) => ({
      id: `candidate-${index + 1}`,
      label: choice.label,
      intent: choice.intent,
      tags: choice.tags ?? [],
    })),
  };
}

function buildContinuityFallbackScene(
  contextPack: NarrativeContextPack,
  issues: string[],
): StoryGenerationResult {
  const actionText = contextPack.normalizedAction?.normalizedText ?? "continue carefully";
  return {
    scene: {
      title: `Turn ${contextPack.currentTurn}: Continuity Hold`,
      body: [
        `The consequences of "${actionText}" settle into the scene without breaking the established situation.`,
        `What changes is pressure, not canon: ${contextPack.currentSceneSummary}`,
        issues.length > 0 ? `Continuity guard avoided: ${issues.join("; ")}` : "",
      ]
        .filter(Boolean)
        .join(" "),
      choices: [
        { label: "Study the new detail before acting", intent: "observe", tags: ["careful"] },
        { label: "Test the safest opening in front of you", intent: "explore", tags: ["steady"] },
        { label: "Press someone for a clear answer", intent: "investigate", tags: ["focused"] },
      ],
    },
    summaryCandidate:
      "The scene advances conservatively to preserve continuity while keeping pressure on the active conflict.",
  };
}
