import { JSON_SCHEMAS } from "@/server/ai/contracts/contracts";
import type {
  AiPromptDefinition,
  GenerateWorldInput,
  GenerateWorldOutput,
} from "@/server/ai/types";
import {
  buildAntiDriftInstructions,
  buildJsonOnlyInstructions,
  buildPromptHeader,
  buildSchemaDisciplineInstructions,
  PROMPT_VERSION,
} from "@/server/ai/prompts/shared";

export const worldGeneratorPrompt: AiPromptDefinition<
  GenerateWorldInput,
  GenerateWorldOutput
> = {
  task: "generateWorld",
  version: PROMPT_VERSION,
  purpose:
    "Create a durable world setup for a new interactive fiction session without deciding canonical turn-by-turn state.",
  inputVariables: ["genre", "tone", "premise", "enginePreset"],
  system: [
    buildPromptHeader("world-generator", PROMPT_VERSION),
    "You are designing the world frame for a production AI interactive fiction engine.",
    "Your job is to create a distinct, playable setting and dramatic conflict that can sustain many turns.",
    "Be genre-agnostic: the same rules apply whether the story is fantasy, romance, noir, sci-fi, school life, politics, or survival.",
    "Write clear, specific, high-signal output. Avoid vague fantasy-novel filler and generic 'a mysterious world' phrasing.",
    "World rules should create constraints, not empty atmosphere.",
    buildAntiDriftInstructions(),
    buildSchemaDisciplineInstructions(),
    buildJsonOnlyInstructions(),
  ].join(" "),
  user: (input) =>
    [
      "Generate the world setup for this new session.",
      "Input:",
      JSON.stringify(input, null, 2),
      "Requirements:",
      "- The setting must be distinctive and immediately playable.",
      "- The conflict must create pressure from the start.",
      "- The player role must fit the premise and genre.",
      "- World rules should guide future scenes and continuity checks.",
      "- Keep content warnings minimal and only include likely concerns.",
    ].join("\n"),
  fallback: (input) => ({
    setting: `${input.genre} setting built around ${input.premise}`,
    worldRules: [
      "Continuity must preserve established facts.",
      "Actions should create meaningful consequences.",
      "Information should unfold through pressure and discovery.",
    ],
    playerRole: "Protagonist",
    conflict: input.premise,
    startingLocation: "The opening threshold",
    seedHint: `${input.genre}-${input.enginePreset}`,
    contentWarnings: [],
  }),
  expectedOutputJsonSchema: JSON_SCHEMAS.generateWorld.schema,
  notes: {
    tokenBudget:
      "Keep the prompt compact and target a medium output budget. The result should establish the session in one pass without overbuilding lore.",
    failureModes: [
      "Model may return overly broad setting text with no playable conflict.",
      "Model may produce repetitive 'mysterious world' language.",
      "Model may invent too many rules or warnings.",
    ],
  },
};
