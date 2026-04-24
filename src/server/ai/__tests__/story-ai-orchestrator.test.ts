import { describe, expect, it } from "vitest";

import { StoryAiOrchestrator } from "@/server/ai/ai-orchestrator";
import type {
  AiInvocationResult,
  AiProvider,
  AiStructuredRequest,
} from "@/server/ai/types";
import type { NarrativeContextPack } from "@/server/narrative/types";

describe("StoryAiOrchestrator", () => {
  it("propagates direct story output language to prompt requests", async () => {
    const provider = new CaptureProvider();
    const orchestrator = new StoryAiOrchestrator(provider);

    const result = await orchestrator.generateSessionTitle({
      genre: "mystery",
      tone: "tense",
      premise: "A witness disappears after naming the wrong suspect.",
      enginePreset: "mystery",
      storyOutputLanguage: "vi",
    });

    expect(provider.lastRequest?.userPrompt).toContain("Vietnamese");
    expect(result.title).toBe("Phien choi chua dat ten");
  });

  it("propagates context-pack story output language to scene prompts", async () => {
    const provider = new CaptureProvider();
    const orchestrator = new StoryAiOrchestrator(provider);

    const result = await orchestrator.generateOpeningScene({
      contextPack: createContextPack("vi"),
    });

    expect(provider.lastRequest?.userPrompt).toContain("Vietnamese");
    expect(provider.lastRequest?.userPrompt).toContain('"storyOutputLanguage": "vi"');
    expect(result.story).toContain("Dem dau tien");
  });
});

class CaptureProvider implements AiProvider {
  readonly name = "openai";
  readonly defaultModel = "gpt-5.4-mini";
  lastRequest: AiStructuredRequest<unknown> | null = null;

  async invokeStructured<TResult>(
    request: AiStructuredRequest<unknown>,
  ): Promise<AiInvocationResult<TResult>> {
    this.lastRequest = request;

    return {
      requestId: "req_test",
      task: request.task,
      promptVersion: request.promptVersion,
      provider: this.name,
      model: this.defaultModel,
      attempts: 1,
      usedFallback: false,
      structuredOutput: {
        status: "validated",
        repairCount: 0,
        hadValidationRetry: false,
      },
      output: request.fallback() as TResult,
      rawText: JSON.stringify(request.fallback()),
    };
  }
}

function createContextPack(storyOutputLanguage: "en" | "vi"): NarrativeContextPack {
  return {
    storyId: "story-1",
    title: "Salt Ledger",
    genre: "mystery",
    tone: "tense",
    premise: "A clerk finds tomorrow's census in today's archive.",
    enginePreset: "mystery",
    currentTurn: 0,
    deterministic: true,
    currentSceneSummary: "The archive is sealed for the night.",
    worldRules: ["Names written in salt can bind promises."],
    coreState: {
      genre: "mystery",
      tone: "tense",
      currentArc: "Khởi đầu vụ án",
      turn: 0,
      gameOver: false,
      endingType: null,
      gameRules: ["Bằng chứng phải được tích lũy trước khi kết luận."],
    },
    dynamicStats: [
      {
        key: "focus",
        value: 80,
        label: "Tập trung",
        description: "Khả năng ghép nối dữ kiện.",
        min: 0,
        max: 100,
      },
    ],
    relationships: [],
    flags: { world: ["session-started"], quest: [], story: ["session-started"] },
    stats: { focus: 80 },
    inventory: [],
    abilities: [],
    clues: [],
    knownFacts: [],
    memory: {
      shortTerm: [],
      rollingSummaries: [],
      canon: {
        facts: [],
        irreversibleEvents: [],
        importantFlags: [],
      },
    },
    continuity: {
      protectionRules: [],
      contradictionPolicy: [],
      consistencyCheckEnabled: true,
    },
    guidance: {
      shouldRespectContinuity: true,
      stateOwnedByEngine: true,
      outputExpectations: [],
    },
    storyHistory: [],
    worldMemory: [],
    playerStats: {
      health: 65,
      stamina: 60,
      morale: 55,
      trust: 40,
      suspicion: 20,
      danger: 15,
      stress: 25,
      focus: 55,
    },
    lastChoice: null,
    gameOver: false,
    language: {
      storyOutputLanguage,
      instruction:
        storyOutputLanguage === "vi"
          ? "Write all player-facing generated story text in Vietnamese."
          : "Write all player-facing generated story text in English.",
    },
  };
}
