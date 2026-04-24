import { ApiError } from "@/server/api/errors/api-error";
import { StoryAiOrchestrator } from "@/server/ai/ai-orchestrator";
import { getAiTaskRuntimeProfile } from "@/server/ai/task-profile";
import { getMemoryConfig } from "@/server/memory/config";
import { MemoryService } from "@/server/memory/memory-service";
import { NarrativeEngine } from "@/server/narrative/engine";
import { createSeededRandom } from "@/server/narrative/random";
import {
  applyAbilityChangeStrings,
  applyDynamicStatUpdates,
  applyFlagStrings,
  applyInventoryChangeStrings,
  clampBetween,
  ensureStoryStateDefaults,
  mergeDynamicStats,
  normalizeRisk,
  sanitizeStateKey,
} from "@/server/narrative/state-normalizer";
import type {
  ActionIntent,
  DeltaOperation,
  DynamicStatMap,
  DynamicStatUpdate,
  EngineActionBlueprint,
  InitializeStoryInput,
  NarrativeContextPack,
  PlayerAction,
  ProcessedTurn,
  StateDeltaLogEntry,
  StoryChoice,
  StoryEndingType,
  StoryGenerationResult,
  StoryOutputLanguage,
  StoryRelationshipMap,
  StoryRiskLevel,
  StoryState,
  StoryTurnAiResponse,
  StoryTurnOutcome,
  StoryWorldMemoryEntry,
} from "@/server/narrative/types";

type TurnEvaluation = {
  risk: StoryRiskLevel;
  roll: number;
  outcome: StoryTurnOutcome;
  baseEffects: Record<string, number>;
  failureCanEndStory: boolean;
  relevantStatKeys: string[];
  riskReason: string;
};

type GeneratedTurnResult = {
  output: StoryGenerationResult;
  sceneAiResponse: StoryTurnAiResponse;
  consistency?: ProcessedTurn["consistency"];
};

export class StoryEngineService {
  constructor(
    private readonly engine = new NarrativeEngine(),
    private readonly memoryService = new MemoryService(),
  ) {}

  async createInitialTurnWithOrchestrator(
    input: InitializeStoryInput,
    sessionId: string | undefined,
    aiOrchestrator: StoryAiOrchestrator,
  ): Promise<ProcessedTurn> {
    const storyOutputLanguage = normalizeStoryOutputLanguage(input.storyOutputLanguage);
    const initialState = ensureStoryStateDefaults(
      this.engine.createInitialState({
        ...input,
        storyOutputLanguage,
      }),
    );

    const openingAction = {
      source: "custom" as const,
      originalInput: localizedStoryText(storyOutputLanguage, {
        en: "Begin the story.",
        vi: "Bat dau cau chuyen.",
      }),
      normalizedText: localizedStoryText(storyOutputLanguage, {
        en: "Begin the story.",
        vi: "Bat dau cau chuyen.",
      }),
      intent: "observe" as const,
      tags: ["opening", "intro"],
    };

    return this.resolveTurn({
      sessionId,
      previousState: initialState,
      normalizedAction: openingAction,
      aiOrchestrator,
      mode: "opening",
    });
  }

  async processTurnWithOrchestrator(
    state: StoryState,
    action: PlayerAction,
    sessionId: string | undefined,
    aiOrchestrator: StoryAiOrchestrator,
  ): Promise<ProcessedTurn> {
    const normalizedState = ensureStoryStateDefaults(state);

    if (normalizedState.gameOver || normalizedState.metadata.status === "completed") {
      throw new ApiError(
        "This story has already ended. Start a new session to continue playing.",
        409,
        "SESSION_GAME_OVER",
      );
    }

    const normalizedAction = await this.resolveNormalizedAction(
      normalizedState,
      action,
      sessionId,
      aiOrchestrator,
    );

    return this.resolveTurn({
      sessionId,
      previousState: normalizedState,
      normalizedAction,
      aiOrchestrator,
      mode: "continuation",
    });
  }

  private async resolveTurn(input: {
    sessionId: string | undefined;
    previousState: StoryState;
    normalizedAction: NarrativeContextPack["normalizedAction"];
    aiOrchestrator: StoryAiOrchestrator;
    mode: "opening" | "continuation";
  }): Promise<ProcessedTurn> {
    const previousState = ensureStoryStateDefaults(input.previousState);
    const turnNumber = previousState.metadata.turnCount + 1;
    const evaluation = this.evaluateTurn(previousState, input.normalizedAction, turnNumber);
    const promptState = this.buildPromptState(
      previousState,
      input.normalizedAction?.normalizedText ?? null,
      evaluation,
    );
    const sceneTaskProfile = getAiTaskRuntimeProfile(
      input.mode === "opening" ? "generateOpeningScene" : "generateNextScene",
    );
    const contextPack = await this.memoryService.buildContextPack({
      sessionId: input.sessionId,
      state: promptState,
      normalizedAction: input.normalizedAction,
      limits: sceneTaskProfile.context,
    });

    const generatedTurn = await this.generateTurnWithConsistency({
      aiOrchestrator: input.aiOrchestrator,
      contextPack,
      mode: input.mode,
      normalizedAction: input.normalizedAction,
      previousState,
      promptState,
      sessionId: input.sessionId,
      turnNumber,
    });

    const finalized = this.finalizeTurn(
      previousState,
      input.normalizedAction,
      generatedTurn.output,
      evaluation,
      turnNumber,
      generatedTurn.sceneAiResponse,
      generatedTurn.consistency,
    );

    return {
      state: finalized.state,
      turnLog: finalized.turnLog,
      summaryCandidate: finalized.summaryCandidate,
      contextPack,
      deltaLog: finalized.turnLog.deltaLog,
      consistency: generatedTurn.consistency,
      aiResponse: finalized.turnLog.aiResponse,
    };
  }

  private async resolveNormalizedAction(
    state: StoryState,
    action: PlayerAction,
    sessionId: string | undefined,
    aiOrchestrator: StoryAiOrchestrator,
  ) {
    if (action.type !== "custom") {
      return this.engine.normalizeAction(state, action);
    }

    const fallback = this.engine.normalizeAction(state, action);

    try {
      const interpretProfile = getAiTaskRuntimeProfile("interpretCustomAction");
      const contextPack = await this.memoryService.buildContextPack({
        sessionId,
        state,
        limits: interpretProfile.context,
      });
      const interpreted = await aiOrchestrator.interpretCustomActionDetailed({
        contextPack,
        rawAction: action.input,
      });

      return {
        source: "custom" as const,
        originalInput: action.input,
        normalizedText: interpreted.output.normalizedText.trim() || fallback.normalizedText,
        intent: interpreted.output.intent,
        tags: Array.from(
          new Set(
            (interpreted.output.tags ?? []).filter(Boolean).length > 0
              ? interpreted.output.tags
              : fallback.tags,
          ),
        ),
      };
    } catch {
      return fallback;
    }
  }

  private async generateTurnWithConsistency(input: {
    aiOrchestrator: StoryAiOrchestrator;
    contextPack: NarrativeContextPack;
    mode: "opening" | "continuation";
    normalizedAction: NarrativeContextPack["normalizedAction"];
    previousState: StoryState;
    promptState: StoryState;
    sessionId: string | undefined;
    turnNumber: number;
  }): Promise<GeneratedTurnResult> {
    const memoryConfig = getMemoryConfig();
    let contextPack = input.contextPack;
    let generatedExecution = await this.invokeSceneGenerator(
      input.aiOrchestrator,
      input.mode,
      contextPack,
      input.previousState,
    );
    let output = await this.applyChoiceGenerationFallback({
      aiOrchestrator: input.aiOrchestrator,
      contextPack,
      generated: generatedExecution.output,
      previousState: input.previousState,
      turnNumber: input.turnNumber,
    });

    if (!memoryConfig.consistencyCheckEnabled) {
      return {
        output,
        sceneAiResponse: toStoryTurnAiResponse(generatedExecution.invocation),
      };
    }

    let lastIssues: string[] = [];
    let lastRecommendations: string[] = [];
    let repairAttempts = 0;

    while (true) {
      let consistencyResult:
        | Awaited<ReturnType<StoryAiOrchestrator["checkConsistencyDetailed"]>>
        | null = null;

      try {
        consistencyResult = await input.aiOrchestrator.checkConsistencyDetailed({
          contextPack,
          candidateScene: this.buildCandidateScene(
            input.previousState,
            output,
            input.turnNumber,
          ),
        });
      } catch {
        return {
          output,
          sceneAiResponse: toStoryTurnAiResponse(generatedExecution.invocation),
        };
      }

      if (consistencyResult.output.valid) {
        const consistency: NonNullable<ProcessedTurn["consistency"]> = {
          repaired: repairAttempts > 0,
          issues: [],
          recommendations: [],
          repairAttempts,
          usedFallbackRepair: false,
        };

        return {
          output,
          sceneAiResponse: toStoryTurnAiResponse(generatedExecution.invocation, consistency),
          consistency,
        };
      }

      lastIssues = consistencyResult.output.issues;
      lastRecommendations = consistencyResult.output.recommendations;

      if (
        !memoryConfig.sceneRepairEnabled ||
        repairAttempts >= memoryConfig.maxRepairAttempts
      ) {
        const consistency: NonNullable<ProcessedTurn["consistency"]> = {
          repaired: false,
          issues: lastIssues,
          recommendations: lastRecommendations,
          repairAttempts,
          usedFallbackRepair: false,
        };

        return {
          output,
          sceneAiResponse: toStoryTurnAiResponse(generatedExecution.invocation, consistency),
          consistency,
        };
      }

      repairAttempts += 1;
      const sceneTaskProfile = getAiTaskRuntimeProfile(
        input.mode === "opening" ? "generateOpeningScene" : "generateNextScene",
      );
      contextPack = await this.memoryService.buildContextPack({
        sessionId: input.sessionId,
        state: input.promptState,
        normalizedAction: input.normalizedAction,
        repairContext: {
          attempt: repairAttempts,
          issues: lastIssues,
          recommendations: lastRecommendations,
        },
        limits: sceneTaskProfile.context,
      });
      generatedExecution = await this.invokeSceneGenerator(
        input.aiOrchestrator,
        input.mode,
        contextPack,
        input.previousState,
      );
      output = await this.applyChoiceGenerationFallback({
        aiOrchestrator: input.aiOrchestrator,
        contextPack,
        generated: generatedExecution.output,
        previousState: input.previousState,
        turnNumber: input.turnNumber,
      });
    }
  }

  private async invokeSceneGenerator(
    aiOrchestrator: StoryAiOrchestrator,
    mode: "opening" | "continuation",
    contextPack: NarrativeContextPack,
    previousState: StoryState,
  ) {
    if (mode === "opening") {
      return aiOrchestrator.generateOpeningSceneDetailed({ contextPack });
    }

    return aiOrchestrator.generateNextSceneDetailed({
      contextPack,
      latestScene: previousState.currentScene
        ? {
            title: previousState.currentScene.title,
            body: previousState.currentScene.body,
          }
        : undefined,
    });
  }

  private async applyChoiceGenerationFallback(input: {
    aiOrchestrator: StoryAiOrchestrator;
    contextPack: NarrativeContextPack;
    generated: StoryGenerationResult;
    previousState: StoryState;
    turnNumber: number;
  }) {
    if (input.generated.coreStateUpdates.gameOver) {
      return {
        ...input.generated,
        choices: [],
      };
    }

    if ((input.generated.choices ?? []).length >= 3) {
      return input.generated;
    }

    try {
      const generatedChoices = await input.aiOrchestrator.generateChoicesDetailed({
        contextPack: input.contextPack,
        sceneSummary: buildSceneSummary(input.generated.story),
      });

      const nextChoices = generatedChoices.output.choices.map((choice, index) => ({
        id: `choice_${input.turnNumber}_${index + 1}`,
        text: choice.label.trim(),
        risk: inferRiskFromTags(choice.tags),
        strategy: localizedStoryText(input.contextPack.language.storyOutputLanguage, {
          en: `${humanizeIntent(choice.intent)} approach`,
          vi: `Huong ${humanizeIntent(choice.intent)}`,
        }),
        hiddenImpact: localizedStoryText(input.contextPack.language.storyOutputLanguage, {
          en: "The situation may pivot in a direction that is difficult to predict.",
          vi: "Tinh the co the doi huong theo cach kho doan.",
        }),
      }));

      return {
        ...input.generated,
        choices: nextChoices,
      };
    } catch {
      return input.generated;
    }
  }

  private buildPromptState(
    state: StoryState,
    lastChoice: string | null,
    evaluation: TurnEvaluation,
  ) {
    const nextState = ensureStoryStateDefaults({
      ...state,
      lastChoice,
      coreState: {
        ...state.coreState,
        turn: state.metadata.turnCount + 1,
      },
      metadata: {
        ...state.metadata,
        turnCount: state.metadata.turnCount + 1,
        storyOutputLanguage: normalizeStoryOutputLanguage(state.metadata.storyOutputLanguage),
      },
    });

    return {
      ...nextState,
      currentScene: {
        ...nextState.currentScene,
        risk: evaluation.risk,
        roll: evaluation.roll,
        outcome: evaluation.outcome,
      },
      coreState: {
        ...nextState.coreState,
        turn: state.metadata.turnCount + 1,
      },
      pendingTurn: {
        risk: evaluation.risk,
        roll: evaluation.roll,
        outcome: evaluation.outcome,
        baseEffects: evaluation.baseEffects,
        failureCanEndStory: evaluation.failureCanEndStory,
        relevantStatKeys: evaluation.relevantStatKeys,
        riskReason: evaluation.riskReason,
      },
    };
  }

  private buildCandidateScene(
    previousState: StoryState,
    generated: StoryGenerationResult,
    turnNumber: number,
  ) {
    const gameOver = Boolean(generated.coreStateUpdates.gameOver);
    const storyOutputLanguage = normalizeStoryOutputLanguage(
      previousState.metadata.storyOutputLanguage,
    );
    const sceneTitle = deriveSceneTitle(
      sanitizeStoryText(generated.story, storyOutputLanguage),
      turnNumber,
      gameOver,
      storyOutputLanguage,
    );

    return {
      title: sceneTitle,
      body: sanitizeStoryText(generated.story, storyOutputLanguage),
      choices: gameOver
        ? []
        : this.buildSceneChoices(previousState, generated.choices ?? [], turnNumber),
    };
  }

  private finalizeTurn(
    previousState: StoryState,
    normalizedAction: NarrativeContextPack["normalizedAction"],
    generated: StoryGenerationResult,
    evaluation: TurnEvaluation,
    turnNumber: number,
    sceneAiResponse: StoryTurnAiResponse,
    consistency?: ProcessedTurn["consistency"],
  ) {
    const storyOutputLanguage = normalizeStoryOutputLanguage(
      previousState.metadata.storyOutputLanguage,
    );
    const worldMemory = structuredClone(previousState.worldMemory);
    const mergedStats = mergeDynamicStats(
      previousState.dynamicStats,
      generated.newDynamicStats ?? {},
      worldMemory,
    );
    const combinedDynamicUpdates = mergeDynamicUpdates(
      evaluation.baseEffects,
      generated.dynamicStatUpdates ?? {},
    );
    const nextDynamicStats = applyDynamicStatUpdates(mergedStats, combinedDynamicUpdates);
    const nextRelationships = applyRelationshipState(
      previousState.relationships,
      generated.newRelationships ?? {},
      generated.relationshipUpdates ?? {},
    );
    const inventory = applyInventoryChangeStrings(
      previousState.inventory,
      generated.inventoryChanges ?? [],
    );
    const abilities = applyAbilityChangeStrings(
      previousState.abilities,
      generated.abilityChanges ?? [],
    );
    const flagChanges = applyAutomaticFlagChanges(
      generated.flagChanges ?? [],
      normalizedAction?.intent ?? "observe",
      evaluation.outcome,
    );
    const flags = applyFlagStrings(previousState.flags, flagChanges);
    appendWorldMemoryUpdates(
      worldMemory,
      generated.worldMemoryUpdates ?? [],
      turnNumber,
    );
    appendOutcomeMemory(
      worldMemory,
      normalizedAction?.normalizedText ??
        localizedStoryText(storyOutputLanguage, {
          en: "Action",
          vi: "Hanh dong",
        }),
      evaluation,
      turnNumber,
      storyOutputLanguage,
    );

    const rawStory = sanitizeStoryText(
      generated.story,
      storyOutputLanguage,
    );
    const coreState = {
      ...previousState.coreState,
      currentArc:
        generated.coreStateUpdates.currentArc?.trim() || previousState.coreState.currentArc,
      turn: turnNumber,
      endingType: generated.coreStateUpdates.endingType ?? previousState.coreState.endingType,
      gameRules:
        generated.coreStateUpdates.gameRules?.length
          ? generated.coreStateUpdates.gameRules
          : previousState.coreState.gameRules,
      gameOver: false,
    };
    const gameOver = this.shouldGameOver(
      Boolean(generated.coreStateUpdates.gameOver),
      nextDynamicStats,
      flags,
      evaluation,
    );
    const finalEndingType = inferEndingType(
      gameOver,
      coreState.endingType,
      evaluation.outcome,
    );
    const sceneTitle = deriveSceneTitle(rawStory, turnNumber, gameOver, storyOutputLanguage);
    const sceneChoices = gameOver
      ? []
      : this.buildSceneChoices(previousState, generated.choices ?? [], turnNumber);
    const sceneSummary = buildSceneSummary(rawStory);
    const canonicalStats = Object.fromEntries(
      Object.entries(nextDynamicStats).map(([key, definition]) => [key, definition.value]),
    );
    const deltaLog = buildDeltaLog(
      previousState.dynamicStats,
      nextDynamicStats,
      previousState.relationships,
      nextRelationships,
      flagChanges,
      evaluation,
    );
    const actionForLog =
      normalizedAction ??
      this.engine.normalizeAction(previousState, {
        type: "custom",
        input: localizedStoryText(storyOutputLanguage, {
          en: "Keep moving forward.",
          vi: "Tiep tuc tien len.",
        }),
      });

    const aiResponse: StoryTurnAiResponse = {
      ...sceneAiResponse,
      consistency: consistency
        ? {
            checked: true,
            valid: consistency.issues.length === 0,
            issues: consistency.issues,
            recommendations: consistency.recommendations,
            repairAttempts: consistency.repairAttempts,
            repaired: consistency.repaired,
            usedFallbackRepair: consistency.usedFallbackRepair,
          }
        : undefined,
    };

    const nextState = ensureStoryStateDefaults({
      ...previousState,
      currentScene: {
        sceneNumber: turnNumber,
        title: sceneTitle,
        body: rawStory,
        choices: sceneChoices,
        rawActionInput:
          actionForLog.source === "custom" ? actionForLog.originalInput : undefined,
        outcome: evaluation.outcome,
        risk: evaluation.risk,
        roll: evaluation.roll,
        gameOver,
      },
      scenes: [
        ...previousState.scenes,
        {
          sceneNumber: turnNumber,
          title: sceneTitle,
          body: rawStory,
          choices: sceneChoices,
          rawActionInput:
            actionForLog.source === "custom" ? actionForLog.originalInput : undefined,
          outcome: evaluation.outcome,
          risk: evaluation.risk,
          roll: evaluation.roll,
          gameOver,
        },
      ],
      summary: sceneSummary,
      summaryCandidate: sceneSummary,
      storyHistory: [...previousState.storyHistory, rawStory],
      coreState: {
        ...coreState,
        gameOver,
        endingType: finalEndingType,
      },
      dynamicStats: nextDynamicStats,
      relationships: nextRelationships,
      inventory,
      abilities,
      flags,
      worldMemory,
      lastChoice: actionForLog.normalizedText ?? previousState.lastChoice,
      gameOver,
      canonicalState: {
        ...previousState.canonicalState,
        sceneSummary,
        stats: canonicalStats,
        inventory,
        worldFlags: flags,
        questFlags: previousState.canonicalState.questFlags,
      },
      availableActions: this.compileActions(sceneChoices),
      turnHistory: [
        ...previousState.turnHistory,
        {
          turnNumber,
          action: actionForLog,
          sceneTitle,
          sceneBody: rawStory,
          sceneSummary,
          choices: sceneChoices,
          deltaLog,
          createdAt: new Date().toISOString(),
          risk: evaluation.risk,
          outcome: evaluation.outcome,
          roll: evaluation.roll,
          gameOver,
          aiResponse,
        },
      ],
      metadata: {
        ...previousState.metadata,
        turnCount: turnNumber,
        status: gameOver ? "completed" : "active",
        lastUpdatedAt: new Date().toISOString(),
        storyOutputLanguage,
      },
    });

    return {
      state: nextState,
      turnLog: nextState.turnHistory.at(-1)!,
      summaryCandidate: {
        short: buildShortSummary(
          actionForLog.normalizedText ??
            localizedStoryText(storyOutputLanguage, {
              en: "Previous action",
              vi: "Hanh dong truoc do",
            }),
          evaluation,
          storyOutputLanguage,
        ),
        medium: sceneSummary,
        canon: buildCanonSummary(
          nextState,
          actionForLog.normalizedText ?? "",
          evaluation,
          storyOutputLanguage,
        ),
        canonUpdate: {
          facts: [
            {
              id: `turn-${turnNumber}-event`,
              category: "event" as const,
              subject: sceneTitle,
              value: sceneSummary,
              immutable: true,
            },
          ],
          irreversibleEvents: gameOver ? ["game-over"] : [],
          importantFlags: flags.slice(-6),
        },
      },
    };
  }

  private evaluateTurn(
    state: StoryState,
    normalizedAction: NarrativeContextPack["normalizedAction"],
    turnNumber: number,
  ): TurnEvaluation {
    const intent = normalizedAction?.intent ?? "observe";
    const relevantStatKeys = selectRelevantStatKeys(state.dynamicStats, normalizedAction);
    const risk = deriveRiskLevel(state.dynamicStats, intent, relevantStatKeys);
    const random = createSeededRandom(
      `${state.metadata.seed}:${turnNumber}:${normalizedAction?.normalizedText ?? "opening"}`,
    );
    const roll = random.int(1, 100);
    const successThreshold = computeSuccessThreshold(
      state.dynamicStats,
      state.relationships,
      state.flags,
      relevantStatKeys,
      intent,
      risk,
    );
    const partialThreshold = successThreshold + 20;
    const outcome: StoryTurnOutcome =
      roll <= successThreshold
        ? "success"
        : roll <= partialThreshold
          ? "partial_success"
          : "failure";

    return {
      risk,
      roll,
      outcome,
      baseEffects: buildBaseEffects(state.dynamicStats, relevantStatKeys, risk, outcome),
      failureCanEndStory:
        risk === "high" &&
        (intent === "fight" || intent === "escape" || intent === "deceive"),
      relevantStatKeys,
      riskReason: `Risk resolved from ${relevantStatKeys.join(", ") || "story pressure"} under ${intent}.`,
    };
  }

  private buildSceneChoices(
    state: StoryState,
    generatedChoices: StoryGenerationResult["choices"],
    turnNumber: number,
  ): StoryChoice[] {
    const language = normalizeStoryOutputLanguage(state.metadata.storyOutputLanguage);
    const choices = generatedChoices
      .filter((choice) => choice.text.trim().length > 0)
      .slice(0, 5)
      .map((choice, index) => {
        const risk = normalizeRisk(choice.risk);
        const intent = this.engine.normalizeAction(state, {
          type: "custom",
          input: choice.text,
        }).intent;

        return {
          id: choice.id.trim() || `choice_${turnNumber}_${index + 1}`,
          label: choice.text.trim(),
          intent,
          tags: [risk],
          risk,
          strategy: choice.strategy.trim(),
          hiddenImpact:
            choice.hiddenImpact.trim() ||
            localizedStoryText(language, {
              en: "The situation may pivot in a direction that is difficult to predict.",
              vi: "Tinh the se doi huong theo cach kho doan.",
            }),
        };
      });

    return choices.length >= 3
      ? choices
      : buildFallbackChoices(turnNumber, state, language);
  }

  private compileActions(choices: StoryChoice[]): EngineActionBlueprint[] {
    return choices.map((choice) => ({
      id: choice.id,
      label: choice.label,
      intent: choice.intent,
      tags: choice.tags ?? [],
      risk: choice.risk,
      hiddenImpact: choice.hiddenImpact,
      source: "choice",
      requirements: [],
      preview: choice.strategy ?? `${choice.risk} risk`,
    }));
  }

  private shouldGameOver(
    aiGameOver: boolean,
    dynamicStats: DynamicStatMap,
    flags: string[],
    evaluation: TurnEvaluation,
  ) {
    if (aiGameOver) {
      return true;
    }

    if (hasFatalDynamicState(dynamicStats)) {
      return true;
    }

    if (
      evaluation.failureCanEndStory &&
      evaluation.outcome === "failure" &&
      (flags.includes("critical_failure") || flags.includes("story_over"))
    ) {
      return true;
    }

    return false;
  }
}

function selectRelevantStatKeys(
  dynamicStats: DynamicStatMap,
  normalizedAction: NarrativeContextPack["normalizedAction"],
) {
  const actionText = [
    normalizedAction?.normalizedText ?? "",
    normalizedAction?.intent ?? "",
    ...(normalizedAction?.tags ?? []),
  ]
    .join(" ")
    .toLowerCase();
  const entries = Object.entries(dynamicStats);
  const scored = entries
    .map(([key, definition]) => {
      const haystack = `${key} ${definition.label} ${definition.description}`.toLowerCase();
      let score = 0;
      for (const token of actionText.split(/\s+/).filter(Boolean)) {
        if (haystack.includes(token)) {
          score += 2;
        }
      }
      if (normalizedAction?.intent === "socialize" || normalizedAction?.intent === "negotiate") {
        if (isSocialStat(key)) {
          score += 3;
        }
      }
      if (normalizedAction?.intent === "investigate" || normalizedAction?.intent === "observe") {
        if (isInsightStat(key)) {
          score += 3;
        }
      }
      if (normalizedAction?.intent === "fight" || normalizedAction?.intent === "escape") {
        if (isSurvivalStat(key) || isThreatStat(key)) {
          score += 3;
        }
      }
      return { key, score };
    })
    .sort((left, right) => right.score - left.score);

  const selected = scored
    .filter((entry) => entry.score > 0)
    .slice(0, 4)
    .map((entry) => entry.key);
  if (selected.length > 0) {
    return selected;
  }

  return entries.slice(0, 4).map(([key]) => key);
}

function deriveRiskLevel(
  dynamicStats: DynamicStatMap,
  intent: ActionIntent,
  relevantStatKeys: string[],
): StoryRiskLevel {
  const riskPressure = average(
    relevantStatKeys
      .filter((key) => isThreatStat(key))
      .map((key) => dynamicStats[key]?.value ?? 0),
  );
  const resilience = average(
    relevantStatKeys
      .filter((key) => isPositiveStat(key))
      .map((key) => dynamicStats[key]?.value ?? 50),
  );

  if (intent === "fight" || intent === "escape" || intent === "deceive") {
    return riskPressure >= 55 || resilience <= 35 ? "high" : "medium";
  }

  if (intent === "investigate" || intent === "protect" || intent === "negotiate") {
    return riskPressure >= 60 ? "medium" : "low";
  }

  return riskPressure >= 70 ? "high" : resilience <= 30 ? "medium" : "low";
}

function computeSuccessThreshold(
  dynamicStats: DynamicStatMap,
  relationships: StoryRelationshipMap,
  flags: string[],
  relevantStatKeys: string[],
  intent: ActionIntent,
  risk: StoryRiskLevel,
) {
  const base = risk === "low" ? 72 : risk === "medium" ? 54 : 38;
  const positiveValues = relevantStatKeys
    .filter((key) => isPositiveStat(key))
    .map((key) => dynamicStats[key]?.value ?? 50);
  const negativeValues = relevantStatKeys
    .filter((key) => isThreatStat(key))
    .map((key) => dynamicStats[key]?.value ?? 40);
  const positiveModifier = average(positiveValues.map((value) => (value - 50) / 4));
  const negativeModifier = average(negativeValues.map((value) => (value - 40) / 5));
  const relationshipModifier = computeRelationshipModifier(relationships, intent);
  const flagModifier = flags.includes("critical_failure") ? -8 : 0;

  return Math.max(
    12,
    Math.min(
      90,
      Math.round(base + positiveModifier - negativeModifier + relationshipModifier + flagModifier),
    ),
  );
}

function computeRelationshipModifier(
  relationships: StoryRelationshipMap,
  intent: ActionIntent,
) {
  const values = Object.values(relationships);
  if (values.length === 0) {
    return 0;
  }

  const averageTrust = average(values.map((relationship) => relationship.trust));
  const averageConflict = average(values.map((relationship) => relationship.conflict));

  if (intent === "socialize" || intent === "negotiate" || intent === "reveal") {
    return Math.round((averageTrust - averageConflict) / 12);
  }

  if (intent === "deceive") {
    return Math.round((averageConflict - averageTrust) / 14);
  }

  return 0;
}

function buildBaseEffects(
  dynamicStats: DynamicStatMap,
  relevantStatKeys: string[],
  risk: StoryRiskLevel,
  outcome: StoryTurnOutcome,
) {
  const scale = risk === "low" ? 1 : risk === "medium" ? 2 : 3;
  const effects: Record<string, number> = {};

  for (const key of relevantStatKeys) {
    if (!dynamicStats[key]) {
      continue;
    }

    if (isThreatStat(key)) {
      effects[key] =
        outcome === "success"
          ? -2 * scale
          : outcome === "partial_success"
            ? 1 * scale
            : 4 * scale;
      continue;
    }

    effects[key] =
      outcome === "success"
        ? 2 * scale
        : outcome === "partial_success"
          ? -1 * scale
          : -4 * scale;
  }

  return effects;
}

function mergeDynamicUpdates(
  baseEffects: Record<string, number>,
  aiUpdates: Record<string, DynamicStatUpdate>,
) {
  const merged: Record<string, { delta: number }> = {};

  for (const [key, delta] of Object.entries(baseEffects)) {
    merged[sanitizeStateKey(key)] = { delta };
  }

  for (const [rawKey, update] of Object.entries(aiUpdates ?? {})) {
    const key = sanitizeStateKey(rawKey);
    const existing = merged[key]?.delta ?? 0;
    merged[key] = {
      delta: existing + clampBetween(update.delta, -30, 30),
    };
  }

  return merged;
}

function applyRelationshipState(
  currentRelationships: StoryRelationshipMap,
  newRelationships: StoryRelationshipMap,
  updates: StoryGenerationResult["relationshipUpdates"],
) {
  const next = structuredClone(currentRelationships);

  for (const [rawKey, relationship] of Object.entries(newRelationships ?? {})) {
    const key = sanitizeStateKey(rawKey || relationship.characterId);
    next[key] = {
      characterId: relationship.characterId,
      name: relationship.name,
      role: relationship.role,
      affinity: clampBetween(relationship.affinity, 0, 100),
      trust: clampBetween(relationship.trust, 0, 100),
      conflict: clampBetween(relationship.conflict, 0, 100),
      notes: relationship.notes,
      statusFlags: relationship.statusFlags ?? [],
    };
  }

  for (const [rawKey, update] of Object.entries(updates ?? {})) {
    const key = sanitizeStateKey(rawKey);
    const existing = next[key] ?? {
      characterId: key,
      name: update.name ?? key,
      role: update.role ?? "session-character",
      affinity: 50,
      trust: 50,
      conflict: 0,
      notes: "",
      statusFlags: [],
    };
    next[key] = {
      characterId: existing.characterId,
      name: update.name ?? existing.name,
      role: update.role ?? existing.role,
      affinity: clampBetween(existing.affinity + update.affinityDelta, 0, 100),
      trust: clampBetween(existing.trust + update.trustDelta, 0, 100),
      conflict: clampBetween(existing.conflict + update.conflictDelta, 0, 100),
      notes: update.notes || existing.notes,
      statusFlags: Array.from(
        new Set([...(existing.statusFlags ?? []), ...(update.statusFlags ?? [])]),
      ),
    };
  }

  return next;
}

function applyAutomaticFlagChanges(
  currentChanges: string[],
  intent: ActionIntent,
  outcome: StoryTurnOutcome,
) {
  const nextChanges = [...currentChanges];
  if (outcome === "failure" && intent === "fight") {
    nextChanges.push("add:injured");
  }
  if (outcome === "failure" && intent === "deceive") {
    nextChanges.push("add:trust-fractured");
  }
  if (outcome === "success" && intent === "investigate") {
    nextChanges.push("add:active-lead");
  }
  return nextChanges;
}

function appendWorldMemoryUpdates(
  worldMemory: StoryWorldMemoryEntry[],
  updates: string[],
  turnNumber: number,
) {
  for (const [index, text] of updates.entries()) {
    const trimmed = String(text).trim();
    if (!trimmed) {
      continue;
    }
    worldMemory.push({
      id: `memory-${turnNumber}-${index + 1}-${Math.abs(hashCode(trimmed))}`,
      text: trimmed,
      kind: "event",
      turnNumber,
    });
  }
}

function appendOutcomeMemory(
  worldMemory: StoryWorldMemoryEntry[],
  lastChoice: string,
  evaluation: TurnEvaluation,
  turnNumber: number,
  language: StoryOutputLanguage,
) {
  worldMemory.push({
    id: `turn-outcome-${turnNumber}`,
    text: localizedStoryText(language, {
      en: `${lastChoice} led to a ${describeOutcome(evaluation.outcome, language)} at ${evaluation.risk} risk.`,
      vi: `${lastChoice} dan toi ${describeOutcome(evaluation.outcome, language)} o muc rui ro ${evaluation.risk}.`,
    }),
    kind: "choice",
    turnNumber,
  });
}

function inferEndingType(
  gameOver: boolean,
  currentEndingType: StoryEndingType,
  outcome: StoryTurnOutcome,
): StoryEndingType {
  if (!gameOver) {
    return currentEndingType ?? null;
  }
  if (currentEndingType) {
    return currentEndingType;
  }
  return outcome === "success" ? "good" : outcome === "partial_success" ? "neutral" : "bad";
}

function hasFatalDynamicState(dynamicStats: DynamicStatMap) {
  return Object.entries(dynamicStats).some(([key, definition]) => {
    if (["health", "vitality", "sanity", "resolve"].includes(key)) {
      return definition.value <= definition.min;
    }
    if (["injury", "danger", "threat", "threat_level", "peril", "inner_demon"].includes(key)) {
      return definition.value >= definition.max;
    }
    return false;
  });
}

function isPositiveStat(key: string) {
  return !isThreatStat(key);
}

function isThreatStat(key: string) {
  return [
    "danger",
    "threat",
    "threat_level",
    "suspicion",
    "stress",
    "fear",
    "injury",
    "inner_demon",
    "jealousy",
    "exposure",
    "pressure",
    "conflict",
    "peril",
  ].includes(key);
}

function isSocialStat(key: string) {
  return [
    "trust",
    "affection",
    "friendship",
    "reputation",
    "renown",
    "alliance",
    "public_trust",
    "crew_trust",
  ].includes(key);
}

function isInsightStat(key: string) {
  return [
    "focus",
    "evidence",
    "intel",
    "system_integrity",
    "composure",
    "self_control",
    "resolve",
  ].includes(key);
}

function isSurvivalStat(key: string) {
  return [
    "health",
    "stamina",
    "supplies",
    "resources",
    "energy",
    "shelter",
    "light_source",
    "spiritual_power",
  ].includes(key);
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function buildFallbackChoices(
  turnNumber: number,
  state: StoryState,
  language: StoryOutputLanguage,
): StoryChoice[] {
  const threat = Object.entries(state.dynamicStats)
    .find(([key]) => isThreatStat(key))
    ?.at(0);

  return [
    {
      id: `choice_${turnNumber}_1`,
      label: localizedStoryText(language, {
        en: "Pull back for a beat and study what is changing more carefully.",
        vi: "Lui lai mot nhip de quan sat ky hon nhung gi dang thay doi.",
      }),
      intent: "observe",
      tags: ["careful"],
      risk: "low",
      strategy: localizedStoryText(language, {
        en: "Read the situation carefully",
        vi: "Than trong doc lai cuc dien",
      }),
      hiddenImpact: localizedStoryText(language, {
        en: "Cuts immediate risk but may miss the first opening.",
        vi: "Giam nguy co tuc thoi nhung co the bo lo co hoi.",
      }),
    },
    {
      id: `choice_${turnNumber}_2`,
      label: localizedStoryText(language, {
        en: "Push into the point of highest tension and force the truth out.",
        vi: "Tien vao diem cang thang nhat de buoc su that lo ra.",
      }),
      intent: "investigate",
      tags: ["pressure"],
      risk: threat ? "high" : "medium",
      strategy: localizedStoryText(language, {
        en: "Force the situation open",
        vi: "Ep cuc dien he lo",
      }),
      hiddenImpact: localizedStoryText(language, {
        en: "May break the stalemate quickly but with direct fallout.",
        vi: "Co the mo nut that nhanh nhung de keo theo hau qua truc tiep.",
      }),
    },
    {
      id: `choice_${turnNumber}_3`,
      label: localizedStoryText(language, {
        en: "Try talking to the person who seems to be hiding something important.",
        vi: "Tim cach noi chuyen voi nguoi co ve dang giu kin dieu quan trong.",
      }),
      intent: "socialize",
      tags: ["social"],
      risk: "medium",
      strategy: localizedStoryText(language, {
        en: "Work through the relationship",
        vi: "Tac dong qua quan he",
      }),
      hiddenImpact: localizedStoryText(language, {
        en: "May build trust or make the other side more guarded.",
        vi: "Co the tang niem tin hoac lam doi phuong canh giac hon.",
      }),
    },
  ];
}

function sanitizeStoryText(story: string, language: StoryOutputLanguage) {
  const cleaned = String(story ?? "").trim();
  if (cleaned.length > 0) {
    return cleaned;
  }

  return localizedStoryText(language, {
    en: "The darkness does not loosen its grip, and the world keeps moving according to its own cold logic whether the protagonist is ready or not.",
    vi: "Bong toi khong buong long, va the gioi van tiep tuc dich chuyen theo logic lanh lung cua no du nhan vat co san sang hay khong.",
  });
}

function deriveSceneTitle(
  story: string,
  turnNumber: number,
  gameOver: boolean,
  language: StoryOutputLanguage,
) {
  const sentence = story
    .split(/[\n.!?]/)
    .map((entry) => entry.trim())
    .find(Boolean);

  if (sentence) {
    return sentence.split(/\s+/).slice(0, 8).join(" ");
  }

  return gameOver
    ? localizedStoryText(language, {
        en: `Turn ${turnNumber}: Ending`,
        vi: `Luot ${turnNumber}: Ket cuc`,
      })
    : localizedStoryText(language, {
        en: `Turn ${turnNumber}: Development`,
        vi: `Luot ${turnNumber}: Dien bien`,
      });
}

function buildSceneSummary(story: string) {
  const compact = story.replace(/\s+/g, " ").trim();
  return compact.length <= 320 ? compact : `${compact.slice(0, 317)}...`;
}

function buildShortSummary(
  lastChoice: string,
  evaluation: TurnEvaluation,
  language: StoryOutputLanguage,
) {
  return localizedStoryText(language, {
    en: `${lastChoice} led to a ${describeOutcome(evaluation.outcome, language)} at ${evaluation.risk} risk.`,
    vi: `${lastChoice} dan toi ${describeOutcome(evaluation.outcome, language)} voi muc rui ro ${evaluation.risk}.`,
  });
}

function buildCanonSummary(
  state: StoryState,
  lastChoice: string,
  evaluation: TurnEvaluation,
  language: StoryOutputLanguage,
) {
  const topStats = Object.entries(state.dynamicStats)
    .slice(0, 4)
    .map(([_, definition]) => `${definition.label} ${definition.value}`)
    .join(", ");

  return [
    localizedStoryText(language, {
      en: `Turn ${state.metadata.turnCount}: ${lastChoice}.`,
      vi: `Luot ${state.metadata.turnCount}: ${lastChoice}.`,
    }),
    localizedStoryText(language, {
      en: `Outcome: ${describeOutcome(evaluation.outcome, language)}.`,
      vi: `Ket qua: ${describeOutcome(evaluation.outcome, language)}.`,
    }),
    localizedStoryText(language, {
      en: `Key stats: ${topStats || "none"}.`,
      vi: `Chi so noi bat: ${topStats || "khong co"}.`,
    }),
    localizedStoryText(language, {
      en: `Important flags: ${state.flags.slice(-6).join(", ") || "none"}.`,
      vi: `Co quan trong: ${state.flags.slice(-6).join(", ") || "khong co"}.`,
    }),
  ].join(" ");
}

function describeOutcome(outcome: StoryTurnOutcome, language: StoryOutputLanguage) {
  if (outcome === "success") {
    return localizedStoryText(language, {
      en: "success",
      vi: "thanh cong",
    });
  }
  if (outcome === "failure") {
    return localizedStoryText(language, {
      en: "failure",
      vi: "that bai",
    });
  }
  return localizedStoryText(language, {
    en: "partial success",
    vi: "thanh cong mot phan",
  });
}

function buildDeltaLog(
  previousStats: DynamicStatMap,
  nextStats: DynamicStatMap,
  previousRelationships: StoryRelationshipMap,
  nextRelationships: StoryRelationshipMap,
  flagChanges: string[],
  evaluation: TurnEvaluation,
): StateDeltaLogEntry[] {
  const statEntries = Object.entries(nextStats).flatMap(([key, definition]) => {
    const previousValue = previousStats[key]?.value;
    if (previousValue === definition.value) {
      return [] as StateDeltaLogEntry[];
    }

    const operation: DeltaOperation =
      definition.value >= (previousValue ?? definition.min) ? "increment" : "decrement";
    return [
      {
        path: `dynamicStats.${key}.value`,
        operation,
        before: previousValue ?? null,
        after: definition.value,
        reason: `Turn resolved as ${evaluation.outcome} at ${evaluation.risk} risk.`,
      },
    ];
  });

  const relationshipEntries = Object.entries(nextRelationships).flatMap<StateDeltaLogEntry>(([
    key,
    relationship,
  ]) => {
    const previous = previousRelationships[key];
    if (
      previous &&
      previous.affinity === relationship.affinity &&
      previous.trust === relationship.trust &&
      previous.conflict === relationship.conflict
    ) {
      return [] as StateDeltaLogEntry[];
    }

    return [
      {
        path: `relationships.${key}`,
        operation: (previous ? "set" : "add") as DeltaOperation,
        before: previous ?? null,
        after: relationship,
        reason: "Relationship state shifted during turn resolution.",
      },
    ];
  });

  return [
    ...statEntries,
    ...relationshipEntries,
    {
      path: "turn.roll",
      operation: "set" as DeltaOperation,
      before: null,
      after: evaluation.roll,
      reason: `Server-side roll resolved the turn as ${evaluation.outcome}.`,
    },
    {
      path: "flags",
      operation: "set" as DeltaOperation,
      before: [],
      after: flagChanges,
      reason: "Story flags were updated after turn resolution.",
    },
  ];
}

function inferRiskFromTags(tags: string[]) {
  if (tags.includes("high")) {
    return "high" as const;
  }
  if (tags.includes("low")) {
    return "low" as const;
  }
  return "medium" as const;
}

function humanizeIntent(intent: ActionIntent) {
  return intent.replaceAll("_", " ");
}

function localizedStoryText(
  language: StoryOutputLanguage,
  copy: { en: string; vi: string },
) {
  return language === "vi" ? copy.vi : copy.en;
}

function normalizeStoryOutputLanguage(value: unknown): StoryOutputLanguage {
  return value === "vi" ? "vi" : "en";
}

function toStoryTurnAiResponse(
  invocation: Awaited<
    ReturnType<StoryAiOrchestrator["generateNextSceneDetailed"]>
  >["invocation"],
  consistency?: ProcessedTurn["consistency"],
): StoryTurnAiResponse {
  return {
    requestId: invocation.requestId,
    provider: invocation.provider,
    model: invocation.model,
    task: invocation.task,
    promptVersion: invocation.promptVersion,
    attempts: invocation.attempts,
    retryCount: Math.max(0, invocation.attempts - 1),
    providerRequestId: invocation.providerRequestId,
    structuredOutput: {
      status: invocation.structuredOutput.status,
      repairCount: invocation.structuredOutput.repairCount,
      hadValidationRetry: invocation.structuredOutput.hadValidationRetry,
    },
    consistency: consistency
      ? {
          checked: true,
          valid: consistency.issues.length === 0,
          issues: consistency.issues,
          recommendations: consistency.recommendations,
          repairAttempts: consistency.repairAttempts,
          repaired: consistency.repaired,
          usedFallbackRepair: consistency.usedFallbackRepair,
        }
      : undefined,
  };
}

function hashCode(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return hash;
}
