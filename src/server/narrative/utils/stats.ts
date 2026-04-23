import type { StatKey, StatState } from "@/server/narrative/types";
import { ContradictoryStateUpdateError } from "@/server/narrative/errors";

export function clampStatValue(value: number) {
  if (value < 0 || value > 100) {
    throw new ContradictoryStateUpdateError(
      `Stat value ${value} is outside the canonical range 0..100.`,
    );
  }

  return value;
}

export function setStat(stats: StatState, stat: StatKey, value: number) {
  return {
    ...stats,
    [stat]: clampStatValue(value),
  };
}

export function adjustStat(stats: StatState, stat: StatKey, delta: number) {
  return setStat(stats, stat, (stats[stat] ?? 0) + delta);
}
