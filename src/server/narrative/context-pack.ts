import type { NarrativeContextPack, StoryState } from "@/server/narrative/types";

export function createContextPack(
  storyId: string,
  state: StoryState,
  normalizedAction?: NarrativeContextPack["normalizedAction"],
  options?: {
    repairContext?: NarrativeContextPack["repairContext"];
  },
): NarrativeContextPack {
  return {
    storyId,
    title: state.title,
    genre: state.genre,
    tone: state.tone,
    premise: state.premise,
    enginePreset: state.enginePreset,
    currentTurn: state.metadata.turnCount,
    deterministic: state.metadata.deterministic,
    currentSceneSummary: state.canonicalState.sceneSummary,
    worldRules: state.worldRules,
    flags: {
      world: state.canonicalState.worldFlags,
      quest: state.canonicalState.questFlags,
    },
    stats: state.canonicalState.stats,
    inventory: state.canonicalState.inventory.map((item) => ({
      id: item.id,
      label: item.label,
      quantity: item.quantity,
    })),
    relationships: state.canonicalState.relationships.map((relationship) => ({
      characterId: relationship.characterId,
      label: relationship.label,
      score: relationship.score,
      level: relationship.level,
    })),
    clues: state.canonicalState.clues.map((clue) => ({
      id: clue.id,
      label: clue.label,
    })),
    knownFacts: state.canonicalState.worldFacts.map((fact) => ({
      id: fact.id,
      value: fact.value,
    })),
    memory: {
      shortTerm: state.memory.shortTerm,
      rollingSummaries: state.memory.rollingSummaries,
      canon: {
        facts: state.memory.canon.facts.map((fact) => ({
          id: fact.id,
          category: fact.category,
          subject: fact.subject,
          value: fact.value,
          immutable: fact.immutable,
        })),
        irreversibleEvents: state.memory.canon.irreversibleEvents,
        importantFlags: state.memory.canon.importantFlags,
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
  };
}
