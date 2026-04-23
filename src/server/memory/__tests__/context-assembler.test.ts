import { describe, expect, it } from "vitest";

import { assembleContextPack } from "@/server/memory/context-assembler";
import type { StoryState, StoryTurnRecord } from "@/server/narrative/types";

describe("assembleContextPack", () => {
  it("prioritizes immutable canon and trims rolling summaries", () => {
    const state = createState();
    const recentTurns = createRecentTurns();

    const contextPack = assembleContextPack({
      storyId: "branch-1",
      state,
      recentTurns,
      consistencyCheckEnabled: true,
      canonFactsMax: 2,
      rollingSummariesMax: 2,
    });

    expect(contextPack.memory.shortTerm).toHaveLength(3);
    expect(contextPack.memory.rollingSummaries).toEqual([
      {
        turnNumber: 6,
        fromTurn: 3,
        toTurn: 4,
        content: "A fragile alliance formed after the break-in.",
      },
      {
        turnNumber: 8,
        fromTurn: 5,
        toTurn: 8,
        content: "The debt collector was exposed as the duke's agent.",
      },
    ]);
    expect(contextPack.memory.canon.facts).toEqual([
      expect.objectContaining({ id: "hero-origin", immutable: true }),
      expect.objectContaining({ id: "duke-secret", immutable: false }),
    ]);
  });

  it("includes repair context and continuity rules for guarded retries", () => {
    const contextPack = assembleContextPack({
      storyId: "branch-2",
      state: createState(),
      recentTurns: createRecentTurns().slice(-2),
      consistencyCheckEnabled: false,
      canonFactsMax: 4,
      rollingSummariesMax: 1,
      repairContext: {
        attempt: 1,
        issues: ["The scene resurrects a dead witness."],
        recommendations: ["Keep the witness absent and use testimony records instead."],
      },
    });

    expect(contextPack.repairContext?.attempt).toBe(1);
    expect(contextPack.continuity.consistencyCheckEnabled).toBe(false);
    expect(contextPack.continuity.protectionRules).toContain(
      "Do not contradict irreversible events, character facts, or important flags.",
    );
  });
});

function createState(): StoryState {
  return {
    title: "The Salt Archive",
    genre: "mystery",
    premise: "A clerk finds a census written for people who have not been born yet.",
    tone: "tense",
    enginePreset: "mystery",
    currentScene: {
      sceneNumber: 8,
      title: "The Lantern Court",
      body: "Rain hisses across the stones while the court seals its gates.",
      choices: [],
    },
    scenes: [],
    summary: "The court closed around the protagonist after the duke's messenger arrived.",
    summaryCandidate:
      "The court closed around the protagonist after the duke's messenger arrived.",
    worldRules: ["Names written in salt can bind promises.", "The dead cannot speak directly."],
    memory: {
      shortTerm: [],
      rollingSummaries: [
        {
          turnNumber: 4,
          fromTurn: 1,
          toTurn: 2,
          content: "The protagonist stole the registry key and fled the harbor office.",
        },
        {
          turnNumber: 6,
          fromTurn: 3,
          toTurn: 4,
          content: "A fragile alliance formed after the break-in.",
        },
        {
          turnNumber: 8,
          fromTurn: 5,
          toTurn: 8,
          content: "The debt collector was exposed as the duke's agent.",
        },
      ],
      canon: {
        facts: [
          {
            id: "duke-secret",
            category: "character",
            subject: "The duke",
            value: "He funds the census through shell charities.",
            source: "summary",
            immutable: false,
            introducedAtTurn: 6,
            lastConfirmedTurn: 8,
          },
          {
            id: "hero-origin",
            category: "world",
            subject: "The protagonist",
            value: "Former archive clerk from South Quay.",
            source: "engine",
            immutable: true,
            introducedAtTurn: 0,
            lastConfirmedTurn: 8,
          },
          {
            id: "lantern-court",
            category: "event",
            subject: "Lantern Court",
            value: "Closed at dusk after the magistrate's death.",
            source: "summary",
            immutable: false,
            introducedAtTurn: 7,
            lastConfirmedTurn: 7,
          },
        ],
        irreversibleEvents: ["Magistrate Elian is dead."],
        importantFlags: ["session-started", "active-lead"],
        conflicts: [],
      },
      entities: ["protagonist", "duke", "Magistrate Elian"],
    },
    canonicalState: {
      sceneSummary:
        "The court closed around the protagonist after the duke's messenger arrived.",
      worldFlags: ["session-started"],
      questFlags: ["active-lead"],
      inventory: [{ id: "salt-key", label: "Salt Key", quantity: 1, tags: ["artifact"] }],
      stats: {
        health: 82,
        stamina: 70,
        morale: 64,
        focus: 76,
        suspicion: 52,
        influence: 31,
        trust: 45,
        stress: 58,
        danger: 61,
      },
      relationships: [
        {
          characterId: "duke-agent",
          label: "Duke's agent",
          score: 22,
          level: "wary",
          flags: ["exposed"],
        },
      ],
      clues: [{ id: "census-ledger", label: "Census Ledger", description: "", discoveredAtTurn: 3, tags: [] }],
      worldFacts: [{ id: "premise", value: "The census predicts unborn citizens.", source: "engine", updatedAtTurn: 0 }],
    },
    availableActions: [],
    turnHistory: [],
    metadata: {
      branchKey: "branch-1",
      turnCount: 8,
      status: "active",
      lastUpdatedAt: new Date().toISOString(),
      deterministic: false,
      seed: "seed-1",
    },
  };
}

function createRecentTurns(): StoryTurnRecord[] {
  return [
    createTurn(6, "Question the fence", "The fence names the duke's courier."),
    createTurn(7, "Read the salt ledger", "The ledger proves the magistrate altered the census."),
    createTurn(8, "Corner the messenger", "The messenger locks the court and calls for witnesses."),
  ];
}

function createTurn(turnNumber: number, actionText: string, sceneSummary: string): StoryTurnRecord {
  return {
    turnNumber,
    action: {
      source: "custom",
      originalInput: actionText,
      normalizedText: actionText,
      intent: "investigate",
      tags: [],
    },
    sceneTitle: `Turn ${turnNumber}`,
    sceneBody: sceneSummary,
    sceneSummary,
    choices: [],
    deltaLog: [],
    createdAt: new Date().toISOString(),
  };
}
