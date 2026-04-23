import type {
  CanonFact,
  NarrativeContextPack,
  StoryState,
  StoryTurnRecord,
} from "@/server/narrative/types";

export type AssembleContextPackInput = {
  storyId: string;
  state: StoryState;
  recentTurns: StoryTurnRecord[];
  normalizedAction?: NarrativeContextPack["normalizedAction"];
  repairContext?: NarrativeContextPack["repairContext"];
  consistencyCheckEnabled: boolean;
  canonFactsMax: number;
  rollingSummariesMax: number;
};

export function assembleContextPack({
  storyId,
  state,
  recentTurns,
  normalizedAction,
  repairContext,
  consistencyCheckEnabled,
  canonFactsMax,
  rollingSummariesMax,
}: AssembleContextPackInput): NarrativeContextPack {
  const canonFacts = prioritizeCanonFacts(state.memory.canon.facts, canonFactsMax);
  const rollingSummaries = state.memory.rollingSummaries
    .slice(-rollingSummariesMax)
    .map((entry) => ({
      turnNumber: entry.turnNumber,
      fromTurn: entry.fromTurn,
      toTurn: entry.toTurn,
      content: entry.content,
    }));

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
      shortTerm: recentTurns.map((turn) => ({
        turnNumber: turn.turnNumber,
        actionText: turn.action.normalizedText,
        sceneTitle: turn.sceneTitle,
        sceneSummary: turn.sceneSummary,
      })),
      rollingSummaries,
      canon: {
        facts: canonFacts.map((fact) => ({
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
    repairContext,
    continuity: {
      protectionRules: [
        "Use canon facts as the source of truth when prose memory is incomplete or ambiguous.",
        "Do not contradict irreversible events, character facts, or important flags.",
        "Engine-owned canonical state cannot be changed by scene narration.",
      ],
      contradictionPolicy: [
        "If a rolling summary conflicts with canon, prefer canon.",
        "If recent turns are ambiguous, resolve ambiguity in favor of established canon and world rules.",
        "When repairContext is present, fix the listed issues without adding replacement contradictions.",
      ],
      consistencyCheckEnabled,
    },
    guidance: {
      shouldRespectContinuity: true,
      stateOwnedByEngine: true,
      outputExpectations: [
        "Write only scene prose and suggested options.",
        "Do not invent canonical inventory, stats, flags, clues, or relationship state changes.",
        "Prefer compact continuity-aware output over verbose recap.",
        "Keep the options actionable and distinct.",
      ],
    },
  };
}

function prioritizeCanonFacts(facts: CanonFact[], maxFacts: number) {
  return facts
    .slice()
    .sort((left, right) => {
      if (left.immutable !== right.immutable) {
        return left.immutable ? -1 : 1;
      }

      return right.lastConfirmedTurn - left.lastConfirmedTurn;
    })
    .slice(0, maxFacts);
}
