import { Types } from "mongoose";

import { analytics, type AnalyticsTracker } from "@/server/analytics/analytics-service";
import { StoryAiOrchestrator } from "@/server/ai/ai-orchestrator";
import { getAiTaskRuntimeProfile } from "@/server/ai/task-profile";
import { ApiError } from "@/server/api/errors/api-error";
import type { StorySessionDetailDto } from "@/server/api/dtos/story-session-dto";
import { presentStorySessionDetail } from "@/server/api/presenters/story-session-presenter";
import { MemoryService } from "@/server/memory/memory-service";
import { ensureStoryStateDefaults } from "@/server/narrative/state-normalizer";
import { TurnProcessingService } from "@/server/narrative/turn-processing-service";
import type { PlayerAction, ProcessedTurn, StoryState } from "@/server/narrative/types";
import { CharacterStateRepository } from "@/server/persistence/repositories/character-state-repository";
import { SessionStateSnapshotRepository } from "@/server/persistence/repositories/session-state-snapshot-repository";
import { StoryRepository } from "@/server/persistence/repositories/story-repository";
import { StorySessionRepository } from "@/server/persistence/repositories/story-session-repository";
import { StorySummaryRepository } from "@/server/persistence/repositories/story-summary-repository";
import { StoryWorldRepository } from "@/server/persistence/repositories/story-world-repository";
import { TurnLogRepository } from "@/server/persistence/repositories/turn-log-repository";
import { UserPreferenceRepository } from "@/server/persistence/repositories/user-preference-repository";
import { logger, serializeError } from "@/server/logging/logger";
import type {
  CreateStorySessionInput,
  StorySessionActionInput,
  StorySessionCustomActionInput,
} from "@/server/validation/api-schemas";

export class StorySessionService {
  constructor(
    private readonly sessionRepository = new StorySessionRepository(),
    private readonly storyRepository = new StoryRepository(),
    private readonly worldRepository = new StoryWorldRepository(),
    private readonly characterRepository = new CharacterStateRepository(),
    private readonly snapshotRepository = new SessionStateSnapshotRepository(),
    private readonly turnLogRepository = new TurnLogRepository(),
    private readonly summaryRepository = new StorySummaryRepository(),
    private readonly preferenceRepository = new UserPreferenceRepository(),
    private readonly turnProcessingService = new TurnProcessingService(),
    private readonly memoryService = new MemoryService(),
    private readonly analyticsTracker: AnalyticsTracker = analytics,
  ) {}

  async createSession(userId: string, input: CreateStorySessionInput) {
    const preferences = await this.preferenceRepository.upsertDefault(userId);
    const storyOutputLanguage = normalizeStoryOutputLanguage(preferences?.storyOutputLanguage);

    const created = await this.sessionRepository.create({
      userId: new Types.ObjectId(userId),
      title: input.titleHint ?? "Untitled Session",
      premise: input.seedPrompt
        ? `${input.premise} Seed prompt: ${input.seedPrompt}`
        : input.premise,
      genre: input.genre,
      enginePreset: input.enginePreset,
      tone: input.tone,
      status: "paused",
      currentTurn: 0,
      currentSceneSummary: input.premise,
      startTime: new Date(),
      lastPlayedAt: new Date(),
      recommendationTags: [input.genre, input.enginePreset],
      searchKeywords: extractSearchKeywords(input.premise),
      deterministic: input.deterministic,
      seed: input.seed,
      metadata: {
        difficulty: input.difficulty,
        lengthPreference: input.lengthPreference,
        seedPrompt: input.seedPrompt,
        storyOutputLanguage,
      },
    });

    await this.analyticsTracker.track({
      eventType: "session_created",
      userId,
      storySessionId: String(created._id),
      properties: {
        genre: input.genre,
        tone: input.tone,
        enginePreset: input.enginePreset,
        difficulty: input.difficulty,
        lengthPreference: input.lengthPreference,
        hasSeedPrompt: Boolean(input.seedPrompt),
        deterministic: input.deterministic,
      },
    });

    return created;
  }

  async listSessions(userId: string) {
    return this.sessionRepository.listByUserId(userId);
  }

  async getSession(userId: string, sessionId: string) {
    const session = await this.requireOwnedSession(userId, sessionId);
    const world = await this.worldRepository.findBySessionId(sessionId);
    const characters = await this.characterRepository.findBySessionId(sessionId);
    const storyState = session.storyDocumentId
      ? await this.storyRepository.findById(String(session.storyDocumentId))
      : null;

    return {
      session,
      world,
      characters,
      storyState,
    };
  }

  async startSession(userId: string, sessionId: string) {
    const session = await this.requireOwnedSession(userId, sessionId);
    const aiOrchestrator = this.createAiOrchestrator(userId, sessionId);
    const storyOutputLanguage = normalizeStoryOutputLanguage(
      session.metadata?.storyOutputLanguage ??
        (await this.preferenceRepository.upsertDefault(userId))?.storyOutputLanguage,
    );

    if (session.storyDocumentId) {
      return this.getSession(userId, sessionId);
    }

    const startedAt = Date.now();
    let createdStoryId: string | null = null;
    logger.info("story.start_generation_started", {
      userId,
      sessionId,
      storyOutputLanguage,
      hasStoryDocument: Boolean(session.storyDocumentId),
    });

    try {
      const world = await aiOrchestrator.generateWorld({
        genre: session.genre,
        tone: session.tone,
        premise: session.premise,
        enginePreset: session.enginePreset,
        storyOutputLanguage,
      });

      const [characters, title] = await Promise.all([
        aiOrchestrator.generateCharacters({
          genre: session.genre,
          tone: session.tone,
          premise: session.premise,
          enginePreset: session.enginePreset,
          world,
          storyOutputLanguage,
        }),
        aiOrchestrator
          .generateSessionTitle({
            genre: session.genre,
            tone: session.tone,
            premise: session.premise,
            enginePreset: session.enginePreset,
            storyOutputLanguage,
          })
          .catch((error) => {
            logger.warn("story.start_session_title_fallback", {
              userId,
              sessionId,
              storyOutputLanguage,
              error: serializeError(error),
            });
            return {
              title: resolveFallbackSessionTitle(session.title, session.genre, storyOutputLanguage),
              rationale: "Session title generation failed; fallback title used.",
            };
          }),
      ]);

      const initialProcessed = await this.turnProcessingService.createInitialTurnWithOrchestrator({
        genre: session.genre,
        titleHint: title.title,
        premise: session.premise,
        tone: session.tone,
        enginePreset: session.enginePreset,
        deterministic: Boolean(session.deterministic),
        seed: session.seed ?? undefined,
        storyOutputLanguage,
      }, sessionId, aiOrchestrator);
      const processed = await this.enrichProcessedTurnWithMemory(
        sessionId,
        initialProcessed,
        aiOrchestrator,
      );
      const seededState = ensureStoryStateDefaults(
        seedRelationshipsFromCharacters(processed.state, characters.characters),
      );
      const story = await this.storyRepository.create(seededState);
      createdStoryId = story.id;

      await this.worldRepository.upsertBySessionId(sessionId, {
        storySessionId: new Types.ObjectId(sessionId),
        setting: world.setting,
        worldRules: world.worldRules,
        playerRole: world.playerRole,
        conflict: world.conflict,
        startingLocation: world.startingLocation,
        seed: session.seed ?? world.seedHint,
        contentWarnings: world.contentWarnings,
      });
      await this.characterRepository.replaceForSession(
        sessionId,
        characters.characters.map((character) => ({
          storySessionId: new Types.ObjectId(sessionId),
          externalId: character.id,
          name: character.name,
          role: character.role,
          personality: character.personality,
          relationshipScore: character.initialRelationshipScore,
          relationshipBucket: toRelationshipBucket(character.initialRelationshipScore),
          statusFlags: character.statusFlags,
          secretsKnown: character.secretsKnown,
          isPlayer: character.isPlayer,
        })),
      );
      await this.persistTurnArtifacts(sessionId, { ...processed, state: seededState });
      await this.sessionRepository.updateOwned(userId, sessionId, {
        title: title.title,
        status: "active",
        currentTurn: seededState.metadata.turnCount,
        currentSceneSummary: seededState.summary,
        latestSceneTitle: seededState.currentScene.title,
        latestSceneText: seededState.currentScene.body,
        lastPlayedAt: new Date(),
        storyDocumentId: new Types.ObjectId(story.id),
        branchKey: seededState.metadata.branchKey,
        deterministic: seededState.metadata.deterministic,
        seed: seededState.metadata.seed,
        metadata: clearStartFailureMetadata({
          ...toSessionMetadata(session.metadata),
          titleRationale: title.rationale,
          worldSeedHint: world.seedHint,
          storyOutputLanguage,
        }),
      });

      await this.analyticsTracker.track({
      eventType: "session_started",
      userId,
      storySessionId: sessionId,
      properties: {
        genre: session.genre,
        tone: session.tone,
        enginePreset: session.enginePreset,
        latencyMs: Date.now() - startedAt,
      },
    });
      await this.analyticsTracker.track({
      eventType: "turn_generation_latency",
      userId,
      storySessionId: sessionId,
      properties: {
        actionSource: "start",
        turnNumber: seededState.metadata.turnCount,
        latencyMs: Date.now() - startedAt,
      },
    });

      logger.info("story.start_generation_completed", {
        userId,
        sessionId,
        latencyMs: Date.now() - startedAt,
        storyOutputLanguage,
      });

      return this.getSession(userId, sessionId);
    } catch (error) {
      const cleanup = await this.rollbackFailedStart({
        userId,
        sessionId,
        session,
        createdStoryId,
        storyOutputLanguage,
        error,
      });
      logger.error("story.start_generation_failed", {
        userId,
        sessionId,
        latencyMs: Date.now() - startedAt,
        storyOutputLanguage,
        error: serializeError(error),
        cleanup,
      });
      throw error;
    }
  }

  async submitChoiceTurn(userId: string, sessionId: string, input: StorySessionActionInput) {
    return this.processTurn(userId, sessionId, {
      type: "choice",
      choiceId: input.choiceId,
    });
  }

  async submitCustomAction(userId: string, sessionId: string, input: StorySessionCustomActionInput) {
    return this.processTurn(userId, sessionId, {
      type: "custom",
      input: input.customInput,
    });
  }

  async saveSession(userId: string, sessionId: string) {
    const session = await this.requireOwnedSession(userId, sessionId);
    const updated = await this.sessionRepository.updateOwned(userId, sessionId, {
      status: session.currentTurn > 0 ? "paused" : session.status,
      lastPlayedAt: new Date(),
    });

    await this.analyticsTracker.track({
      eventType: "session_saved",
      userId,
      storySessionId: sessionId,
      properties: {
        currentTurn: session.currentTurn,
        statusBeforeSave: session.status,
      },
    });

    if (session.status === "active" && session.currentTurn > 0) {
      await this.analyticsTracker.track({
        eventType: "session_abandoned",
        userId,
        storySessionId: sessionId,
        properties: {
          abandonTurn: session.currentTurn,
          reason: "manual_save_or_pause",
        },
      });
    }

    return updated!;
  }

  async resumeSession(userId: string, sessionId: string) {
    const session = await this.requireOwnedSession(userId, sessionId);
    await this.sessionRepository.updateOwned(userId, sessionId, {
      status: "active",
      lastPlayedAt: new Date(),
    });

    await this.analyticsTracker.track({
      eventType: "session_resumed",
      userId,
      storySessionId: sessionId,
      properties: {
        currentTurn: session.currentTurn,
        previousStatus: session.status,
      },
    });

    return this.getSession(userId, sessionId);
  }

  async getHistory(userId: string, sessionId: string) {
    await this.requireOwnedSession(userId, sessionId);
    return this.turnLogRepository.listBySessionId(sessionId);
  }

  async getRecap(userId: string, sessionId: string) {
    const details = await this.getSession(userId, sessionId);
    const turnLogs = await this.turnLogRepository.listBySessionId(sessionId);
    const storyState = details.storyState;

    if (!storyState) {
      throw new ApiError("Session has not been started yet.", 409, "SESSION_NOT_STARTED");
    }

    const storyOutputLanguage = normalizeStoryOutputLanguage(
      storyState.metadata.storyOutputLanguage ?? details.session.metadata?.storyOutputLanguage,
    );

    return this.createAiOrchestrator(userId, sessionId).generateRecap({
      contextPack: await this.memoryService.buildContextPack({
        sessionId,
        state: {
          ...storyState,
          metadata: {
            ...storyState.metadata,
            storyOutputLanguage,
          },
        },
        limits: getAiTaskRuntimeProfile("generateRecap").context,
      }),
      recentTurns: turnLogs.slice(-5).map((turn) => ({
        turnNumber: Number(turn.turnNumber),
        sceneTitle: String(turn.sceneTitle ?? ""),
        sceneSummary: String(turn.sceneSummary),
        actionText: String(turn.chosenAction),
      })),
    });
  }

  async deleteSession(userId: string, sessionId: string) {
    const session = await this.requireOwnedSession(userId, sessionId);

    await Promise.all([
      this.sessionRepository.deleteOwned(userId, sessionId),
      this.worldRepository.deleteBySessionId(sessionId),
      this.characterRepository.deleteBySessionId(sessionId),
      this.snapshotRepository.deleteBySessionId(sessionId),
      this.turnLogRepository.deleteBySessionId(sessionId),
      this.summaryRepository.deleteBySessionId(sessionId),
      session.storyDocumentId
        ? this.storyRepository.delete(String(session.storyDocumentId))
        : Promise.resolve(null),
    ]);
  }

  async presentOwnedSessionDetail(userId: string, sessionId: string): Promise<StorySessionDetailDto> {
    const details = await this.getSession(userId, sessionId);
    return presentStorySessionDetail({
      session: details.session,
      world: details.world,
      storyState: details.storyState,
      characters: details.characters,
    });
  }

  private async processTurn(userId: string, sessionId: string, action: PlayerAction) {
    const session = await this.requireOwnedSession(userId, sessionId);
    if (!session.storyDocumentId) {
      throw new ApiError("Session has not been started yet.", 409, "SESSION_NOT_STARTED");
    }

    const storyState = await this.storyRepository.findById(String(session.storyDocumentId));
    if (!storyState) {
      throw new ApiError("Canonical story state is missing.", 500, "STORY_STATE_MISSING");
    }

    const storyOutputLanguage = normalizeStoryOutputLanguage(
      storyState.metadata.storyOutputLanguage ?? session.metadata?.storyOutputLanguage,
    );
    const startedAt = Date.now();
    logger.info("story.turn_generation_started", {
      userId,
      sessionId,
      actionType: action.type,
      currentTurn: storyState.metadata.turnCount,
      storyOutputLanguage,
    });
    const aiOrchestrator = this.createAiOrchestrator(userId, sessionId);
    const localizedStoryState: StoryState = {
      ...storyState,
      metadata: {
        ...storyState.metadata,
        storyOutputLanguage,
      },
    };
    try {
      const generatedTurn = await this.turnProcessingService.processTurnWithOrchestrator(
        localizedStoryState,
        action,
        sessionId,
        aiOrchestrator,
      );
      const processed = await this.enrichProcessedTurnWithMemory(
        sessionId,
        generatedTurn,
        aiOrchestrator,
      );
      const updatedStory = await this.storyRepository.update(String(session.storyDocumentId), processed.state);

      await Promise.all([
      this.persistTurnArtifacts(sessionId, processed),
      this.syncCharacterRelationships(sessionId, processed.state),
      this.sessionRepository.updateOwned(userId, sessionId, {
        status: "active",
        currentTurn: processed.state.metadata.turnCount,
        currentSceneSummary: processed.state.summary,
        latestSceneTitle: processed.state.currentScene.title,
        latestSceneText: processed.state.currentScene.body,
        lastPlayedAt: new Date(),
      }),
    ]);

      const details = await this.getSession(userId, sessionId);

      const latencyMs = Date.now() - startedAt;
      const actionSource = processed.turnLog.action.source;

      await this.analyticsTracker.track({
      eventType: actionSource === "choice" ? "choice_selected" : "custom_action_submitted",
      userId,
      storySessionId: sessionId,
      properties: {
        currentTurnBeforeAction: session.currentTurn,
        selectedChoiceId: processed.turnLog.action.selectedChoiceId,
        intent: processed.turnLog.action.intent,
      },
    });
      await this.analyticsTracker.track({
      eventType: "turn_played",
      userId,
      storySessionId: sessionId,
      properties: {
        turnNumber: processed.state.metadata.turnCount,
        actionSource,
        genre: session.genre,
        tone: session.tone,
      },
    });
      await this.analyticsTracker.track({
      eventType: "turn_generation_latency",
      userId,
      storySessionId: sessionId,
      properties: {
        turnNumber: processed.state.metadata.turnCount,
        actionSource,
        latencyMs,
      },
    });

      logger.info("story.turn_generation_completed", {
        userId,
        sessionId,
        latencyMs,
        actionType: action.type,
        nextTurn: processed.state.metadata.turnCount,
        storyOutputLanguage,
      });

      return {
        processed,
        details,
        updatedStory: updatedStory!,
      };
    } catch (error) {
      logger.error("story.turn_generation_failed", {
        userId,
        sessionId,
        latencyMs: Date.now() - startedAt,
        actionType: action.type,
        currentTurn: storyState.metadata.turnCount,
        storyOutputLanguage,
        error: serializeError(error),
      });
      throw error;
    }
  }

  private async persistTurnArtifacts(sessionId: string, processed: ProcessedTurn) {
    const snapshot = await this.snapshotRepository.create({
      storySessionId: new Types.ObjectId(sessionId),
      turnNumber: processed.state.metadata.turnCount,
      kind: "turn",
      sceneId: processed.state.currentScene.title,
      canonicalState: {
        sceneSummary: processed.state.canonicalState.sceneSummary,
        worldState: {
          worldFlags: processed.state.canonicalState.worldFlags,
          worldFacts: processed.state.canonicalState.worldFacts,
          stats: processed.state.canonicalState.stats,
        },
        characters: processed.state.canonicalState.relationships.map((relationship) => ({
          name: relationship.label,
          role: "session-character",
          personality: [],
          relationshipScore: relationship.score,
          relationshipBucket: toRelationshipBucket(relationship.score),
          statusFlags: relationship.flags,
          secretsKnown: [],
          isPlayer: false,
        })),
        inventory: processed.state.canonicalState.inventory.map((item) => item.id),
        questFlags: processed.state.canonicalState.questFlags,
        customState: {
          clues: processed.state.canonicalState.clues,
          coreState: processed.state.coreState,
          dynamicStats: processed.state.dynamicStats,
          relationships: processed.state.relationships,
          abilities: processed.state.abilities,
          worldMemory: processed.state.worldMemory,
        },
      },
    });

    await Promise.all([
      this.turnLogRepository.create({
        storySessionId: new Types.ObjectId(sessionId),
        turnNumber: processed.turnLog.turnNumber,
        sceneTitle: processed.turnLog.sceneTitle,
        sceneText: processed.turnLog.sceneBody,
        sceneSummary: processed.turnLog.sceneSummary,
        presentedChoices: processed.turnLog.choices.map((choice) => ({
          id: choice.id,
          label: choice.label,
          intent: choice.intent,
        })),
        chosenAction: processed.turnLog.action.normalizedText,
        actionSource: processed.turnLog.action.source,
        selectedChoiceId: processed.turnLog.action.selectedChoiceId,
        rawActionInput:
          processed.turnLog.action.source === "custom"
            ? processed.turnLog.action.originalInput
            : undefined,
        gameOver: processed.turnLog.gameOver,
        snapshotId: snapshot._id,
        aiResponseRef: processed.aiResponse
          ? {
              provider: processed.aiResponse.provider as never,
              requestId: processed.aiResponse.requestId,
              model: processed.aiResponse.model,
              task: processed.aiResponse.task,
              promptVersion: processed.aiResponse.promptVersion,
              attempts: processed.aiResponse.attempts,
              retryCount: processed.aiResponse.retryCount,
              providerRequestId: processed.aiResponse.providerRequestId,
              structuredOutput: processed.aiResponse.structuredOutput,
              consistency: processed.aiResponse.consistency,
            }
          : undefined,
      }),
      this.summaryRepository.replaceTurnSummaries(
        sessionId,
        processed.turnLog.turnNumber,
        processed.memorySummaries ?? [],
      ),
    ]);
  }

  private async enrichProcessedTurnWithMemory(
    sessionId: string,
    processed: ProcessedTurn,
    aiOrchestrator: StoryAiOrchestrator,
  ) {
    const memoryCapture = await this.memoryService.captureTurnMemory({
      sessionId,
      state: processed.state,
      turnLog: processed.turnLog,
      summaryCandidate: processed.summaryCandidate,
      aiOrchestrator,
    });

    return {
      ...processed,
      state: memoryCapture.state,
      contextPack: {
        ...processed.contextPack,
        memory: {
          shortTerm: memoryCapture.state.memory.shortTerm,
          rollingSummaries: memoryCapture.state.memory.rollingSummaries,
          canon: {
            facts: memoryCapture.state.memory.canon.facts.map((fact) => ({
              id: fact.id,
              category: fact.category,
              subject: fact.subject,
              value: fact.value,
              immutable: fact.immutable,
            })),
            irreversibleEvents: memoryCapture.state.memory.canon.irreversibleEvents,
            importantFlags: memoryCapture.state.memory.canon.importantFlags,
          },
        },
      },
      memorySummaries: memoryCapture.summaries,
    };
  }

  private async syncCharacterRelationships(sessionId: string, state: StoryState) {
    const currentCharacters = await this.characterRepository.findBySessionId(sessionId);
    const byExternalId = new Map(
      currentCharacters.map((character) => [String(character.externalId), character]),
    );

    const synced = state.canonicalState.relationships.map((relationship) => {
      const existing = byExternalId.get(relationship.characterId);
      return {
        storySessionId: new Types.ObjectId(sessionId),
        externalId: relationship.characterId,
        name: existing ? String(existing.name) : relationship.label,
        role: existing ? String(existing.role) : "session-character",
        personality: existing?.personality ?? [],
        relationshipScore: relationship.score,
        relationshipBucket: toRelationshipBucket(relationship.score),
        statusFlags: relationship.flags,
        secretsKnown: existing?.secretsKnown ?? [],
        isPlayer: existing?.isPlayer ?? false,
      };
    });

    const remaining = currentCharacters
      .filter((character) => !synced.some((entry) => entry.externalId === String(character.externalId)))
      .map((character) => ({
        storySessionId: new Types.ObjectId(sessionId),
        externalId: String(character.externalId),
        name: String(character.name),
        role: String(character.role),
        personality: character.personality ?? [],
        relationshipScore: Number(character.relationshipScore),
        relationshipBucket: String(character.relationshipBucket),
        statusFlags: character.statusFlags ?? [],
        secretsKnown: character.secretsKnown ?? [],
        isPlayer: Boolean(character.isPlayer),
      }));

    await this.characterRepository.replaceForSession(sessionId, [...remaining, ...synced]);
  }

  private async requireOwnedSession(userId: string, sessionId: string) {
    const session = await this.sessionRepository.findOwnedById(userId, sessionId);
    if (!session) {
      throw new ApiError("Story session not found.", 404, "SESSION_NOT_FOUND");
    }

    return session;
  }

  private createAiOrchestrator(userId: string, storySessionId?: string) {
    return new StoryAiOrchestrator(undefined, {
      usageHook: (entry) =>
        this.analyticsTracker.trackAiUsage({
          ...entry,
          metadata: {
            ...entry.metadata,
            userId,
            storySessionId,
          },
        }),
      userId,
    });
  }

  private async rollbackFailedStart(input: {
    userId: string;
    sessionId: string;
    session: Awaited<ReturnType<StorySessionRepository["findOwnedById"]>>;
    createdStoryId: string | null;
    storyOutputLanguage: "en" | "vi";
    error: unknown;
  }) {
    const cleanupResults = await Promise.allSettled([
      this.worldRepository.deleteBySessionId(input.sessionId),
      this.characterRepository.deleteBySessionId(input.sessionId),
      this.snapshotRepository.deleteBySessionId(input.sessionId),
      this.turnLogRepository.deleteBySessionId(input.sessionId),
      this.summaryRepository.deleteBySessionId(input.sessionId),
      input.createdStoryId
        ? this.storyRepository.delete(input.createdStoryId)
        : Promise.resolve(null),
    ]);

    const cleanupFailures = cleanupResults
      .filter((result): result is PromiseRejectedResult => result.status === "rejected")
      .map((result) => serializeError(result.reason));

    const baseMetadata = toSessionMetadata(input.session?.metadata);
    const failureMessage =
      input.error instanceof ApiError && input.error.expose
        ? input.error.message
        : "Story start failed before the opening scene could be created.";

    const metadata = {
      ...baseMetadata,
      storyOutputLanguage: input.storyOutputLanguage,
      lastStartFailureAt: new Date().toISOString(),
      lastStartFailureCode:
        input.error instanceof ApiError ? input.error.code : "SESSION_START_FAILED",
      lastStartFailureMessage: failureMessage,
    };

    const sessionReset = await this.sessionRepository
      .updateOwned(input.userId, input.sessionId, {
        $set: {
          status: "paused",
          currentTurn: 0,
          currentSceneSummary: input.session?.premise ?? input.session?.currentSceneSummary ?? "",
          lastPlayedAt: new Date(),
          metadata,
        },
        $unset: {
          storyDocumentId: 1,
          latestSceneTitle: 1,
          latestSceneText: 1,
          branchKey: 1,
        },
      })
      .catch((sessionCleanupError) => {
        cleanupFailures.push(serializeError(sessionCleanupError));
        return null;
      });

    return {
      cleanedStoryDocument: Boolean(input.createdStoryId),
      cleanupFailures,
      sessionReset: Boolean(sessionReset),
    };
  }
}

function extractSearchKeywords(premise: string) {
  return Array.from(
    new Set(
      premise
        .toLowerCase()
        .split(/[^a-z0-9]+/i)
        .filter((word) => word.length >= 4)
        .slice(0, 12),
    ),
  );
}

function seedRelationshipsFromCharacters(
  state: StoryState,
  characters: Array<{
    id: string;
    name: string;
    role: string;
    initialRelationshipScore: number;
    statusFlags: string[];
  }>,
) {
  const relationships = { ...state.relationships };

  for (const character of characters) {
    relationships[character.id] = {
      characterId: character.id,
      name: character.name,
      role: character.role,
      affinity: normalizeRelationshipValue(character.initialRelationshipScore),
      trust: normalizeRelationshipValue(character.initialRelationshipScore),
      conflict: clampConflictScore(character.initialRelationshipScore),
      notes: "",
      statusFlags: character.statusFlags,
    };
  }

  return {
    ...state,
    relationships,
  };
}

function toRelationshipBucket(score: number) {
  if (score <= 20) {
    return "hostile";
  }
  if (score <= 40) {
    return "wary";
  }
  if (score <= 60) {
    return "neutral";
  }
  if (score <= 80) {
    return "trusted";
  }
  return "bonded";
}

function normalizeStoryOutputLanguage(value: unknown) {
  return value === "vi" ? "vi" : "en";
}

function toSessionMetadata(value: unknown) {
  return value && typeof value === "object"
    ? { ...(value as Record<string, unknown>) }
    : {};
}

function clearStartFailureMetadata(metadata: Record<string, unknown>) {
  const nextMetadata = { ...metadata };
  delete nextMetadata.lastStartFailureAt;
  delete nextMetadata.lastStartFailureCode;
  delete nextMetadata.lastStartFailureMessage;
  return nextMetadata;
}

function resolveFallbackSessionTitle(
  currentTitle: string,
  genre: string,
  language: "en" | "vi",
) {
  const trimmed = currentTitle.trim();
  if (trimmed && trimmed !== "Untitled Session") {
    return trimmed;
  }

  return language === "vi"
    ? `Phien ${genre}`
    : `${capitalize(genre)} Session`;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function normalizeRelationshipValue(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function clampConflictScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(50 - score / 2)));
}
