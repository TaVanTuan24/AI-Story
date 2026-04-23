export type StorySessionListItemDto = {
  id: string;
  title: string;
  premise: string;
  genre: string;
  tone: string;
  enginePreset: string;
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
    choices: Array<{
      id: string;
      label: string;
      intent: string;
      tags?: string[];
    }>;
  };
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
    }>;
  };
  summary: {
    short: string;
    medium: string;
    canon: string;
  };
};
