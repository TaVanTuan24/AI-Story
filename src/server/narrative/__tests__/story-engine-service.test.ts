import { afterEach, describe, expect, it } from "vitest";

import { env } from "@/lib/config/env";
import { NarrativeEngine } from "@/server/narrative/engine";
import { StoryEngineService } from "@/server/narrative/story-engine-service";

describe("StoryEngineService", () => {
  const originalConsistency = env.MEMORY_ENABLE_CONSISTENCY_CHECK;
  const originalRepair = env.MEMORY_ENABLE_SCENE_REPAIR;
  const originalRepairAttempts = env.MEMORY_MAX_REPAIR_ATTEMPTS;

  afterEach(() => {
    env.MEMORY_ENABLE_CONSISTENCY_CHECK = originalConsistency;
    env.MEMORY_ENABLE_SCENE_REPAIR = originalRepair;
    env.MEMORY_MAX_REPAIR_ATTEMPTS = originalRepairAttempts;
  });

  it("preserves English story output language across the opening turn runtime", async () => {
    const service = new StoryEngineService();

    const result = await service.createInitialTurnWithOrchestrator(
      {
        titleHint: "Salt Ledger",
        genre: "mystery",
        premise:
          "An archivist finds tomorrow's census in tonight's sealed records.",
        tone: "tense",
        enginePreset: "mystery",
        deterministic: true,
        seed: "story-engine-opening-en",
        storyOutputLanguage: "en",
      },
      undefined,
      {
        generateOpeningSceneDetailed: async () => ({
          output: {
            story:
              "Rain struck the roof glass in hard silver lines while the archivist unfolded a ledger that should not have existed yet.",
            coreStateUpdates: {
              currentArc: "Tomorrow's Ledger",
              gameOver: false,
              endingType: null,
            },
            dynamicStatUpdates: {
              suspicion: {
                delta: 4,
                reason: "The impossible ledger draws immediate scrutiny.",
              },
            },
            newDynamicStats: {},
            relationshipUpdates: {},
            inventoryChanges: ["gain:future-ledger|Tomorrow's Ledger|1"],
            abilityChanges: [],
            flagChanges: ["add:opened-impossible-ledger"],
            worldMemoryUpdates: [
              "The protagonist touched evidence that should not exist yet.",
            ],
            choices: [
              {
                id: "choice_1",
                text: "Lock the archive doors and verify every seal on the ledger.",
                risk: "low",
                strategy: "Audit the evidence",
                hiddenImpact: "Buys certainty but costs time.",
              },
              {
                id: "choice_2",
                text: "Bring the ledger to the night supervisor before rumors spread.",
                risk: "medium",
                strategy: "Seek an ally",
                hiddenImpact: "May gain cover or expose the discovery early.",
              },
              {
                id: "choice_3",
                text: "Follow the footsteps outside the hall and see who already knows.",
                risk: "high",
                strategy: "Chase the threat",
                hiddenImpact: "May reveal the source but invites direct danger.",
              },
            ],
          },
          invocation: {
            requestId: "req_opening_en",
            task: "generateOpeningScene",
            promptVersion: "v1",
            provider: "openai",
            model: "gpt-5.4-mini",
            attempts: 1,
            usedFallback: false,
            usage: {
              inputTokens: 100,
              outputTokens: 200,
              totalTokens: 300,
            },
            structuredOutput: {
              status: "validated",
              repairCount: 0,
              hadValidationRetry: false,
            },
            output: {} as never,
            rawText: "{}",
          },
          route: {
            task: "opening_scene",
            provider: "openai",
            model: "gpt-5.4-mini",
            source: "app_fallback",
          },
        }),
      } as never,
    );

    expect(result.state.metadata.storyOutputLanguage).toBe("en");
    expect(result.turnLog.action.normalizedText).toBe("Begin the story.");
    expect(result.summaryCandidate.short).toContain("success");
    expect(result.state.currentScene.choices).toHaveLength(3);
  });

  it("ends the run cleanly with zero choices when the resolved turn is terminal", async () => {
    const engine = new NarrativeEngine({ deterministic: true });
    const service = new StoryEngineService(engine);
    const state = engine.createInitialState({
      titleHint: "Black Ice",
      genre: "survival",
      premise:
        "A guide is trapped between a frozen valley and the armed convoy hunting them.",
      tone: "grim",
      enginePreset: "rpg-lite",
      deterministic: true,
      seed: "story-engine-game-over",
      storyOutputLanguage: "en",
    });

    const result = await service.processTurnWithOrchestrator(
      state,
      {
        type: "custom",
        input: "I sprint across the cracked ice and ignore the rifles behind me.",
      },
      undefined,
      {
        interpretCustomActionDetailed: async () => ({
          output: {
            normalizedText:
              "I sprint across the cracked ice and ignore the rifles behind me.",
            intent: "escape",
            tags: ["custom", "desperate"],
            rationale: "The action is primarily an attempt to flee immediate danger.",
          },
          invocation: {
            requestId: "req_interpret_escape",
            task: "interpretCustomAction",
            promptVersion: "v1",
            provider: "openai",
            model: "gpt-5.4-mini",
            attempts: 1,
            usedFallback: false,
            structuredOutput: {
              status: "validated",
              repairCount: 0,
              hadValidationRetry: false,
            },
            output: {} as never,
            rawText: "{}",
          },
          route: {
            task: "custom_action_interpretation",
            provider: "openai",
            model: "gpt-5.4-mini",
            source: "app_fallback",
          },
        }),
        generateNextSceneDetailed: async () => ({
          output: {
            story:
              "The ice does not break at once. It groans first, thin and long, before the weight of panic tips everything past recovery.",
            coreStateUpdates: {
              currentArc: "The Ice Closes",
              gameOver: true,
              endingType: "bad",
            },
            dynamicStatUpdates: {
              health: {
                delta: -40,
                reason: "The collapse drives survival below the point of recovery.",
              },
            },
            newDynamicStats: {},
            relationshipUpdates: {},
            inventoryChanges: ["lose:rope|Rope|1"],
            abilityChanges: [],
            flagChanges: ["add:critical_failure"],
            worldMemoryUpdates: [
              "The ice gave way and closed off every chance to correct the mistake.",
            ],
            choices: [],
          },
          invocation: {
            requestId: "req_game_over_scene",
            task: "generateNextScene",
            promptVersion: "v1",
            provider: "openai",
            model: "gpt-5.4-mini",
            attempts: 1,
            usedFallback: false,
            structuredOutput: {
              status: "validated",
              repairCount: 0,
              hadValidationRetry: false,
            },
            output: {} as never,
            rawText: "{}",
          },
          route: {
            task: "next_scene",
            provider: "openai",
            model: "gpt-5.4-mini",
            source: "app_fallback",
          },
        }),
      } as never,
    );

    expect(result.state.gameOver).toBe(true);
    expect(result.state.metadata.status).toBe("completed");
    expect(result.state.currentScene.choices).toHaveLength(0);
    expect(result.turnLog.gameOver).toBe(true);
    expect(result.turnLog.choices).toHaveLength(0);
    expect(result.aiResponse?.requestId).toBe("req_game_over_scene");
  });

  it("repairs a scene through consistency checking when repair is enabled", async () => {
    env.MEMORY_ENABLE_CONSISTENCY_CHECK = true;
    env.MEMORY_ENABLE_SCENE_REPAIR = true;
    env.MEMORY_MAX_REPAIR_ATTEMPTS = 1;

    const engine = new NarrativeEngine({ deterministic: true });
    const service = new StoryEngineService(engine);
    const state = engine.createInitialState({
      titleHint: "Salt Ledger",
      genre: "mystery",
      premise:
        "An archivist finds tomorrow's census in tonight's sealed records.",
      tone: "tense",
      enginePreset: "mystery",
      deterministic: true,
      seed: "story-engine-consistency-repair",
      storyOutputLanguage: "en",
    });

    const generatedBodies: string[] = [];
    const repairAttemptsSeen: number[] = [];

    const result = await service.processTurnWithOrchestrator(
      state,
      {
        type: "custom",
        input: "I confront the witness before they can leave.",
      },
      undefined,
      {
        interpretCustomActionDetailed: async () => ({
          output: {
            normalizedText: "I confront the witness before they can leave.",
            intent: "socialize",
            tags: ["custom", "urgent"],
            rationale: "The action pressures a person directly.",
          },
          invocation: {
            requestId: "req_interpret_social",
            task: "interpretCustomAction",
            promptVersion: "v1",
            provider: "openai",
            model: "gpt-5.4-mini",
            attempts: 1,
            usedFallback: false,
            structuredOutput: {
              status: "validated",
              repairCount: 0,
              hadValidationRetry: false,
            },
            output: {} as never,
            rawText: "{}",
          },
          route: {
            task: "custom_action_interpretation",
            provider: "openai",
            model: "gpt-5.4-mini",
            source: "app_fallback",
          },
        }),
        generateNextSceneDetailed: async ({ contextPack }: { contextPack: { repairContext?: { attempt: number } } }) => {
          repairAttemptsSeen.push(contextPack.repairContext?.attempt ?? 0);

          const story =
            contextPack.repairContext?.attempt === 1
              ? "The repaired scene keeps the archive sealed and the witness in character."
              : "The broken scene suddenly moves to a sunny beach and ignores the sealed archive.";

          generatedBodies.push(story);

          return {
            output: {
              story,
              coreStateUpdates: {
                currentArc: "Confrontation",
                gameOver: false,
                endingType: null,
              },
              dynamicStatUpdates: {},
              newDynamicStats: {},
              relationshipUpdates: {},
              inventoryChanges: [],
              abilityChanges: [],
              flagChanges: [],
              worldMemoryUpdates: [],
              choices: [
                {
                  id: "choice_1",
                  text: "Press for details.",
                  risk: "medium",
                  strategy: "Push the conversation",
                  hiddenImpact: "The witness may reveal more than intended.",
                },
                {
                  id: "choice_2",
                  text: "Back off and observe.",
                  risk: "low",
                  strategy: "Read the room",
                  hiddenImpact: "You may catch a lie forming.",
                },
                {
                  id: "choice_3",
                  text: "Threaten to report them.",
                  risk: "high",
                  strategy: "Force a reaction",
                  hiddenImpact: "May gain leverage or harden resistance.",
                },
              ],
            },
            invocation: {
              requestId:
                contextPack.repairContext?.attempt === 1
                  ? "req_scene_repaired"
                  : "req_scene_broken",
              task: "generateNextScene",
              promptVersion: "v1",
              provider: "openai",
              model: "gpt-5.4-mini",
              attempts: 1,
              usedFallback: false,
              structuredOutput: {
                status: "validated",
                repairCount: 0,
                hadValidationRetry: false,
              },
              output: {} as never,
              rawText: "{}",
            },
            route: {
              task: "next_scene",
              provider: "openai",
              model: "gpt-5.4-mini",
              source: "app_fallback",
            },
          };
        },
        checkConsistencyDetailed: async ({ candidateScene }: { candidateScene: { body: string } }) => ({
          output: candidateScene.body.includes("sunny beach")
            ? {
                valid: false,
                issues: ["Scene breaks world continuity."],
                recommendations: ["Keep the archive sealed and grounded in the current setting."],
              }
            : {
                valid: true,
                issues: [],
                recommendations: [],
              },
          invocation: {
            requestId: candidateScene.body.includes("sunny beach")
              ? "req_consistency_fail"
              : "req_consistency_pass",
            task: "checkConsistency",
            promptVersion: "v1",
            provider: "openai",
            model: "gpt-5.4-mini",
            attempts: 1,
            usedFallback: false,
            structuredOutput: {
              status: "validated",
              repairCount: 0,
              hadValidationRetry: false,
            },
            output: {} as never,
            rawText: "{}",
          },
          route: {
            task: "consistency_check",
            provider: "openai",
            model: "gpt-5.4-mini",
            source: "app_fallback",
          },
        }),
      } as never,
    );

    expect(generatedBodies).toEqual([
      "The broken scene suddenly moves to a sunny beach and ignores the sealed archive.",
      "The repaired scene keeps the archive sealed and the witness in character.",
    ]);
    expect(repairAttemptsSeen).toEqual([0, 1]);
    expect(result.consistency).toMatchObject({
      repaired: true,
      repairAttempts: 1,
      usedFallbackRepair: false,
    });
    expect(result.turnLog.aiResponse?.consistency).toMatchObject({
      checked: true,
      repaired: true,
      repairAttempts: 1,
    });
    expect(result.state.currentScene.body).toContain("repaired scene");
  });
});
