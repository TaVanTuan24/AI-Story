import { randomUUID } from "node:crypto";

import { ContradictoryStateUpdateError, InvalidActionError } from "@/server/narrative/errors";
import { createContextPack } from "@/server/narrative/context-pack";
import { getPresetConfig } from "@/server/narrative/presets";
import { createSeededRandom } from "@/server/narrative/random";
import type {
  CanonicalState,
  EngineActionBlueprint,
  InitializeStoryInput,
  InitialTurnBundle,
  InventoryItem,
  NarrativeEngineOptions,
  NormalizedPlayerAction,
  PlayerAction,
  PreparedTurn,
  ProcessedTurn,
  StateDelta,
  StateDeltaLogEntry,
  StoryChoice,
  StoryGenerationResult,
  StoryState,
  SummaryCandidate,
  WorldFact,
} from "@/server/narrative/types";
import { addFlag, removeFlag } from "@/server/narrative/utils/flags";
import { addInventoryItem, removeInventoryItem } from "@/server/narrative/utils/inventory";
import { updateRelationship } from "@/server/narrative/utils/relationships";
import { adjustStat, setStat } from "@/server/narrative/utils/stats";
import { toSlug } from "@/server/narrative/utils/slugs";

export class NarrativeEngine {
  constructor(private readonly options: NarrativeEngineOptions = {}) {}

  createInitialState(input: InitializeStoryInput): StoryState {
    const preset = input.enginePreset ?? "freeform";
    const presetConfig = getPresetConfig(preset);
    const seed = input.seed ?? randomUUID();
    const deterministic = input.deterministic ?? this.options.deterministic ?? false;

    const title = input.titleHint?.trim() || "Untitled Session";
    const scene: StoryState["currentScene"] = {
      sceneNumber: 0,
      title: "Session bootstrap",
      body: "The narrative opening has not been generated yet.",
      choices: [],
    };

    const state: StoryState = {
      title,
      genre: input.genre,
      premise: input.premise,
      tone: input.tone,
      enginePreset: preset,
      currentScene: scene,
      scenes: [scene],
      summary: input.premise,
      summaryCandidate: input.premise,
      worldRules: presetConfig.worldRules,
      memory: {
        shortTerm: [],
        rollingSummaries: [],
        canon: {
          facts: [
            {
              id: "premise",
              category: "world",
              subject: "session",
              value: input.premise,
              source: "engine",
              immutable: true,
              introducedAtTurn: 0,
              lastConfirmedTurn: 0,
            },
          ],
          irreversibleEvents: ["session-started"],
          importantFlags: ["session-started"],
          conflicts: [],
        },
        entities: ["protagonist"],
      },
      canonicalState: {
        sceneSummary: input.premise,
        worldFlags: ["session-started"],
        questFlags: [],
        inventory: [],
        stats: { ...presetConfig.defaultStats },
        relationships: [],
        clues: [],
        worldFacts: [
          {
            id: "premise",
            value: input.premise,
            source: "engine",
            updatedAtTurn: 0,
          },
        ],
      },
      availableActions: [],
      turnHistory: [],
      metadata: {
        branchKey: randomUUID(),
        turnCount: 0,
        status: "active",
        lastUpdatedAt: new Date().toISOString(),
        deterministic,
        seed,
      },
    };

    state.availableActions = this.compileActions(
      [
        { label: "Survey the situation before acting", intent: "observe", tags: ["careful"] },
        { label: "Approach the central source of tension", intent: "explore", tags: ["bold"] },
        { label: "Reach out to the first important person nearby", intent: "socialize", tags: ["social"] },
      ],
      state,
    );

    state.currentScene.choices = this.toSceneChoices(state.availableActions);
    return state;
  }

  createInitialContextPack(storyId: string, state: StoryState): InitialTurnBundle {
    return {
      state,
      contextPack: createContextPack(storyId, state),
    };
  }

  validateAction(state: StoryState, action: PlayerAction) {
    if (state.metadata.status !== "active") {
      throw new InvalidActionError("Story session is not active.");
    }

    if (action.type === "choice") {
      const exists = state.availableActions.some((choice) => choice.id === action.choiceId);
      if (!exists) {
        throw new InvalidActionError("Selected choice does not exist on the current scene.");
      }
    }

    if (action.type === "custom" && action.input.trim().length < 2) {
      throw new InvalidActionError("Custom action is too short.");
    }
  }

  normalizeAction(state: StoryState, action: PlayerAction): NormalizedPlayerAction {
    this.validateAction(state, action);
    const preset = getPresetConfig(state.enginePreset);

    if (action.type === "choice") {
      const blueprint = state.availableActions.find((entry) => entry.id === action.choiceId)!;
      const unmetRequirement = blueprint.requirements.find((requirement) => {
        switch (requirement.type) {
          case "flag-present":
            return !state.canonicalState.worldFlags.includes(requirement.flag);
          case "flag-absent":
            return state.canonicalState.worldFlags.includes(requirement.flag);
          case "item-present": {
            const item = state.canonicalState.inventory.find(
              (inventoryItem) => inventoryItem.id === requirement.itemId,
            );
            return !item || item.quantity < (requirement.quantity ?? 1);
          }
          case "stat-min":
            return state.canonicalState.stats[requirement.stat] < requirement.value;
        }
      });

      if (unmetRequirement) {
        throw new InvalidActionError("Selected choice is no longer allowed.");
      }

      return {
        source: "choice",
        originalInput: blueprint.label,
        normalizedText: blueprint.label.trim(),
        selectedChoiceId: blueprint.id,
        intent: blueprint.intent,
        tags: blueprint.tags,
      };
    }

    const normalizedText = action.input.replace(/\s+/g, " ").trim();
    const matched = preset.customActionMap.find((rule) => rule.match.test(normalizedText));

    return {
      source: "custom",
      originalInput: action.input,
      normalizedText,
      intent: matched?.intent ?? "improvise",
      tags: matched?.tags ?? ["custom"],
    };
  }

  prepareTurn(state: StoryState, action: PlayerAction): PreparedTurn {
    const normalizedAction = this.normalizeAction(state, action);
    const turnNumber = state.metadata.turnCount + 1;
    const deltas = this.deriveStateDeltas(state, normalizedAction, turnNumber);
    const { nextState, log } = this.applyDeltas(state.canonicalState, deltas, turnNumber, state.enginePreset);

    const projectedState: StoryState = {
      ...state,
      canonicalState: nextState,
      metadata: {
        ...state.metadata,
        turnCount: turnNumber,
      },
    };

    return {
      previousState: state,
      projectedState,
      normalizedAction,
      nextCanonicalState: nextState,
      deltaLog: log,
      contextPack: createContextPack(state.metadata.branchKey, projectedState, normalizedAction),
      turnNumber,
    };
  }

  finalizeTurn(prepared: PreparedTurn, generated: StoryGenerationResult): ProcessedTurn {
    const sceneChoices = generated.scene.choices.slice(0, 4);
    const previousState = prepared.previousState;

    const scene = {
      sceneNumber: prepared.turnNumber,
      title: generated.scene.title,
      body: generated.scene.body,
      rawActionInput:
        prepared.normalizedAction.source === "custom"
          ? prepared.normalizedAction.originalInput
          : undefined,
      choices: sceneChoices.map((choice, index) => ({
        id: `${toSlug(choice.label)}-${prepared.turnNumber}-${index + 1}`,
        label: choice.label,
        intent: choice.intent,
        tags: choice.tags ?? [],
      })),
    };

    const nextAvailableActions = this.compileActions(sceneChoices, {
      ...previousState,
      canonicalState: prepared.nextCanonicalState,
      currentScene: scene,
      metadata: {
        ...previousState.metadata,
        turnCount: prepared.turnNumber,
      },
    });

    const nextState: StoryState = {
      ...previousState,
      currentScene: scene,
      scenes: [...previousState.scenes, scene],
      summary: generated.summaryCandidate,
      summaryCandidate: generated.summaryCandidate,
      canonicalState: {
        ...prepared.nextCanonicalState,
        sceneSummary: generated.summaryCandidate,
      },
      availableActions: nextAvailableActions,
      turnHistory: [
        ...previousState.turnHistory,
        {
          turnNumber: prepared.turnNumber,
          action: prepared.normalizedAction,
          sceneTitle: scene.title,
          sceneBody: scene.body,
          sceneSummary: generated.summaryCandidate,
          choices: scene.choices,
          deltaLog: prepared.deltaLog,
          createdAt: new Date().toISOString(),
        },
      ],
      memory: {
        shortTerm: previousState.memory.shortTerm,
        rollingSummaries: previousState.memory.rollingSummaries,
        canon: previousState.memory.canon,
        entities: Array.from(
          new Set([
            ...previousState.memory.entities,
            ...prepared.nextCanonicalState.relationships.map((relationship) => relationship.label),
          ]),
        ),
      },
      metadata: {
        ...previousState.metadata,
        turnCount: prepared.turnNumber,
        lastUpdatedAt: new Date().toISOString(),
      },
    };

    nextState.currentScene.choices = this.toSceneChoices(nextAvailableActions);

    const summaryCandidate = this.buildSummaryCandidate(nextState, prepared.normalizedAction);

    return {
      state: {
        ...nextState,
        summaryCandidate: summaryCandidate.medium,
      },
      turnLog: nextState.turnHistory.at(-1)!,
      summaryCandidate,
      contextPack: createContextPack(previousState.metadata.branchKey, nextState),
      deltaLog: prepared.deltaLog,
    };
  }

  applyDeltas(
    canonicalState: CanonicalState,
    deltas: StateDelta[],
    turnNumber: number,
    preset: StoryState["enginePreset"],
  ) {
    this.assertNoContradictions(deltas, preset);

    let nextState = structuredClone(canonicalState);
    const log: StateDeltaLogEntry[] = [];

    for (const delta of deltas) {
      switch (delta.type) {
        case "world-flag": {
          const before = [...nextState.worldFlags];
          nextState.worldFlags =
            delta.operation === "add"
              ? addFlag(nextState.worldFlags, delta.key)
              : removeFlag(nextState.worldFlags, delta.key);
          log.push({
            path: `canonicalState.worldFlags.${delta.key}`,
            operation: delta.operation,
            before,
            after: [...nextState.worldFlags],
            reason: "Engine resolved a world flag change.",
          });
          break;
        }
        case "quest-flag": {
          const before = [...nextState.questFlags];
          nextState.questFlags =
            delta.operation === "add"
              ? addFlag(nextState.questFlags, delta.key)
              : removeFlag(nextState.questFlags, delta.key);
          log.push({
            path: `canonicalState.questFlags.${delta.key}`,
            operation: delta.operation,
            before,
            after: [...nextState.questFlags],
            reason: "Engine resolved a quest flag change.",
          });
          break;
        }
        case "inventory": {
          const before = structuredClone(nextState.inventory);
          nextState.inventory =
            delta.operation === "add"
              ? addInventoryItem(nextState.inventory, delta.item)
              : removeInventoryItem(nextState.inventory, delta.item);
          log.push({
            path: `canonicalState.inventory.${delta.item.id}`,
            operation: delta.operation,
            before,
            after: structuredClone(nextState.inventory),
            reason: "Engine resolved an inventory change.",
          });
          break;
        }
        case "stat": {
          const before = nextState.stats[delta.stat];
          nextState.stats =
            delta.operation === "set"
              ? setStat(nextState.stats, delta.stat, delta.value)
              : adjustStat(
                  nextState.stats,
                  delta.stat,
                  delta.operation === "increment" ? delta.value : -delta.value,
                );
          log.push({
            path: `canonicalState.stats.${delta.stat}`,
            operation: delta.operation,
            before,
            after: nextState.stats[delta.stat],
            reason: "Engine resolved a stat change.",
          });
          break;
        }
        case "relationship": {
          const before = structuredClone(nextState.relationships);
          nextState.relationships = updateRelationship(nextState.relationships, {
            characterId: delta.characterId,
            label: delta.label,
            delta:
              delta.operation === "set"
                ? undefined
                : delta.operation === "increment"
                  ? delta.value
                  : -delta.value,
            nextValue: delta.operation === "set" ? delta.value : undefined,
            flags: delta.flags,
          });
          log.push({
            path: `canonicalState.relationships.${delta.characterId}`,
            operation: delta.operation,
            before,
            after: structuredClone(nextState.relationships),
            reason: "Engine resolved a relationship change.",
          });
          break;
        }
        case "clue": {
          const before = structuredClone(nextState.clues);
          if (nextState.clues.some((clue) => clue.id === delta.clue.id)) {
            throw new ContradictoryStateUpdateError(
              `Clue "${delta.clue.id}" is already discovered.`,
            );
          }
          nextState.clues = [
            ...nextState.clues,
            { ...delta.clue, discoveredAtTurn: turnNumber },
          ];
          log.push({
            path: `canonicalState.clues.${delta.clue.id}`,
            operation: "add",
            before,
            after: structuredClone(nextState.clues),
            reason: "Engine recorded a newly discovered clue.",
          });
          break;
        }
        case "fact": {
          const before = structuredClone(nextState.worldFacts);
          const existing = nextState.worldFacts.find((fact) => fact.id === delta.fact.id);
          if (existing && existing.value !== delta.fact.value) {
            throw new ContradictoryStateUpdateError(
              `Fact "${delta.fact.id}" cannot change from "${existing.value}" to "${delta.fact.value}" without an explicit migration rule.`,
            );
          }
          nextState.worldFacts = upsertFact(nextState.worldFacts, delta.fact, turnNumber);
          log.push({
            path: `canonicalState.worldFacts.${delta.fact.id}`,
            operation: "set",
            before,
            after: structuredClone(nextState.worldFacts),
            reason: "Engine recorded a world fact.",
          });
          break;
        }
      }
    }

    return { nextState, log };
  }

  private deriveStateDeltas(
    state: StoryState,
    action: NormalizedPlayerAction,
    turnNumber: number,
  ): StateDelta[] {
    const random = createSeededRandom(`${state.metadata.seed}:${turnNumber}:${action.normalizedText}`);
    const deltas: StateDelta[] = [
      { type: "stat", operation: "increment", stat: "focus", value: 2 },
      { type: "stat", operation: "increment", stat: "danger", value: action.intent === "fight" ? 10 : 2 },
    ];

    switch (action.intent) {
      case "investigate":
      case "observe":
        deltas.push({
          type: "clue",
          operation: "add",
          clue: {
            id: `clue-${turnNumber}-${toSlug(action.normalizedText).slice(0, 24) || "signal"}`,
            label: `Lead from turn ${turnNumber}`,
            description: `The protagonist noticed a meaningful detail after: ${action.normalizedText}.`,
            tags: ["fresh", state.enginePreset],
          },
        });
        deltas.push({ type: "stat", operation: "increment", stat: "suspicion", value: 3 });
        break;
      case "fight":
        deltas.push({ type: "stat", operation: "decrement", stat: "health", value: 8 });
        deltas.push({ type: "stat", operation: "decrement", stat: "stamina", value: 10 });
        deltas.push({ type: "world-flag", operation: "add", key: "violence-used" });
        break;
      case "socialize":
      case "negotiate":
      case "reveal":
        deltas.push({
          type: "relationship",
          operation: "increment",
          characterId: "primary-counterpart",
          label: "Primary counterpart",
          value: action.intent === "reveal" ? 6 : 4,
          flags: action.intent === "reveal" ? ["vulnerable-exchange"] : [],
        });
        deltas.push({ type: "stat", operation: "increment", stat: "trust", value: 4 });
        break;
      case "deceive":
        deltas.push({
          type: "relationship",
          operation: "decrement",
          characterId: "primary-counterpart",
          label: "Primary counterpart",
          value: 5,
        });
        deltas.push({ type: "stat", operation: "increment", stat: "suspicion", value: 6 });
        break;
      case "rest":
        deltas.push({ type: "stat", operation: "increment", stat: "health", value: 6 });
        deltas.push({ type: "stat", operation: "increment", stat: "stamina", value: 8 });
        deltas.push({ type: "stat", operation: "decrement", stat: "stress", value: 5 });
        break;
      case "protect":
        deltas.push({ type: "world-flag", operation: "add", key: "ally-protected" });
        deltas.push({ type: "stat", operation: "increment", stat: "morale", value: 5 });
        break;
      case "escape":
        deltas.push({ type: "world-flag", operation: "add", key: "escaped-scene" });
        deltas.push({ type: "stat", operation: "decrement", stat: "danger", value: 4 });
        break;
      case "explore":
      case "improvise":
      default:
        if (random.float() > 0.5) {
          deltas.push({
            type: "inventory",
            operation: "add",
            item: createMinorItem(turnNumber, action.normalizedText),
          });
        }
        break;
    }

    if (state.enginePreset === "mystery" && ["investigate", "observe"].includes(action.intent)) {
      deltas.push({
        type: "quest-flag",
        operation: "add",
        key: "active-lead",
      });
    }

    if (state.enginePreset === "social-drama" && ["socialize", "reveal", "deceive"].includes(action.intent)) {
      deltas.push({
        type: "stat",
        operation: "increment",
        stat: "influence",
        value: action.intent === "deceive" ? 1 : 4,
      });
    }

    return deltas;
  }

  private compileActions(
    suggestions: Array<{ label: string; intent: StoryChoice["intent"]; tags?: string[] }>,
    state: StoryState,
  ): EngineActionBlueprint[] {
    return suggestions.slice(0, 4).map((choice, index) => ({
      id: `${toSlug(choice.label)}-${state.metadata.turnCount + 1}-${index + 1}`,
      label: choice.label,
      intent: choice.intent,
      tags: choice.tags ?? [],
      source: "choice",
      requirements: [],
      preview: `Intent: ${choice.intent}`,
    }));
  }

  private toSceneChoices(actions: EngineActionBlueprint[]): StoryChoice[] {
    return actions.map((action) => ({
      id: action.id,
      label: action.label,
      intent: action.intent,
      tags: action.tags,
    }));
  }

  private assertNoContradictions(deltas: StateDelta[], preset: StoryState["enginePreset"]) {
    const addedFlags = new Set<string>();
    const removedFlags = new Set<string>();

    for (const delta of deltas) {
      if (delta.type === "world-flag" || delta.type === "quest-flag") {
        const registry = delta.operation === "add" ? addedFlags : removedFlags;
        registry.add(delta.key);
      }
    }

    for (const flag of addedFlags) {
      if (removedFlags.has(flag)) {
        throw new ContradictoryStateUpdateError(
          `Flag "${flag}" cannot be added and removed in the same turn.`,
        );
      }
    }

    const contradictoryGroups = getPresetConfig(preset).contradictoryFlagGroups;
    for (const group of contradictoryGroups) {
      const present = group.filter((flag) => addedFlags.has(flag));
      if (present.length > 1) {
        throw new ContradictoryStateUpdateError(
          `Contradictory preset flags detected: ${present.join(", ")}.`,
        );
      }
    }
  }

  private buildSummaryCandidate(
    state: StoryState,
    normalizedAction: NormalizedPlayerAction,
  ): SummaryCandidate {
    const short = `${normalizedAction.intent} at turn ${state.metadata.turnCount} shifted the situation.`;
    const medium = `${state.currentScene.title}: ${state.currentScene.body.slice(0, 220)}${state.currentScene.body.length > 220 ? "..." : ""}`;
    const canon = [
      `Turn ${state.metadata.turnCount} action: ${normalizedAction.normalizedText}.`,
      `Scene summary: ${state.summary}.`,
      `Flags: ${state.canonicalState.worldFlags.join(", ") || "none"}.`,
      `Clues: ${state.canonicalState.clues.map((clue) => clue.label).join(", ") || "none"}.`,
    ].join(" ");

    return {
      short,
      medium,
      canon,
      canonUpdate: {
        facts: [
          {
            id: `turn-${state.metadata.turnCount}-scene`,
            category: "event",
            subject: state.currentScene.title,
            value: state.summary,
            immutable: true,
          },
        ],
        irreversibleEvents: [],
        importantFlags: state.canonicalState.worldFlags.slice(-3),
      },
    };
  }
}

function createMinorItem(turnNumber: number, actionText: string): InventoryItem {
  return {
    id: `item-${turnNumber}-${toSlug(actionText).slice(0, 18) || "keepsake"}`,
    label: `Turn ${turnNumber} keepsake`,
    quantity: 1,
    tags: ["story-item"],
    description: `A small item gained after "${actionText}".`,
  };
}

function upsertFact(facts: WorldFact[], fact: Omit<WorldFact, "updatedAtTurn">, turnNumber: number) {
  const existing = facts.find((entry) => entry.id === fact.id);

  if (!existing) {
    return [...facts, { ...fact, updatedAtTurn: turnNumber }];
  }

  return facts.map((entry) =>
    entry.id === fact.id ? { ...entry, ...fact, updatedAtTurn: turnNumber } : entry,
  );
}
