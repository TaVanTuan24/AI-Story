import type { NarrativeContextPack, StoryState } from "@/server/narrative/types";
import { ensureStoryStateDefaults } from "@/server/narrative/state-normalizer";

export function createContextPack(
  storyId: string,
  state: StoryState,
  normalizedAction?: NarrativeContextPack["normalizedAction"],
  options?: {
    repairContext?: NarrativeContextPack["repairContext"];
  },
): NarrativeContextPack {
  const normalizedState = ensureStoryStateDefaults(state);

  return {
    storyId,
    title: normalizedState.title,
    genre: normalizedState.genre,
    tone: normalizedState.tone,
    premise: normalizedState.premise,
    enginePreset: normalizedState.enginePreset,
    currentTurn: normalizedState.metadata.turnCount,
    deterministic: normalizedState.metadata.deterministic,
    currentSceneSummary: normalizedState.canonicalState.sceneSummary,
    worldRules: normalizedState.worldRules,
    coreState: normalizedState.coreState,
    dynamicStats: Object.entries(normalizedState.dynamicStats).map(([key, definition]) => ({
      key,
      ...definition,
    })),
    relationships: Object.values(normalizedState.relationships),
    flags: {
      world: normalizedState.canonicalState.worldFlags,
      quest: normalizedState.canonicalState.questFlags,
      story: normalizedState.flags,
    },
    stats: normalizedState.canonicalState.stats,
    inventory: normalizedState.inventory.map((item) => ({
      id: item.id,
      label: item.label,
      quantity: item.quantity,
    })),
    abilities: normalizedState.abilities,
    clues: normalizedState.canonicalState.clues.map((clue) => ({
      id: clue.id,
      label: clue.label,
    })),
    knownFacts: normalizedState.canonicalState.worldFacts.map((fact) => ({
      id: fact.id,
      value: fact.value,
    })),
    memory: {
      shortTerm: normalizedState.memory.shortTerm,
      rollingSummaries: normalizedState.memory.rollingSummaries,
      canon: {
        facts: normalizedState.memory.canon.facts.map((fact) => ({
          id: fact.id,
          category: fact.category,
          subject: fact.subject,
          value: fact.value,
          immutable: fact.immutable,
        })),
        irreversibleEvents: normalizedState.memory.canon.irreversibleEvents,
        importantFlags: normalizedState.memory.canon.importantFlags,
      },
    },
    normalizedAction,
    repairContext: options?.repairContext,
    continuity: {
      protectionRules: [
        "Canon facts take precedence over scene prose and summary language.",
        "Irreversible events cannot be undone unless explicitly established by canon.",
        "Important flags and engine-owned state must stay internally consistent.",
      ],
      contradictionPolicy: [
        "Prefer existing canon when a new summary proposes a conflicting fact.",
        "Treat summaries as compressions, not as authority to rewrite canon.",
        "Repair generated scenes instead of mutating canon to fit them.",
      ],
      consistencyCheckEnabled: true,
    },
    guidance: {
      shouldRespectContinuity: true,
      stateOwnedByEngine: true,
      outputExpectations: [
        "Write only scene prose and suggested options.",
        "Do not invent canonical inventory, stats, flags, clues, or relationship state changes.",
        "Treat short-term memory, rolling summaries, and canon memory as authoritative continuity inputs.",
        "Keep the options actionable and distinct.",
      ],
    },
    storyHistory: normalizedState.storyHistory,
    worldMemory: normalizedState.worldMemory,
    playerStats: normalizedState.playerStats,
    lastChoice: normalizedState.lastChoice,
    gameOver: normalizedState.gameOver,
    language: {
      storyOutputLanguage: normalizedState.metadata.storyOutputLanguage ?? "en",
      instruction:
        normalizedState.metadata.storyOutputLanguage === "vi"
          ? "Write all player-facing generated story text entirely in Vietnamese. Do not mix languages. Keep internal JSON keys unchanged."
          : "Write all player-facing generated story text entirely in English. Do not mix languages. Keep internal JSON keys unchanged.",
    },
  };
}
