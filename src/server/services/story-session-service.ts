import { Types } from "mongoose";

import { analytics, type AnalyticsTracker } from "@/server/analytics/analytics-service";
import { StoryAiOrchestrator } from "@/server/ai/ai-orchestrator";
import { ApiError } from "@/server/api/errors/api-error";
import type { StorySessionDetailDto } from "@/server/api/dtos/story-session-dto";
import { presentStorySessionDetail } from "@/server/api/presenters/story-session-presenter";
import { MemoryService } from "@/server/memory/memory-service";
import { TurnProcessingService } from "@/server/narrative/turn-processing-service";
import type { PlayerAction, ProcessedTurn, StoryState } from "@/server/narrative/types";
import { CharacterStateRepository } from "@/server/persistence/repositories/character-state-repository";
import { SessionStateSnapshotRepository } from "@/server/persistence/repositories/session-state-snapshot-repository";
import { StoryRepository } from "@/server/persistence/repositories/story-repository";
import { StorySessionRepository } from "@/server/persistence/repositories/story-session-repository";
import { StorySummaryRepository } from "@/server/persistence/repositories/story-summary-repository";
import { StoryWorldRepository } from "@/server/persistence/repositories/story-world-repository";
import { TurnLogRepository } from "@/server/persistence/repositories/turn-log-repository";
import type {
  CreateStorySessionInput,
  StorySessionActionInput,
  StorySessionCustomActionInput,
} from "@/server/validation/api-schemas";

export class StorySessionService {
  private readonly aiOrchestrator: StoryAiOrchestrator;

  constructor(
    private readonly sessionRepository = new StorySessionRepository(),
    private readonly storyRepository = new StoryRepository(),
    private readonly worldRepository = new StoryWorldRepository(),
    private readonly characterRepository = new CharacterStateRepository(),
    private readonly snapshotRepository = new SessionStateSnapshotRepository(),
    private readonly turnLogRepository = new TurnLogRepository(),
    private readonly summaryRepository = new StorySummaryRepository(),
    private readonly turnProcessingService = new TurnProcessingService(),
    private readonly memoryService = new MemoryService(),
    private readonly analyticsTracker: AnalyticsTracker = analytics,
    aiOrchestrator?: StoryAiOrchestrator,
  ) {
    this.aiOrchestrator =
      aiOrchestrator ??
      new StoryAiOrchestrator(undefined, {
        usageHook: this.analyticsTracker.trackAiUsage,
      });
  }

  async createSession(userId: string, input: CreateStorySessionInput) {
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

    if (session.storyDocumentId) {
      return this.getSession(userId, sessionId);
    }

    const startedAt = Date.now();

    const world = await this.aiOrchestrator.generateWorld({
      genre: session.genre,
      tone: session.tone,
      premise: session.premise,
      enginePreset: session.enginePreset,
    });

    const [characters, title] = await Promise.all([
      this.aiOrchestrator.generateCharacters({
        genre: session.genre,
        tone: session.tone,
        premise: session.premise,
        enginePreset: session.enginePreset,
        world,
      }),
      this.aiOrchestrator.generateSessionTitle({
        genre: session.genre,
        tone: session.tone,
        premise: session.premise,
        enginePreset: session.enginePreset,
      }),
    ]);

    const initialProcessed = await this.turnProcessingService.createInitialTurn({
      titleHint: title.title,
      genre: session.genre,
      premise: session.premise,
      tone: session.tone,
      enginePreset: session.enginePreset,
      deterministic: Boolean(session.deterministic),
      seed: session.seed ?? undefined,
    }, sessionId);
    const processed = await this.enrichProcessedTurnWithMemory(sessionId, initialProcessed);

    const story = await this.storyRepository.create(processed.state);

    await Promise.all([
      this.worldRepository.upsertBySessionId(sessionId, {
        storySessionId: new Types.ObjectId(sessionId),
        setting: world.setting,
        worldRules: world.worldRules,
        playerRole: world.playerRole,
        conflict: world.conflict,
        startingLocation: world.startingLocation,
        seed: session.seed ?? world.seedHint,
        contentWarnings: world.contentWarnings,
      }),
      this.characterRepository.replaceForSession(
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
      ),
      this.persistTurnArtifacts(sessionId, processed),
      this.sessionRepository.updateOwned(userId, sessionId, {
        title: title.title,
        status: "active",
        currentTurn: processed.state.metadata.turnCount,
        currentSceneSummary: processed.state.summary,
        latestSceneTitle: processed.state.currentScene.title,
        latestSceneText: processed.state.currentScene.body,
        lastPlayedAt: new Date(),
        storyDocumentId: new Types.ObjectId(story.id),
        branchKey: processed.state.metadata.branchKey,
        deterministic: processed.state.metadata.deterministic,
        seed: processed.state.metadata.seed,
        metadata: {
          titleRationale: title.rationale,
          worldSeedHint: world.seedHint,
        },
      }),
    ]);

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
        turnNumber: processed.state.metadata.turnCount,
        latencyMs: Date.now() - startedAt,
      },
    });

    return this.getSession(userId, sessionId);
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

    return this.aiOrchestrator.generateRecap({
      contextPack: await this.memoryService.buildContextPack({
        sessionId,
        state: storyState,
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

    const startedAt = Date.now();
    const generatedTurn = await this.turnProcessingService.processTurn(storyState, action, sessionId);
    const processed = await this.enrichProcessedTurnWithMemory(sessionId, generatedTurn);
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

    return {
      processed,
      details,
      updatedStory: updatedStory!,
    };
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
        snapshotId: snapshot._id,
      }),
      this.summaryRepository.replaceTurnSummaries(
        sessionId,
        processed.turnLog.turnNumber,
        processed.memorySummaries ?? [],
      ),
    ]);
  }

  private async enrichProcessedTurnWithMemory(sessionId: string, processed: ProcessedTurn) {
    const memoryCapture = await this.memoryService.captureTurnMemory({
      sessionId,
      state: processed.state,
      turnLog: processed.turnLog,
      summaryCandidate: processed.summaryCandidate,
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
