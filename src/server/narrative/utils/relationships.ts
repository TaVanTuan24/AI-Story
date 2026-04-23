import type { RelationshipState } from "@/server/narrative/types";
import { clampStatValue } from "@/server/narrative/utils/stats";

function toLevel(score: number): RelationshipState["level"] {
  if (score <= 20) {
    return "hostile";
  }

  if (score <= 40) {
    return "wary";
  }

  if (score <= 60) {
    return "neutral";
  }

  if (score <= 80) {
    return "trusted";
  }

  return "bonded";
}

export function updateRelationship(
  relationships: RelationshipState[],
  input: {
    characterId: string;
    label: string;
    delta?: number;
    nextValue?: number;
    flags?: string[];
  },
) {
  const existing = relationships.find(
    (relationship) => relationship.characterId === input.characterId,
  );

  if (!existing) {
    const score = clampStatValue(input.nextValue ?? 50 + (input.delta ?? 0));
    return [
      ...relationships,
      {
        characterId: input.characterId,
        label: input.label,
        score,
        level: toLevel(score),
        flags: input.flags ?? [],
      },
    ];
  }

  const score = clampStatValue(
    input.nextValue ?? existing.score + (input.delta ?? 0),
  );

  return relationships.map((relationship) =>
    relationship.characterId === input.characterId
      ? {
          ...relationship,
          score,
          label: input.label,
          level: toLevel(score),
          flags: Array.from(new Set([...(relationship.flags ?? []), ...(input.flags ?? [])])),
        }
      : relationship,
  );
}
