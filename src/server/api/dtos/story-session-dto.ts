export type StorySessionListItemDto = {
  id: string;
  title: string;
  premise: string;
  genre: string;
  tone: string;
  enginePreset: string;
  storyOutputLanguage: "en" | "vi";
  difficulty?: string;
  lengthPreference?: string;
  status: string;
  currentTurn: number;
  currentSceneSummary: string;
  lastPlayedAt: string;
  latestSceneTitle?: string;
};

export type CharacterStateDto = {
  id: string;
  name: string;
  role: string;
  relationshipScore: number;
  relationshipBucket: string;
  statusFlags: string[];
  secretsKnown: string[];
  isPlayer: boolean;
};

export type StorySessionDetailDto = StorySessionListItemDto & {
  seedPrompt?: string;
  world?: {
    setting: string;
    worldRules: string[];
    playerRole: string;
    conflict: string;
    startingLocation: string;
    seed: string;
    contentWarnings: string[];
  };
  currentScene?: {
    title: string;
    body: string;
    risk?: "low" | "medium" | "high";
    outcome?: "success" | "partial_success" | "failure";
    roll?: number;
    gameOver?: boolean;
    choices: Array<{
      id: string;
      label: string;
      intent: string;
      tags?: string[];
      risk?: "low" | "medium" | "high";
    }>;
  };
  playerStats?: {
    health: number;
    stamina: number;
    morale: number;
    trust: number;
    suspicion: number;
    danger: number;
    stress: number;
    focus: number;
  };
  inventory?: Array<{ id: string; label: string; quantity: number; tags: string[] }>;
  coreState?: {
    genre: string;
    tone: string;
    currentArc: string;
    turn: number;
    gameOver: boolean;
    endingType: "good" | "neutral" | "bad" | null;
    gameRules: string[];
  };
  dynamicStats?: Array<{
    key: string;
    value: number;
    label: string;
    description: string;
    min: number;
    max: number;
  }>;
  relationships?: Array<{
    characterId: string;
    name: string;
    role: string;
    affinity: number;
    trust: number;
    conflict: number;
    notes: string;
    statusFlags: string[];
  }>;
  abilities?: Array<{
    id: string;
    label: string;
    description: string;
    tags: string[];
    charges?: number;
  }>;
  flags?: string[];
  worldMemory?: Array<{
    id: string;
    text: string;
    kind: string;
    turnNumber: number;
    pinned?: boolean;
  }>;
  lastChoice?: string | null;
  gameOver?: boolean;
  storyHistory?: string[];
  canonicalState?: {
    sceneSummary: string;
    worldFlags: string[];
    questFlags: string[];
    inventory: Array<{ id: string; label: string; quantity: number; tags: string[] }>;
    stats: Record<string, number>;
    clues: Array<{ id: string; label: string; description: string }>;
  };
  characters: CharacterStateDto[];
};

export type StoryTurnResponseDto = {
  session: StorySessionDetailDto;
  turn: {
    turnNumber: number;
    sceneTitle: string;
    sceneBody: string;
    sceneSummary: string;
    choices: Array<{
      id: string;
      label: string;
      intent: string;
      tags?: string[];
      risk?: "low" | "medium" | "high";
    }>;
  };
  summary: {
    short: string;
    medium: string;
    canon: string;
  };
};
