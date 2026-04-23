import { Types } from "mongoose";

import { StoryAiOrchestrator } from "@/server/ai/ai-orchestrator";
import { assembleContextPack } from "@/server/memory/context-assembler";
import { getMemoryConfig } from "@/server/memory/config";
import type {
  CanonConflict,
  CanonFact,
  NarrativeContextPack,
  StoryState,
  StoryTurnRecord,
  SummaryCandidate,
} from "@/server/narrative/types";
import { StorySummaryRepository } from "@/server/persistence/repositories/story-summary-repository";
import { TurnLogRepository } from "@/server/persistence/repositories/turn-log-repository";

type MemoryCaptureResult = {
  state: StoryState;
  summaries: Array<Record<string, unknown>>;
};

export class MemoryService {
  constructor(
    private readonly summaryRepository = new StorySummaryRepository(),
    private readonly turnLogRepository = new TurnLogRepository(),
    private readonly aiOrchestrator = new StoryAiOrchestrator(),
  ) {}

  async buildContextPack(input: {
    sessionId?: string;
    state: StoryState;
    normalizedAction?: NarrativeContextPack["normalizedAction"];
    repairContext?: NarrativeContextPack["repairContext"];
  }) {
    const config = getMemoryConfig();
    const recentTurns = input.sessionId
      ? await this.loadRecentTurns(input.sessionId, input.state, config.shortTermTurns)
      : input.state.turnHistory.slice(-config.shortTermTurns);

    const rollingSummaries = input.sessionId
      ? await this.summaryRepository.listRollingBySessionId(
          input.sessionId,
          config.rollingSummariesMax,
        )
      : input.state.memory.rollingSummaries.map((summary) => ({
          turnNumber: summary.turnNumber,
          sourceTurnRange: {
            from: summary.fromTurn,
            to: summary.toTurn,
          },
          content: summary.content,
        }));

    const stateWithSummaryCache: StoryState = {
      ...input.state,
      memory: {
        ...input.state.memory,
        rollingSummaries: rollingSummaries
          .reverse()
          .map((summary) => ({
            turnNumber: Number(summary.turnNumber),
            fromTurn: Number(summary.sourceTurnRange?.from ?? summary.turnNumber),
            toTurn: Number(summary.sourceTurnRange?.to ?? summary.turnNumber),
            content: String(summary.content),
          })),
      },
    };

    return assembleContextPack({
      storyId: input.state.metadata.branchKey,
      state: stateWithSummaryCache,
      recentTurns,
      normalizedAction: input.normalizedAction,
      repairContext: input.repairContext,
      consistencyCheckEnabled: config.consistencyCheckEnabled,
      canonFactsMax: config.canonFactsMax,
      rollingSummariesMax: config.rollingSummariesMax,
    });
  }

  async captureTurnMemory(input: {
    sessionId: string;
    state: StoryState;
    turnLog: StoryTurnRecord;
    summaryCandidate: SummaryCandidate;
  }): Promise<MemoryCaptureResult> {
    const config = getMemoryConfig();
    const shortTerm = await this.loadRecentTurns(
      input.sessionId,
      input.state,
      config.shortTermTurns,
      input.turnLog,
    );

    const mergedCanon = mergeCanonMemory(
      input.state.memory.canon.facts,
      input.summaryCandidate.canonUpdate.facts,
      input.state.metadata.turnCount,
      input.state.memory.canon.conflicts,
    );

    let nextState: StoryState = {
      ...input.state,
      memory: {
        ...input.state.memory,
        shortTerm: shortTerm.map((turn) => ({
          turnNumber: turn.turnNumber,
          actionText: turn.action.normalizedText,
          sceneTitle: turn.sceneTitle,
          sceneSummary: turn.sceneSummary,
        })),
        canon: {
          facts: mergedCanon.facts,
          conflicts: mergedCanon.conflicts,
          irreversibleEvents: uniqueStrings([
            ...input.state.memory.canon.irreversibleEvents,
            ...input.summaryCandidate.canonUpdate.irreversibleEvents,
          ]),
          importantFlags: uniqueStrings([
            ...input.state.memory.canon.importantFlags,
            ...input.summaryCandidate.canonUpdate.importantFlags,
            ...input.state.canonicalState.worldFlags,
            ...input.state.canonicalState.questFlags,
          ]),
        },
      },
    };

    const summaries: Array<Record<string, unknown>> = [
      createSummaryRecord(input.sessionId, input.turnLog.turnNumber, "short", input.summaryCandidate.short),
      createSummaryRecord(input.sessionId, input.turnLog.turnNumber, "medium", input.summaryCandidate.medium),
      createSummaryRecord(input.sessionId, input.turnLog.turnNumber, "canon", input.summaryCandidate.canon, {
        isCanonical: true,
        payload: input.summaryCandidate.canonUpdate,
      }),
    ];

    if (shouldSummarize(input.turnLog.turnNumber, config.summaryInterval)) {
      const rollingTurns = await this.loadRollingSummaryTurns(
        input.sessionId,
        input.state,
        config.summaryInterval,
        input.turnLog,
      );
      const contextPack = assembleContextPack({
        storyId: input.state.metadata.branchKey,
        state: nextState,
        recentTurns: shortTerm,
        consistencyCheckEnabled: config.consistencyCheckEnabled,
        canonFactsMax: config.canonFactsMax,
        rollingSummariesMax: config.rollingSummariesMax,
      });

      const rollingSummary = await this.aiOrchestrator.summarizeTurns({
        contextPack,
        recentTurns: rollingTurns.map((turn) => ({
          turnNumber: turn.turnNumber,
          sceneTitle: turn.sceneTitle,
          sceneSummary: turn.sceneSummary,
          actionText: turn.action.normalizedText,
        })),
      });

      const fromTurn = rollingTurns[0]?.turnNumber ?? input.turnLog.turnNumber;
      const toTurn = rollingTurns.at(-1)?.turnNumber ?? input.turnLog.turnNumber;

      const mergedRollingCanon = mergeCanonMemory(
        nextState.memory.canon.facts,
        rollingSummary.canonUpdate.facts,
        input.turnLog.turnNumber,
        nextState.memory.canon.conflicts,
      );

      nextState = {
        ...nextState,
        memory: {
          ...nextState.memory,
          rollingSummaries: [
            ...nextState.memory.rollingSummaries,
            {
              turnNumber: input.turnLog.turnNumber,
              fromTurn,
              toTurn,
              content: rollingSummary.medium,
            },
          ].slice(-config.rollingSummariesMax),
          canon: {
            facts: mergedRollingCanon.facts,
            conflicts: mergedRollingCanon.conflicts,
            irreversibleEvents: uniqueStrings([
              ...nextState.memory.canon.irreversibleEvents,
              ...rollingSummary.canonUpdate.irreversibleEvents,
            ]),
            importantFlags: uniqueStrings([
              ...nextState.memory.canon.importantFlags,
              ...rollingSummary.canonUpdate.importantFlags,
            ]),
          },
        },
      };

      summaries.push(
        createSummaryRecord(input.sessionId, input.turnLog.turnNumber, "rolling", rollingSummary.medium, {
          sourceTurnRange: { from: fromTurn, to: toTurn },
          payload: rollingSummary.canonUpdate,
        }),
      );
    }

    return {
      state: nextState,
      summaries,
    };
  }

  private async loadRecentTurns(
    sessionId: string,
    state: StoryState,
    limit: number,
    currentTurn?: StoryTurnRecord,
  ): Promise<StoryTurnRecord[]> {
    const fromDatabase = await this.turnLogRepository.listRecentBySessionId(
      sessionId,
      Math.max(limit - (currentTurn ? 1 : 0), 0),
    );

    const mapped = fromDatabase.map((turn) => ({
      turnNumber: Number(turn.turnNumber),
      action: {
        source: String(turn.actionSource) as "choice" | "custom",
        originalInput: String(turn.rawActionInput ?? turn.chosenAction),
        normalizedText: String(turn.chosenAction),
        selectedChoiceId: turn.selectedChoiceId ? String(turn.selectedChoiceId) : undefined,
        intent: inferIntentFromState(state, String(turn.selectedChoiceId)),
        tags: [],
      },
      sceneTitle: String(turn.sceneTitle ?? ""),
      sceneBody: String(turn.sceneText),
      sceneSummary: String(turn.sceneSummary),
      choices: (turn.presentedChoices ?? []).map((choice: Record<string, unknown>) => ({
        id: String(choice.id),
        label: String(choice.label),
        intent: inferIntentFromLabel(String(choice.intent)),
        tags: [],
      })),
      deltaLog: [],
      createdAt: String(turn.createdAt ?? new Date().toISOString()),
    }));

    return [...mapped, ...(currentTurn ? [currentTurn] : [])].slice(-limit);
  }

  private async loadRollingSummaryTurns(
    sessionId: string,
    state: StoryState,
    limit: number,
    currentTurn: StoryTurnRecord,
  ) {
    return this.loadRecentTurns(sessionId, state, limit, currentTurn);
  }
}

function shouldSummarize(turnNumber: number, interval: number) {
  return turnNumber > 0 && turnNumber % interval === 0;
}

function mergeCanonMemory(
  existingFacts: CanonFact[],
  incomingFacts: Array<{
    id: string;
    category: CanonFact["category"];
    subject: string;
    value: string;
    immutable: boolean;
  }>,
  turnNumber: number,
  priorConflicts: CanonConflict[],
) {
  const nextFacts = [...existingFacts];
  const conflicts = [...priorConflicts];

  for (const incoming of incomingFacts) {
    const existing = nextFacts.find((fact) => fact.id === incoming.id);

    if (!existing) {
      nextFacts.push({
        ...incoming,
        source: "summary",
        introducedAtTurn: turnNumber,
        lastConfirmedTurn: turnNumber,
      });
      continue;
    }

    if (existing.value === incoming.value) {
      existing.lastConfirmedTurn = turnNumber;
      continue;
    }

    conflicts.push({
      factId: incoming.id,
      existingValue: existing.value,
      proposedValue: incoming.value,
      detectedAtTurn: turnNumber,
      reason: existing.immutable
        ? "Existing immutable canon fact rejected conflicting summary update."
        : "Conflicting summary fact rejected to avoid blind canon overwrite.",
    });
  }

  return { facts: nextFacts, conflicts: conflicts.slice(-20) };
}

function createSummaryRecord(
  sessionId: string,
  turnNumber: number,
  kind: "short" | "medium" | "canon" | "rolling",
  content: string,
  overrides?: Record<string, unknown>,
) {
  return {
    storySessionId: new Types.ObjectId(sessionId),
    turnNumber,
    kind,
    content,
    isCanonical: kind === "canon",
    ...overrides,
  };
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function inferIntentFromState(state: StoryState, selectedChoiceId?: string) {
  if (!selectedChoiceId) {
    return "improvise";
  }

  return (
    state.availableActions.find((action) => action.id === selectedChoiceId)?.intent ?? "improvise"
  );
}

function inferIntentFromLabel(intent: string) {
  return intent as StoryTurnRecord["choices"][number]["intent"];
}
