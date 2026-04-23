import type {
  ActionIntent,
  EnginePreset,
  StatKey,
  StatState,
} from "@/server/narrative/types";

export type EnginePresetConfig = {
  name: EnginePreset;
  defaultStats: StatState;
  trackedStats: StatKey[];
  worldRules: string[];
  contradictoryFlagGroups: string[][];
  customActionMap: Array<{
    match: RegExp;
    intent: ActionIntent;
    tags: string[];
  }>;
};

const baseWorldRules = [
  "Narrative continuity must preserve established facts unless the engine records a change.",
  "Inventory, flags, stats, clues, and relationships are canonical only when resolved by the engine.",
  "Each turn should present 3 to 4 materially distinct next actions.",
];

export const ENGINE_PRESETS: Record<EnginePreset, EnginePresetConfig> = {
  freeform: {
    name: "freeform",
    defaultStats: {
      health: 60,
      stamina: 55,
      morale: 60,
      focus: 55,
      suspicion: 15,
      influence: 40,
      trust: 45,
      stress: 20,
      danger: 20,
    },
    trackedStats: ["morale", "focus", "danger", "trust"],
    worldRules: baseWorldRules,
    contradictoryFlagGroups: [["safe", "captured"], ["welcome", "exiled"]],
    customActionMap: [
      { match: /\blook|inspect|search|study|observe\b/i, intent: "observe", tags: ["careful"] },
      { match: /\bask|talk|persuade|convince|comfort\b/i, intent: "socialize", tags: ["social"] },
      { match: /\bfight|attack|strike|shoot\b/i, intent: "fight", tags: ["violent"] },
    ],
  },
  "rpg-lite": {
    name: "rpg-lite",
    defaultStats: {
      health: 80,
      stamina: 75,
      morale: 55,
      focus: 45,
      suspicion: 10,
      influence: 30,
      trust: 35,
      stress: 20,
      danger: 25,
    },
    trackedStats: ["health", "stamina", "morale", "danger"],
    worldRules: [...baseWorldRules, "Physical risk must be reflected in health and stamina."],
    contradictoryFlagGroups: [["armed", "disarmed"], ["blessed", "cursed"]],
    customActionMap: [
      { match: /\battack|fight|slash|shoot|charge\b/i, intent: "fight", tags: ["combat"] },
      { match: /\brest|heal|recover|bandage\b/i, intent: "rest", tags: ["recovery"] },
      { match: /\bprotect|guard|shield\b/i, intent: "protect", tags: ["defensive"] },
    ],
  },
  mystery: {
    name: "mystery",
    defaultStats: {
      health: 65,
      stamina: 50,
      morale: 55,
      focus: 75,
      suspicion: 25,
      influence: 35,
      trust: 40,
      stress: 25,
      danger: 15,
    },
    trackedStats: ["focus", "suspicion", "stress", "trust"],
    worldRules: [...baseWorldRules, "Discoveries must be recorded as clues or facts before they are canonical."],
    contradictoryFlagGroups: [["anonymous", "exposed"], ["case-cold", "case-solved"]],
    customActionMap: [
      { match: /\binvestigate|inspect|dust|analyze|trace\b/i, intent: "investigate", tags: ["clue-hunt"] },
      { match: /\bquestion|interrogate|ask\b/i, intent: "socialize", tags: ["interview"] },
      { match: /\bhide|sneak|shadow|tail\b/i, intent: "observe", tags: ["surveillance"] },
    ],
  },
  "social-drama": {
    name: "social-drama",
    defaultStats: {
      health: 55,
      stamina: 45,
      morale: 65,
      focus: 50,
      suspicion: 20,
      influence: 70,
      trust: 55,
      stress: 30,
      danger: 10,
    },
    trackedStats: ["influence", "trust", "stress", "morale"],
    worldRules: [...baseWorldRules, "Relationship shifts should matter more than physical damage."],
    contradictoryFlagGroups: [["included", "ostracized"], ["engaged", "estranged"]],
    customActionMap: [
      { match: /\bconfess|admit|reveal\b/i, intent: "reveal", tags: ["vulnerable"] },
      { match: /\bflirt|comfort|apologize|talk\b/i, intent: "socialize", tags: ["intimate"] },
      { match: /\blie|deflect|manipulate\b/i, intent: "deceive", tags: ["social-risk"] },
    ],
  },
};

export function getPresetConfig(preset: EnginePreset) {
  return ENGINE_PRESETS[preset];
}
