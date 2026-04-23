import { ContradictoryStateUpdateError } from "@/server/narrative/errors";

export function addFlag(flags: string[], flag: string) {
  return flags.includes(flag) ? flags : [...flags, flag];
}

export function removeFlag(flags: string[], flag: string) {
  if (!flags.includes(flag)) {
    throw new ContradictoryStateUpdateError(`Cannot remove missing flag "${flag}".`);
  }

  return flags.filter((entry) => entry !== flag);
}
