import { ZodError, type z } from "zod";

import type { AiTaskName } from "@/server/ai/types";

export class MalformedJsonError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MalformedJsonError";
  }
}

export type StructuredOutputRepairEvent = {
  path: string;
  reason:
    | "coerced_numeric_string"
    | "rounded_to_integer"
    | "clamped_minimum"
    | "clamped_maximum"
    | "mapped_enum_value";
  originalValue: unknown;
  repairedValue: unknown;
};

type StructuredOutputParseOptions = {
  task?: AiTaskName;
  onRepair?: (repair: StructuredOutputRepairEvent) => void;
};

export function parseStructuredOutput<T>(
  rawText: string,
  schema: z.ZodType<T>,
  options?: StructuredOutputParseOptions,
): T {
  const parsedJson = parseJsonWithRepair(rawText);
  const repairedJson = repairStructuredOutput(parsedJson, options);
  return schema.parse(repairedJson);
}

export function safeParseStructuredOutput<T>(
  rawText: string,
  schema: z.ZodType<T>,
  options?: StructuredOutputParseOptions,
): { success: true; data: T } | { success: false; error: Error } {
  try {
    return { success: true, data: parseStructuredOutput(rawText, schema, options) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error("Unknown parse error."),
    };
  }
}

function parseJsonWithRepair(rawText: string) {
  const trimmed = rawText.trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    const extracted = extractLikelyJson(trimmed);

    if (!extracted) {
      throw new MalformedJsonError("Model response did not contain valid JSON.");
    }

    try {
      return JSON.parse(extracted);
    } catch {
      throw new MalformedJsonError("Unable to repair malformed JSON response.");
    }
  }
}

function extractLikelyJson(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  const objectStart = text.indexOf("{");
  const objectEnd = text.lastIndexOf("}");
  if (objectStart >= 0 && objectEnd > objectStart) {
    return text.slice(objectStart, objectEnd + 1);
  }

  const arrayStart = text.indexOf("[");
  const arrayEnd = text.lastIndexOf("]");
  if (arrayStart >= 0 && arrayEnd > arrayStart) {
    return text.slice(arrayStart, arrayEnd + 1);
  }

  return null;
}

export function isValidationError(error: unknown) {
  return error instanceof ZodError;
}

function repairStructuredOutput(
  parsedJson: unknown,
  options?: StructuredOutputParseOptions,
) {
  switch (options?.task) {
    case "generateCharacters":
      return repairCharacterOutput(parsedJson, options);
    case "generateOpeningScene":
    case "generateNextScene":
      return repairSceneChoiceIntents(parsedJson, "scene.choices", options);
    case "generateChoices":
      return repairChoiceListIntents(parsedJson, "choices", options);
    case "interpretCustomAction":
      return repairSingleIntent(parsedJson, "intent", options);
    default:
      return parsedJson;
  }
}

function repairCharacterOutput(
  parsedJson: unknown,
  options?: StructuredOutputParseOptions,
) {
  if (!parsedJson || typeof parsedJson !== "object") {
    return parsedJson;
  }

  const record = parsedJson as { characters?: unknown };
  if (!Array.isArray(record.characters)) {
    return parsedJson;
  }

  let changed = false;
  const repairedCharacters = record.characters.map((character, index) => {
    if (!character || typeof character !== "object") {
      return character;
    }

    const typedCharacter = character as Record<string, unknown>;
    const scoreRepair = normalizeRelationshipScore(
      typedCharacter.initialRelationshipScore,
      `characters[${index}].initialRelationshipScore`,
    );

    if (!scoreRepair.changed) {
      return character;
    }

    changed = true;
    scoreRepair.repairs.forEach((repair) => options?.onRepair?.(repair));

    return {
      ...typedCharacter,
      initialRelationshipScore: scoreRepair.value,
    };
  });

  if (!changed) {
    return parsedJson;
  }

  return {
    ...(parsedJson as Record<string, unknown>),
    characters: repairedCharacters,
  };
}

function repairSceneChoiceIntents(
  parsedJson: unknown,
  basePath: "scene.choices",
  options?: StructuredOutputParseOptions,
) {
  if (!parsedJson || typeof parsedJson !== "object") {
    return parsedJson;
  }

  const record = parsedJson as { scene?: { choices?: unknown } };
  if (!record.scene || typeof record.scene !== "object") {
    return parsedJson;
  }

  const scene = record.scene as Record<string, unknown>;
  if (!Array.isArray(scene.choices)) {
    return parsedJson;
  }

  const repairedChoices = repairChoiceEntries(scene.choices, basePath, options);
  if (!repairedChoices.changed) {
    return parsedJson;
  }

  return {
    ...(parsedJson as Record<string, unknown>),
    scene: {
      ...scene,
      choices: repairedChoices.choices,
    },
  };
}

function repairChoiceListIntents(
  parsedJson: unknown,
  basePath: "choices",
  options?: StructuredOutputParseOptions,
) {
  if (!parsedJson || typeof parsedJson !== "object") {
    return parsedJson;
  }

  const record = parsedJson as { choices?: unknown };
  if (!Array.isArray(record.choices)) {
    return parsedJson;
  }

  const repairedChoices = repairChoiceEntries(record.choices, basePath, options);
  if (!repairedChoices.changed) {
    return parsedJson;
  }

  return {
    ...(parsedJson as Record<string, unknown>),
    choices: repairedChoices.choices,
  };
}

function repairSingleIntent(
  parsedJson: unknown,
  path: "intent",
  options?: StructuredOutputParseOptions,
) {
  if (!parsedJson || typeof parsedJson !== "object") {
    return parsedJson;
  }

  const record = parsedJson as Record<string, unknown>;
  const intentRepair = normalizeActionIntent(record.intent, path);
  if (!intentRepair.changed) {
    return parsedJson;
  }

  intentRepair.repairs.forEach((repair) => options?.onRepair?.(repair));

  return {
    ...record,
    intent: intentRepair.value,
  };
}

function repairChoiceEntries(
  choices: unknown[],
  basePath: string,
  options?: StructuredOutputParseOptions,
) {
  let changed = false;
  const repairedChoices = choices.map((choice, index) => {
    if (!choice || typeof choice !== "object") {
      return choice;
    }

    const typedChoice = choice as Record<string, unknown>;
    const intentRepair = normalizeActionIntent(
      typedChoice.intent,
      `${basePath}[${index}].intent`,
    );

    if (!intentRepair.changed) {
      return choice;
    }

    changed = true;
    intentRepair.repairs.forEach((repair) => options?.onRepair?.(repair));

    return {
      ...typedChoice,
      intent: intentRepair.value,
    };
  });

  return {
    changed,
    choices: repairedChoices,
  };
}

function normalizeRelationshipScore(value: unknown, path: string) {
  const repairs: StructuredOutputRepairEvent[] = [];
  const normalizedNumber = toFiniteNumber(value);

  if (normalizedNumber === null) {
    return {
      changed: false,
      value,
      repairs,
    };
  }

  let repairedValue = normalizedNumber;

  if (typeof value === "string") {
    repairs.push({
      path,
      reason: "coerced_numeric_string",
      originalValue: value,
      repairedValue,
    });
  }

  const roundedValue = Math.round(repairedValue);
  if (roundedValue !== repairedValue) {
    repairs.push({
      path,
      reason: "rounded_to_integer",
      originalValue: repairedValue,
      repairedValue: roundedValue,
    });
    repairedValue = roundedValue;
  }

  if (repairedValue < -100) {
    repairs.push({
      path,
      reason: "clamped_minimum",
      originalValue: repairedValue,
      repairedValue: -100,
    });
    repairedValue = -100;
  }

  if (repairedValue > 100) {
    repairs.push({
      path,
      reason: "clamped_maximum",
      originalValue: repairedValue,
      repairedValue: 100,
    });
    repairedValue = 100;
  }

  return {
    changed: repairs.length > 0,
    value: repairedValue,
    repairs,
  };
}

function toFiniteNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function normalizeActionIntent(value: unknown, path: string) {
  if (typeof value !== "string") {
    return {
      changed: false,
      value,
      repairs: [] as StructuredOutputRepairEvent[],
    };
  }

  const normalizedKey = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  const mappedIntent = ACTION_INTENT_REPAIRS[normalizedKey];

  if (!mappedIntent || mappedIntent === value) {
    return {
      changed: false,
      value,
      repairs: [] as StructuredOutputRepairEvent[],
    };
  }

  return {
    changed: true,
    value: mappedIntent,
    repairs: [
      {
        path,
        reason: "mapped_enum_value" as const,
        originalValue: value,
        repairedValue: mappedIntent,
      },
    ],
  };
}

const ACTION_INTENT_REPAIRS: Record<string, string> = {
  explore: "explore",
  move: "explore",
  travel: "explore",
  advance: "explore",
  proceed: "explore",
  approach: "explore",
  investigate: "investigate",
  inspect: "investigate",
  examine: "investigate",
  search: "investigate",
  probe: "investigate",
  socialize: "socialize",
  socialise: "socialize",
  talk: "socialize",
  speak: "socialize",
  ask: "socialize",
  confront: "socialize",
  fight: "fight",
  attack: "fight",
  strike: "fight",
  threaten: "fight",
  protect: "protect",
  defend: "protect",
  guard: "protect",
  shield: "protect",
  negotiate: "negotiate",
  bargain: "negotiate",
  persuade: "negotiate",
  convince: "negotiate",
  rest: "rest",
  recover: "rest",
  wait: "rest",
  hide: "rest",
  deceive: "deceive",
  bluff: "deceive",
  lie: "deceive",
  trick: "deceive",
  reveal: "reveal",
  confess: "reveal",
  expose: "reveal",
  admit: "reveal",
  escape: "escape",
  flee: "escape",
  run: "escape",
  withdraw: "escape",
  observe: "observe",
  watch: "observe",
  listen: "observe",
  study: "observe",
  improvise: "improvise",
  adapt: "improvise",
  invent: "improvise",
};
