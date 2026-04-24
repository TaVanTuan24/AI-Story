import { JSON_SCHEMAS } from "@/server/ai/contracts/contracts";
import type {
  AiPromptDefinition,
  InterpretCustomActionInput,
  InterpretCustomActionOutput,
} from "@/server/ai/types";
import {
  buildAntiDriftInstructions,
  buildJsonOnlyInstructions,
  localizedText,
  buildPromptHeader,
  resolvePromptLanguage,
  buildSchemaDisciplineInstructions,
  PROMPT_VERSION,
} from "@/server/ai/prompts/shared";

export const customActionInterpreterPrompt: AiPromptDefinition<
  InterpretCustomActionInput,
  InterpretCustomActionOutput
> = {
  task: "interpretCustomAction",
  version: PROMPT_VERSION,
  purpose:
    "Interpret a player's free-text action into a normalized action intent without mutating canonical state.",
  inputVariables: ["contextPack", "rawAction"],
  system: [
    buildPromptHeader("custom-action-interpreter", PROMPT_VERSION),
    "You are classifying a player's custom action for an interactive fiction engine.",
    "Your job is to normalize the intent, not to narrate an outcome.",
    "Do not invent consequences or claim that the action succeeds.",
    "Be faithful to the player's wording unless a small normalization improves clarity.",
    buildAntiDriftInstructions(),
    buildSchemaDisciplineInstructions(),
    buildJsonOnlyInstructions(),
  ].join(" "),
  user: (input) =>
    [
      "Interpret the player's custom action.",
      "Input:",
      JSON.stringify(input, null, 2),
      "Requirements:",
      "- Preserve the player's meaning.",
      "- Choose the best intent label from the available intent vocabulary.",
      "- Explain the classification briefly in rationale.",
      "- Do not narrate results.",
    ].join("\n"),
  fallback: (input) => ({
    normalizedText: input.rawAction.trim(),
    intent: "improvise",
    tags: ["custom"],
    rationale: localizedText(resolvePromptLanguage(input), {
      en: "Fallback interpretation due to malformed model output.",
      vi: "Dien giai du phong do phan hoi cua mo hinh khong hop le.",
    }),
  }),
  expectedOutputJsonSchema: JSON_SCHEMAS.interpretCustomAction.schema,
  notes: {
    tokenBudget:
      "Keep this prompt short and classification-oriented. It should be inexpensive enough to run often.",
    failureModes: [
      "Model may narrate an outcome instead of classifying the action.",
      "Model may over-normalize and change player intent.",
      "Model may return tags with no practical meaning.",
    ],
  },
};
