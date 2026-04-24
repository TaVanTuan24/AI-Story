import { describe, expect, it } from "vitest";

import { ContradictoryStateUpdateError, InvalidActionError } from "@/server/narrative/errors";
import { NarrativeEngine } from "@/server/narrative/engine";

describe("NarrativeEngine", () => {
  it("creates deterministic initial state for a preset", () => {
    const engine = new NarrativeEngine({ deterministic: true, seed: "spec-seed" });
    const state = engine.createInitialState({
      titleHint: "Casefile Zero",
      genre: "mystery",
      premise: "A detective wakes with someone else's alibi in her pocket.",
      tone: "noir",
      enginePreset: "mystery",
      deterministic: true,
      seed: "spec-seed",
    });

    expect(state.enginePreset).toBe("mystery");
    expect(state.metadata.deterministic).toBe(true);
    expect(state.dynamicStats.focus?.value).toBeGreaterThan(
      state.dynamicStats.suspicion?.value ?? 0,
    );
    expect(state.availableActions).toHaveLength(3);
  });

  it("normalizes custom actions before processing", () => {
    const engine = new NarrativeEngine({ deterministic: true });
    const state = engine.createInitialState({
      genre: "fantasy",
      premise: "A courier carries a sealed prophecy through a city under curfew.",
      tone: "urgent",
      enginePreset: "freeform",
    });

    const normalized = engine.normalizeAction(state, {
      type: "custom",
      input: "   Inspect the   shattered sigil on the door   ",
    });

    expect(normalized.normalizedText).toBe("Inspect the shattered sigil on the door");
    expect(normalized.intent).toBe("observe");
  });

  it("creates clue progress in mystery preset from investigation", () => {
    const engine = new NarrativeEngine({ deterministic: true });
    const state = engine.createInitialState({
      genre: "mystery",
      premise: "A missing violinist leaves coded messages in train schedules.",
      tone: "tense",
      enginePreset: "mystery",
    });

    const prepared = engine.prepareTurn(state, {
      type: "custom",
      input: "Investigate the ash on the window latch",
    });

    expect(prepared.nextCanonicalState.clues).toHaveLength(1);
    expect(prepared.nextCanonicalState.questFlags).toContain("active-lead");
    expect(prepared.deltaLog.some((entry) => entry.path.includes("canonicalState.clues"))).toBe(
      true,
    );
  });

  it("rejects invalid choice ids", () => {
    const engine = new NarrativeEngine();
    const state = engine.createInitialState({
      genre: "romance",
      premise: "Two rivals are trapped overnight in a museum during a storm.",
      tone: "intimate",
      enginePreset: "social-drama",
    });

    expect(() =>
      engine.prepareTurn(state, {
        type: "choice",
        choiceId: "missing-choice",
      }),
    ).toThrow(InvalidActionError);
  });

  it("rejects contradictory flag updates in the same turn", () => {
    const engine = new NarrativeEngine();
    const state = engine.createInitialState({
      genre: "sci-fi",
      premise: "A salvage crew boards a ship broadcasting tomorrow's distress call.",
      tone: "claustrophobic",
      enginePreset: "freeform",
    });

    expect(() =>
      engine.applyDeltas(
        state.canonicalState,
        [
          { type: "world-flag", operation: "add", key: "safe" },
          { type: "world-flag", operation: "remove", key: "safe" },
        ],
        1,
        state.enginePreset,
      ),
    ).toThrow(ContradictoryStateUpdateError);
  });

  it("rejects contradictory fact rewrites", () => {
    const engine = new NarrativeEngine();
    const state = engine.createInitialState({
      genre: "politics",
      premise: "A junior minister finds the election already decided in a sealed memo.",
      tone: "cold",
      enginePreset: "mystery",
    });

    const withFact = engine.applyDeltas(
      state.canonicalState,
      [
        {
          type: "fact",
          operation: "set",
          fact: {
            id: "culprit",
            value: "the mayor",
            source: "engine",
          },
        },
      ],
      1,
      state.enginePreset,
    );

    expect(() =>
      engine.applyDeltas(
        withFact.nextState,
        [
          {
            type: "fact",
            operation: "set",
            fact: {
              id: "culprit",
              value: "the minister",
              source: "engine",
            },
          },
        ],
        2,
        state.enginePreset,
      ),
    ).toThrow(ContradictoryStateUpdateError);
  });

  it("rejects impossible inventory removals", () => {
    const engine = new NarrativeEngine();
    const state = engine.createInitialState({
      genre: "survival",
      premise: "A stranded pilot must cross a frozen valley before sunrise.",
      tone: "grim",
      enginePreset: "rpg-lite",
    });

    expect(() =>
      engine.applyDeltas(
        state.canonicalState,
        [
          {
            type: "inventory",
            operation: "remove",
            item: {
              id: "rope",
              label: "Rope",
              quantity: 1,
              tags: ["gear"],
            },
          },
        ],
        1,
        state.enginePreset,
      ),
    ).toThrow(ContradictoryStateUpdateError);
  });
});
