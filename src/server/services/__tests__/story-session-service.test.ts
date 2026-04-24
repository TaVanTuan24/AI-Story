import { describe, expect, it, vi } from "vitest";

import { AiStructuredOutputValidationError } from "@/server/ai/errors";
import { NarrativeEngine } from "@/server/narrative/engine";
import { StorySessionService } from "@/server/services/story-session-service";

describe("StorySessionService.startSession", () => {
  it("falls back to a safe session title when title generation fails", async () => {
    const sessionId = "507f1f77bcf86cd799439013";
    const engine = new NarrativeEngine({ deterministic: true });
    const baseState = engine.createInitialState({
      titleHint: "Untitled Session",
      genre: "fantasy",
      premise: "A royal courier finds a sealed map that updates itself at dawn.",
      tone: "mysterious",
      enginePreset: "freeform",
      deterministic: false,
      seed: "seed-1",
      storyOutputLanguage: "en",
    });
    const session = {
      _id: sessionId,
      userId: "user-1",
      title: "Untitled Session",
      premise: "A royal courier finds a sealed map that updates itself at dawn.",
      genre: "fantasy",
      tone: "mysterious",
      enginePreset: "freeform",
      status: "paused",
      currentTurn: 0,
      currentSceneSummary: "A royal courier finds a sealed map that updates itself at dawn.",
      metadata: {
        storyOutputLanguage: "en",
      },
    };

    const sessionRepository = {
      findOwnedById: vi.fn().mockResolvedValue(session),
      updateOwned: vi.fn().mockResolvedValue({
        ...session,
        title: "Fantasy Session",
        status: "active",
      }),
    };
    const storyRepository = {
      create: vi.fn().mockResolvedValue({ id: "507f1f77bcf86cd799439099" }),
      findById: vi.fn().mockResolvedValue(null),
      delete: vi.fn().mockResolvedValue(null),
    };
    const worldRepository = {
      upsertBySessionId: vi.fn().mockResolvedValue(undefined),
      findBySessionId: vi.fn().mockResolvedValue(null),
      deleteBySessionId: vi.fn().mockResolvedValue(undefined),
    };
    const characterRepository = {
      replaceForSession: vi.fn().mockResolvedValue(undefined),
      findBySessionId: vi.fn().mockResolvedValue([]),
      deleteBySessionId: vi.fn().mockResolvedValue(undefined),
    };
    const snapshotRepository = {
      create: vi.fn().mockResolvedValue({ _id: "507f1f77bcf86cd799439098" }),
      deleteBySessionId: vi.fn().mockResolvedValue(undefined),
    };
    const turnLogRepository = {
      create: vi.fn().mockResolvedValue(undefined),
      deleteBySessionId: vi.fn().mockResolvedValue(undefined),
    };
    const summaryRepository = {
      replaceTurnSummaries: vi.fn().mockResolvedValue([]),
      deleteBySessionId: vi.fn().mockResolvedValue(undefined),
    };
    const preferenceRepository = {
      upsertDefault: vi.fn().mockResolvedValue({ storyOutputLanguage: "en" }),
    };
    const turnProcessingService = {
      createInitialTurnWithOrchestrator: vi.fn().mockResolvedValue({
        state: {
          ...baseState,
          metadata: {
            ...baseState.metadata,
            turnCount: 1,
            branchKey: "branch-1",
          },
          summary: "Opening summary",
          currentScene: {
            ...baseState.currentScene,
            title: "Opening scene",
            body: "Opening body",
          },
        },
        turnLog: {
          turnNumber: 1,
          action: {
            source: "custom",
            originalInput: "Begin the story.",
            normalizedText: "Begin the story.",
            intent: "observe",
            tags: ["opening"],
          },
          sceneTitle: "Opening scene",
          sceneBody: "Opening body",
          sceneSummary: "Opening summary",
          choices: [
            { id: "choice-1", label: "Look closer", intent: "observe", tags: [], risk: "low", hiddenImpact: "More detail." },
          ],
          deltaLog: [],
          createdAt: new Date().toISOString(),
          risk: "low",
          outcome: "success",
          roll: 12,
          gameOver: false,
        },
        summaryCandidate: {
          short: "Opening summary",
          medium: "Opening summary",
          canon: "Opening summary",
          canonUpdate: {
            facts: [],
            irreversibleEvents: [],
            importantFlags: [],
          },
        },
        contextPack: {} as never,
        deltaLog: [],
      }),
    };
    const memoryService = {
      captureTurnMemory: vi.fn().mockResolvedValue({
        state: {
          ...baseState,
          metadata: {
            ...baseState.metadata,
            turnCount: 1,
            branchKey: "branch-1",
          },
          summary: "Opening summary",
          currentScene: {
            ...baseState.currentScene,
            title: "Opening scene",
            body: "Opening body",
          },
        },
        summaries: [],
      }),
    };
    const analyticsTracker = {
      track: vi.fn(),
      trackAiUsage: vi.fn(),
    };

    const service = new StorySessionService(
      sessionRepository as never,
      storyRepository as never,
      worldRepository as never,
      characterRepository as never,
      snapshotRepository as never,
      turnLogRepository as never,
      summaryRepository as never,
      preferenceRepository as never,
      turnProcessingService as never,
      memoryService as never,
      analyticsTracker as never,
    );

    (
      service as unknown as {
        createAiOrchestrator: () => unknown;
      }
    ).createAiOrchestrator = () => ({
      generateWorld: vi.fn().mockResolvedValue({
        setting: "A dawnlit road kingdom",
        worldRules: ["Maps change at sunrise."],
        playerRole: "Royal courier",
        conflict: "Someone wants the map before it updates again.",
        startingLocation: "A watchtower road",
        seedHint: "dawn-map",
        contentWarnings: [],
      }),
      generateCharacters: vi.fn().mockResolvedValue({
        characters: [
          {
            id: "courier",
            name: "Mira",
            role: "Royal courier",
            personality: ["alert"],
            initialRelationshipScore: 50,
            statusFlags: [],
            secretsKnown: [],
            isPlayer: true,
          },
        ],
      }),
      generateSessionTitle: vi.fn().mockRejectedValue(new Error("title failure")),
    });

    await service.startSession("user-1", sessionId);

    expect(sessionRepository.updateOwned).toHaveBeenCalledWith(
      "user-1",
      sessionId,
      expect.objectContaining({
        title: "Fantasy Session",
      }),
    );
  });

  it("resets session start metadata cleanly when character generation fails after world generation", async () => {
    const session = {
      _id: "session-1",
      userId: "user-1",
      title: "Untitled Session",
      premise: "A disgraced cartographer discovers a city that only appears during eclipses.",
      genre: "mystery",
      tone: "tense",
      enginePreset: "mystery",
      status: "paused",
      currentTurn: 0,
      currentSceneSummary:
        "A disgraced cartographer discovers a city that only appears during eclipses.",
      metadata: {
        storyOutputLanguage: "en",
      },
    };

    const sessionRepository = {
      findOwnedById: vi.fn().mockResolvedValue(session),
      updateOwned: vi.fn().mockResolvedValue({
        ...session,
        status: "paused",
      }),
    };
    const storyRepository = {
      create: vi.fn(),
      delete: vi.fn().mockResolvedValue(null),
    };
    const worldRepository = {
      upsertBySessionId: vi.fn(),
      deleteBySessionId: vi.fn().mockResolvedValue(undefined),
    };
    const characterRepository = {
      replaceForSession: vi.fn(),
      deleteBySessionId: vi.fn().mockResolvedValue(undefined),
      findBySessionId: vi.fn().mockResolvedValue([]),
    };
    const snapshotRepository = {
      deleteBySessionId: vi.fn().mockResolvedValue(undefined),
    };
    const turnLogRepository = {
      deleteBySessionId: vi.fn().mockResolvedValue(undefined),
    };
    const summaryRepository = {
      deleteBySessionId: vi.fn().mockResolvedValue(undefined),
    };
    const preferenceRepository = {
      upsertDefault: vi.fn(),
    };
    const turnProcessingService = {
      createInitialTurnWithOrchestrator: vi.fn(),
    };
    const memoryService = {
      captureTurnMemory: vi.fn(),
    };
    const analyticsTracker = {
      track: vi.fn(),
      trackAiUsage: vi.fn(),
    };

    const service = new StorySessionService(
      sessionRepository as never,
      storyRepository as never,
      worldRepository as never,
      characterRepository as never,
      snapshotRepository as never,
      turnLogRepository as never,
      summaryRepository as never,
      preferenceRepository as never,
      turnProcessingService as never,
      memoryService as never,
      analyticsTracker as never,
    );

    const generateCharactersError = new AiStructuredOutputValidationError(
      "The AI returned an invalid story structure. Please retry or choose a different model.",
      {
        provider: "xai",
        model: "grok-4-1-fast-reasoning",
        task: "generateCharacters",
      },
    );

    (
      service as unknown as {
        createAiOrchestrator: () => unknown;
      }
    ).createAiOrchestrator = () => ({
      generateWorld: vi.fn().mockResolvedValue({
        setting: "A hidden eclipse city",
        worldRules: ["Maps change when the eclipse begins."],
        playerRole: "Disgraced cartographer",
        conflict: "Rival guilds want the city first.",
        startingLocation: "An abandoned observatory",
        seedHint: "eclipse-city",
        contentWarnings: [],
      }),
      generateCharacters: vi.fn().mockRejectedValue(generateCharactersError),
      generateSessionTitle: vi.fn().mockResolvedValue({
        title: "Eclipse Cartographer",
        rationale: "Matches the premise.",
      }),
    });

    await expect(service.startSession("user-1", "session-1")).rejects.toBe(
      generateCharactersError,
    );

    expect(worldRepository.upsertBySessionId).not.toHaveBeenCalled();
    expect(characterRepository.replaceForSession).not.toHaveBeenCalled();
    expect(storyRepository.create).not.toHaveBeenCalled();
    expect(storyRepository.delete).not.toHaveBeenCalled();

    expect(worldRepository.deleteBySessionId).toHaveBeenCalledWith("session-1");
    expect(characterRepository.deleteBySessionId).toHaveBeenCalledWith("session-1");
    expect(snapshotRepository.deleteBySessionId).toHaveBeenCalledWith("session-1");
    expect(turnLogRepository.deleteBySessionId).toHaveBeenCalledWith("session-1");
    expect(summaryRepository.deleteBySessionId).toHaveBeenCalledWith("session-1");

    expect(sessionRepository.updateOwned).toHaveBeenCalledWith(
      "user-1",
      "session-1",
      expect.objectContaining({
        $set: expect.objectContaining({
          status: "paused",
          currentTurn: 0,
          metadata: expect.objectContaining({
            storyOutputLanguage: "en",
            lastStartFailureCode: "AI_STRUCTURED_OUTPUT_INVALID",
            lastStartFailureMessage:
              "The AI returned an invalid story structure. Please retry or choose a different model.",
          }),
        }),
        $unset: expect.objectContaining({
          storyDocumentId: 1,
          latestSceneTitle: 1,
          latestSceneText: 1,
          branchKey: 1,
        }),
      }),
    );
  });

  it("persists zero-choice game-over turns together with AI request metadata", async () => {
    const engine = new NarrativeEngine({ deterministic: true });
    const baseState = engine.createInitialState({
      titleHint: "Black Ice",
      genre: "survival",
      premise:
        "A guide is trapped between a frozen valley and the armed convoy hunting them.",
      tone: "grim",
      enginePreset: "rpg-lite",
      deterministic: true,
      seed: "persist-turn-ai-metadata",
      storyOutputLanguage: "en",
    });
    const sessionId = "507f1f77bcf86cd799439011";
    const storyId = "507f1f77bcf86cd799439012";

    const storyState = {
      ...baseState,
      id: storyId,
    };
    const processedState = {
      ...storyState,
      currentScene: {
        sceneNumber: 1,
        title: "Turn 1: Ending",
        body: "The ice gives way and the run ends here.",
        choices: [],
        outcome: "failure" as const,
        risk: "high" as const,
        roll: 91,
        gameOver: true,
      },
      scenes: [
        ...storyState.scenes,
        {
          sceneNumber: 1,
          title: "Turn 1: Ending",
          body: "The ice gives way and the run ends here.",
          choices: [],
          outcome: "failure" as const,
          risk: "high" as const,
          roll: 91,
          gameOver: true,
        },
      ],
      summary: "The ice gives way and the run ends here.",
      summaryCandidate: "The ice gives way and the run ends here.",
      storyHistory: [...storyState.storyHistory, "The ice gives way and the run ends here."],
      gameOver: true,
      metadata: {
        ...storyState.metadata,
        turnCount: 1,
        status: "completed" as const,
      },
      turnHistory: [],
    };

    const session = {
      _id: "session-1",
      userId: "user-1",
      title: "Black Ice",
      premise: storyState.premise,
      genre: storyState.genre,
      tone: storyState.tone,
      enginePreset: storyState.enginePreset,
      status: "active",
      currentTurn: 0,
      currentSceneSummary: storyState.premise,
      storyDocumentId: storyId,
      metadata: {
        storyOutputLanguage: "en",
      },
    };

    const createdTurnLog = vi.fn().mockResolvedValue({});
    const sessionRepository = {
      findOwnedById: vi.fn().mockResolvedValue(session),
      updateOwned: vi.fn().mockResolvedValue({
        ...session,
        currentTurn: 1,
        status: "active",
      }),
    };
    const storyRepository = {
      findById: vi.fn().mockResolvedValue(storyState),
      update: vi.fn().mockResolvedValue(processedState),
    };
    const worldRepository = {
      findBySessionId: vi.fn().mockResolvedValue(null),
    };
    const characterRepository = {
      findBySessionId: vi.fn().mockResolvedValue([]),
      replaceForSession: vi.fn().mockResolvedValue(undefined),
    };
    const snapshotRepository = {
      create: vi.fn().mockResolvedValue({ _id: "snapshot-1" }),
    };
    const turnLogRepository = {
      create: createdTurnLog,
    };
    const summaryRepository = {
      replaceTurnSummaries: vi.fn().mockResolvedValue([]),
    };
    const preferenceRepository = {
      upsertDefault: vi.fn().mockResolvedValue({ storyOutputLanguage: "en" }),
    };
    const turnProcessingService = {
      processTurnWithOrchestrator: vi.fn().mockResolvedValue({
        state: processedState,
        turnLog: {
          turnNumber: 1,
          action: {
            source: "choice" as const,
            originalInput: "Run for the ridge",
            normalizedText: "Run for the ridge",
            selectedChoiceId: "choice-1",
            intent: "escape" as const,
            tags: ["desperate"],
          },
          sceneTitle: "Turn 1: Ending",
          sceneBody: "The ice gives way and the run ends here.",
          sceneSummary: "The ice gives way and the run ends here.",
          choices: [],
          deltaLog: [],
          createdAt: new Date().toISOString(),
          risk: "high" as const,
          outcome: "failure" as const,
          roll: 91,
          gameOver: true,
          aiResponse: {
            requestId: "req_turn_1",
            provider: "openai",
            model: "gpt-5.4-mini",
            task: "generateNextScene",
            promptVersion: "v1",
            attempts: 2,
            retryCount: 1,
            providerRequestId: "provider_turn_1",
            structuredOutput: {
              status: "repaired" as const,
              repairCount: 2,
              hadValidationRetry: true,
            },
            consistency: {
              checked: true,
              valid: true,
              issues: [],
              recommendations: [],
              repairAttempts: 1,
              repaired: true,
              usedFallbackRepair: false,
            },
          },
        },
        summaryCandidate: {
          short: "The run ends in failure.",
          medium: "The ice gives way and the run ends here.",
          canon: "Turn 1 ended when the ice gave way.",
          canonUpdate: {
            facts: [],
            irreversibleEvents: ["game-over"],
            importantFlags: ["critical_failure"],
          },
        },
        contextPack: {} as never,
        deltaLog: [],
        aiResponse: {
          requestId: "req_turn_1",
          provider: "openai",
          model: "gpt-5.4-mini",
          task: "generateNextScene",
          promptVersion: "v1",
          attempts: 2,
          retryCount: 1,
          providerRequestId: "provider_turn_1",
          structuredOutput: {
            status: "repaired" as const,
            repairCount: 2,
            hadValidationRetry: true,
          },
          consistency: {
            checked: true,
            valid: true,
            issues: [],
            recommendations: [],
            repairAttempts: 1,
            repaired: true,
            usedFallbackRepair: false,
          },
        },
      }),
    };
    const memoryService = {
      captureTurnMemory: vi.fn().mockResolvedValue({
        state: processedState,
        summaries: [],
      }),
    };
    const analyticsTracker = {
      track: vi.fn(),
      trackAiUsage: vi.fn(),
    };

    const service = new StorySessionService(
      sessionRepository as never,
      storyRepository as never,
      worldRepository as never,
      characterRepository as never,
      snapshotRepository as never,
      turnLogRepository as never,
      summaryRepository as never,
      preferenceRepository as never,
      turnProcessingService as never,
      memoryService as never,
      analyticsTracker as never,
    );

    await service.submitChoiceTurn("user-1", sessionId, {
      choiceId: "choice-1",
    });

    expect(createdTurnLog).toHaveBeenCalledWith(
      expect.objectContaining({
        gameOver: true,
        presentedChoices: [],
        aiResponseRef: expect.objectContaining({
          provider: "openai",
          requestId: "req_turn_1",
          model: "gpt-5.4-mini",
          task: "generateNextScene",
          promptVersion: "v1",
          attempts: 2,
          retryCount: 1,
          providerRequestId: "provider_turn_1",
          structuredOutput: {
            status: "repaired",
            repairCount: 2,
            hadValidationRetry: true,
          },
          consistency: {
            checked: true,
            valid: true,
            issues: [],
            recommendations: [],
            repairAttempts: 1,
            repaired: true,
            usedFallbackRepair: false,
          },
        }),
      }),
    );
  });
});
