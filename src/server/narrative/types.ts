import type { StoryGenre } from "@/server/persistence/types/data-models";

export type { StoryGenre } from "@/server/persistence/types/data-models";

export type EnginePreset =
  | "freeform"
  | "rpg-lite"
  | "mystery"
  | "social-drama";

export type SessionStatus = "active" | "completed" | "paused";
export type ActionSource = "choice" | "custom";
export type DeltaOperation = "add" | "remove" | "set" | "increment" | "decrement";

export type StatKey =
  | "health"
  | "stamina"
  | "morale"
  | "focus"
  | "suspicion"
  | "influence"
  | "trust"
  | "stress"
  | "danger";

export type ActionIntent =
  | "explore"
  | "investigate"
  | "socialize"
  | "fight"
  | "protect"
  | "negotiate"
  | "rest"
  | "deceive"
  | "reveal"
  | "escape"
  | "observe"
  | "improvise";

export type InventoryItem = {
  id: string;
  label: string;
  quantity: number;
  tags: string[];
  description?: string;
};

export type ClueRecord = {
  id: string;
  label: string;
  description: string;
  discoveredAtTurn: number;
  tags: string[];
};

export type RelationshipState = {
  characterId: string;
  label: string;
  score: number;
  level: "hostile" | "wary" | "neutral" | "trusted" | "bonded";
  flags: string[];
};

export type WorldFact = {
  id: string;
  value: string;
  source: "engine" | "player" | "ai-summary";
  updatedAtTurn: number;
};

export type ActionRequirement =
  | { type: "flag-present"; flag: string }
  | { type: "flag-absent"; flag: string }
  | { type: "item-present"; itemId: string; quantity?: number }
  | { type: "stat-min"; stat: StatKey; value: number };

export type EngineActionBlueprint = {
  id: string;
  label: string;
  intent: ActionIntent;
  tags: string[];
  source: ActionSource;
  requirements: ActionRequirement[];
  preview?: string;
};

export type NormalizedPlayerAction = {
  source: ActionSource;
  originalInput: string;
  normalizedText: string;
  selectedChoiceId?: string;
  intent: ActionIntent;
  tags: string[];
};

export type PlayerAction =
  | { type: "choice"; choiceId: string }
  | { type: "custom"; input: string };

export type StoryChoice = {
  id: string;
  label: string;
  intent: ActionIntent;
  tags: string[];
};

export type StoryScene = {
  sceneNumber: number;
  title: string;
  body: string;
  choices: StoryChoice[];
  rawActionInput?: string;
};

export type StoryMemory = {
  shortTerm: Array<{
    turnNumber: number;
    actionText: string;
    sceneTitle: string;
    sceneSummary: string;
  }>;
  rollingSummaries: Array<{
    turnNumber: number;
    fromTurn: number;
    toTurn: number;
    content: string;
  }>;
  canon: {
    facts: CanonFact[];
    irreversibleEvents: string[];
    importantFlags: string[];
    conflicts: CanonConflict[];
  };
  entities: string[];
};

export type CanonFactCategory = "world" | "character" | "event" | "flag";

export type CanonFact = {
  id: string;
  category: CanonFactCategory;
  subject: string;
  value: string;
  source: "engine" | "summary";
  immutable: boolean;
  introducedAtTurn: number;
  lastConfirmedTurn: number;
};

export type CanonConflict = {
  factId: string;
  existingValue: string;
  proposedValue: string;
  detectedAtTurn: number;
  reason: string;
};

export type StatState = Record<StatKey, number>;

export type CanonicalState = {
  sceneSummary: string;
  worldFlags: string[];
  questFlags: string[];
  inventory: InventoryItem[];
  stats: StatState;
  relationships: RelationshipState[];
  clues: ClueRecord[];
  worldFacts: WorldFact[];
};

export type StoryTurnRecord = {
  turnNumber: number;
  action: NormalizedPlayerAction;
  sceneTitle: string;
  sceneBody: string;
  sceneSummary: string;
  choices: StoryChoice[];
  deltaLog: StateDeltaLogEntry[];
  createdAt: string;
};

export type StoryState = {
  title: string;
  genre: StoryGenre;
  premise: string;
  tone: string;
  enginePreset: EnginePreset;
  currentScene: StoryScene;
  scenes: StoryScene[];
  summary: string;
  summaryCandidate: string;
  worldRules: string[];
  memory: StoryMemory;
  canonicalState: CanonicalState;
  availableActions: EngineActionBlueprint[];
  turnHistory: StoryTurnRecord[];
  metadata: {
    branchKey: string;
    turnCount: number;
    status: SessionStatus;
    lastUpdatedAt: string;
    deterministic: boolean;
    seed: string;
  };
};

export type StateDelta =
  | { type: "world-flag"; operation: "add" | "remove"; key: string }
  | { type: "quest-flag"; operation: "add" | "remove"; key: string }
  | { type: "inventory"; operation: "add" | "remove"; item: InventoryItem }
  | { type: "stat"; operation: "increment" | "decrement" | "set"; stat: StatKey; value: number }
  | {
      type: "relationship";
      operation: "increment" | "decrement" | "set";
      characterId: string;
      label: string;
      value: number;
      flags?: string[];
    }
  | { type: "clue"; operation: "add"; clue: Omit<ClueRecord, "discoveredAtTurn"> }
  | { type: "fact"; operation: "set"; fact: Omit<WorldFact, "updatedAtTurn"> };

export type StateDeltaLogEntry = {
  path: string;
  operation: DeltaOperation;
  before: unknown;
  after: unknown;
  reason: string;
};

export type SummaryCandidate = {
  short: string;
  medium: string;
  canon: string;
  canonUpdate: {
    facts: Array<{
      id: string;
      category: CanonFactCategory;
      subject: string;
      value: string;
      immutable: boolean;
    }>;
    irreversibleEvents: string[];
    importantFlags: string[];
  };
};

export type NarrativeContextPack = {
  storyId: string;
  title: string;
  genre: StoryGenre;
  tone: string;
  premise: string;
  enginePreset: EnginePreset;
  currentTurn: number;
  deterministic: boolean;
  currentSceneSummary: string;
  worldRules: string[];
  flags: {
    world: string[];
    quest: string[];
  };
  stats: Partial<StatState>;
  inventory: Array<Pick<InventoryItem, "id" | "label" | "quantity">>;
  relationships: Array<Pick<RelationshipState, "characterId" | "label" | "score" | "level">>;
  clues: Array<Pick<ClueRecord, "id" | "label">>;
  knownFacts: Array<Pick<WorldFact, "id" | "value">>;
  memory: {
    shortTerm: StoryMemory["shortTerm"];
    rollingSummaries: StoryMemory["rollingSummaries"];
    canon: {
      facts: Array<Pick<CanonFact, "id" | "category" | "subject" | "value" | "immutable">>;
      irreversibleEvents: string[];
      importantFlags: string[];
    };
  };
  normalizedAction?: NormalizedPlayerAction;
  repairContext?: {
    attempt: number;
    issues: string[];
    recommendations: string[];
  };
  continuity: {
    protectionRules: string[];
    contradictionPolicy: string[];
    consistencyCheckEnabled: boolean;
  };
  guidance: {
    shouldRespectContinuity: true;
    stateOwnedByEngine: true;
    outputExpectations: string[];
  };
};

export type StoryGenerationRequest = {
  storyId: string;
  titleHint?: string;
  genre: StoryGenre;
  premise: string;
  tone: string;
  enginePreset: EnginePreset;
  mode: "opening" | "continuation";
  contextPack: NarrativeContextPack;
};

export type StoryGenerationResult = {
  scene: {
    title: string;
    body: string;
    choices: Array<{
      label: string;
      intent: ActionIntent;
      tags?: string[];
    }>;
  };
  summaryCandidate: string;
};

export type NarrativeEngineOptions = {
  deterministic?: boolean;
  seed?: string;
};

export type InitializeStoryInput = {
  titleHint?: string;
  genre: StoryGenre;
  premise: string;
  tone: string;
  enginePreset?: EnginePreset;
  seed?: string;
  deterministic?: boolean;
};

export type InitialTurnBundle = {
  state: StoryState;
  contextPack: NarrativeContextPack;
};

export type PreparedTurn = {
  previousState: StoryState;
  projectedState: StoryState;
  normalizedAction: NormalizedPlayerAction;
  nextCanonicalState: CanonicalState;
  deltaLog: StateDeltaLogEntry[];
  contextPack: NarrativeContextPack;
  turnNumber: number;
};

export type ProcessedTurn = {
  state: StoryState;
  turnLog: StoryTurnRecord;
  summaryCandidate: SummaryCandidate;
  contextPack: NarrativeContextPack;
  deltaLog: StateDeltaLogEntry[];
  memorySummaries?: Array<Record<string, unknown>>;
  consistency?: {
    repaired: boolean;
    issues: string[];
    recommendations: string[];
    repairAttempts: number;
    usedFallbackRepair: boolean;
  };
};
