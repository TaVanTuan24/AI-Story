import type {
  CanonFact,
  NarrativeContextPack,
  StoryState,
  StoryTurnRecord,
} from "@/server/narrative/types";
import { ensureStoryStateDefaults } from "@/server/narrative/state-normalizer";

export type AssembleContextPackInput = {
  storyId: string;
  state: StoryState;
  recentTurns: StoryTurnRecord[];
  normalizedAction?: NarrativeContextPack["normalizedAction"];
  repairContext?: NarrativeContextPack["repairContext"];
  consistencyCheckEnabled: boolean;
  canonFactsMax: number;
  rollingSummariesMax: number;
  storyHistoryMax?: number;
  worldMemoryMax?: number;
  knownFactsMax?: number;
  relationshipsMax?: number;
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
  storyHistoryMax,
  worldMemoryMax,
  knownFactsMax,
  relationshipsMax,
}: AssembleContextPackInput): NarrativeContextPack {
  const normalizedState = ensureStoryStateDefaults(state);
  const canonFacts = prioritizeCanonFacts(normalizedState.memory.canon.facts, canonFactsMax);
  const relationships = Object.values(normalizedState.relationships).slice(
    -Math.max(
      1,
      relationshipsMax ?? Object.keys(normalizedState.relationships).length ?? 1,
    ),
  );
  const knownFacts = normalizedState.canonicalState.worldFacts
    .slice(-(knownFactsMax ?? normalizedState.canonicalState.worldFacts.length))
    .map((fact) => ({
      id: fact.id,
      value: fact.value,
    }));
  const rollingSummaries = normalizedState.memory.rollingSummaries
    .slice(-rollingSummariesMax)
    .map((entry) => ({
      turnNumber: entry.turnNumber,
      fromTurn: entry.fromTurn,
      toTurn: entry.toTurn,
      content: entry.content,
    }));

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
    relationships,
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
    knownFacts,
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
        irreversibleEvents: normalizedState.memory.canon.irreversibleEvents,
        importantFlags: normalizedState.memory.canon.importantFlags,
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
    storyHistory: normalizedState.storyHistory.slice(
      -(storyHistoryMax ?? normalizedState.storyHistory.length),
    ),
    worldMemory: normalizedState.worldMemory.slice(
      -(worldMemoryMax ?? normalizedState.worldMemory.length),
    ),
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
