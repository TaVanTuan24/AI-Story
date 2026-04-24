import { describe, expect, it } from "vitest";

import { NarrativeEngine } from "@/server/narrative/engine";
import { ensureStoryStateDefaults } from "@/server/narrative/state-normalizer";

describe("ensureStoryStateDefaults", () => {
  it("maps legacy playerStats into dynamicStats for older sessions", () => {
    const engine = new NarrativeEngine({ deterministic: true });
    const initialState = engine.createInitialState({
      titleHint: "Legacy Session",
      genre: "survival",
      premise: "A courier crosses a frozen valley while something hunts the campfire trail.",
      tone: "grim",
      enginePreset: "rpg-lite",
      deterministic: true,
      seed: "legacy-session-migration",
      storyOutputLanguage: "vi",
    });

    const normalized = ensureStoryStateDefaults({
      ...initialState,
      coreState: undefined,
      dynamicStats: {},
      relationships: undefined,
      abilities: undefined,
      worldMemory: undefined,
      storyHistory: [],
      playerStats: {
        health: 72,
        stamina: 41,
        morale: 38,
        trust: 27,
        suspicion: 64,
        danger: 33,
        stress: 58,
        focus: 49,
      },
      canonicalState: {
        ...initialState.canonicalState,
        stats: {},
      },
    } as unknown as typeof initialState);

    expect(normalized.coreState.genre).toBe("survival");
    expect(normalized.coreState.gameRules.length).toBeGreaterThan(0);
    expect(normalized.dynamicStats.health).toMatchObject({
      value: 72,
      label: "Sức khỏe",
    });
    expect(normalized.dynamicStats.stamina).toMatchObject({
      value: 41,
      label: "Thể lực",
    });
    expect(normalized.dynamicStats.stress).toMatchObject({
      value: 58,
      label: "Căng thẳng",
    });
    expect(normalized.playerStats).toMatchObject({
      health: 72,
      stamina: 41,
      stress: 58,
    });
    expect(normalized.metadata.storyOutputLanguage).toBe("vi");
    expect(normalized.gameOver).toBe(false);
  });
});
