import type {
  CharacterStateDto,
  StorySessionDetailDto,
  StorySessionListItemDto,
  StoryTurnResponseDto,
} from "@/server/api/dtos/story-session-dto";
import type { ProcessedTurn, StoryState } from "@/server/narrative/types";

export function presentStorySessionListItem(
  session: Record<string, unknown>,
): StorySessionListItemDto {
  return {
    id: String(session._id),
    title: String(session.title),
    premise: String(session.premise),
    genre: String(session.genre),
    tone: String(session.tone),
    enginePreset: String(session.enginePreset),
    difficulty:
      session.metadata && typeof session.metadata === "object" && "difficulty" in session.metadata
        ? String((session.metadata as Record<string, unknown>).difficulty)
        : undefined,
    lengthPreference:
      session.metadata &&
      typeof session.metadata === "object" &&
      "lengthPreference" in session.metadata
        ? String((session.metadata as Record<string, unknown>).lengthPreference)
        : undefined,
    status: String(session.status),
    currentTurn: Number(session.currentTurn),
    currentSceneSummary: String(session.currentSceneSummary),
    lastPlayedAt: toIso(session.lastPlayedAt)!,
    latestSceneTitle: session.latestSceneTitle ? String(session.latestSceneTitle) : undefined,
  };
}

export function presentStorySessionDetail(input: {
  session: Record<string, unknown>;
  world?: Record<string, unknown> | null;
  storyState?: (StoryState & { id?: string }) | null;
  characters?: Array<Record<string, unknown>>;
}): StorySessionDetailDto {
  const base = presentStorySessionListItem(input.session);

  return {
    ...base,
    seedPrompt:
      input.session.metadata &&
      typeof input.session.metadata === "object" &&
      "seedPrompt" in input.session.metadata
        ? String((input.session.metadata as Record<string, unknown>).seedPrompt)
        : undefined,
    world: input.world
      ? {
          setting: String(input.world.setting),
          worldRules: (input.world.worldRules as string[]) ?? [],
          playerRole: String(input.world.playerRole),
          conflict: String(input.world.conflict),
          startingLocation: String(input.world.startingLocation),
          seed: String(input.world.seed),
          contentWarnings: (input.world.contentWarnings as string[]) ?? [],
        }
      : undefined,
    currentScene: input.storyState
      ? {
          title: input.storyState.currentScene.title,
          body: input.storyState.currentScene.body,
          choices: input.storyState.currentScene.choices,
        }
      : undefined,
    canonicalState: input.storyState
      ? {
          sceneSummary: input.storyState.canonicalState.sceneSummary,
          worldFlags: input.storyState.canonicalState.worldFlags,
          questFlags: input.storyState.canonicalState.questFlags,
          inventory: input.storyState.canonicalState.inventory,
          stats: input.storyState.canonicalState.stats,
          clues: input.storyState.canonicalState.clues.map((clue) => ({
            id: clue.id,
            label: clue.label,
            description: clue.description,
          })),
        }
      : undefined,
    characters: (input.characters ?? []).map(presentCharacter),
  };
}

export function presentStoryTurnResponse(input: {
  session: StorySessionDetailDto;
  processedTurn: ProcessedTurn;
}): StoryTurnResponseDto {
  return {
    session: input.session,
    turn: {
      turnNumber: input.processedTurn.turnLog.turnNumber,
      sceneTitle: input.processedTurn.turnLog.sceneTitle,
      sceneBody: input.processedTurn.turnLog.sceneBody,
      sceneSummary: input.processedTurn.turnLog.sceneSummary,
      choices: input.processedTurn.turnLog.choices,
    },
    summary: input.processedTurn.summaryCandidate,
  };
}

function presentCharacter(character: Record<string, unknown>): CharacterStateDto {
  return {
    id: String(character.externalId ?? character._id),
    name: String(character.name),
    role: String(character.role),
    relationshipScore: Number(character.relationshipScore),
    relationshipBucket: String(character.relationshipBucket),
    statusFlags: (character.statusFlags as string[]) ?? [],
    secretsKnown: (character.secretsKnown as string[]) ?? [],
    isPlayer: Boolean(character.isPlayer),
  };
}

function toIso(value: unknown) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return value ? String(value) : undefined;
}
