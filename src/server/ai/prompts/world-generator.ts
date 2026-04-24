import { JSON_SCHEMAS } from "@/server/ai/contracts/contracts";
import type {
  AiPromptDefinition,
  GenerateWorldInput,
  GenerateWorldOutput,
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
  fallback: (input) => {
    const language = resolvePromptLanguage(input);
    return {
      setting: localizedText(language, {
        en: `${input.genre} setting built around ${input.premise}`,
        vi: `Boi canh ${input.genre} duoc xay quanh: ${input.premise}`,
      }),
      worldRules: [
        localizedText(language, {
          en: "Continuity must preserve established facts.",
          vi: "Tinh lien tuc phai giu nguyen cac su that da duoc thiet lap.",
        }),
        localizedText(language, {
          en: "Actions should create meaningful consequences.",
          vi: "Hanh dong can tao ra hau qua co y nghia.",
        }),
        localizedText(language, {
          en: "Information should unfold through pressure and discovery.",
          vi: "Thong tin nen duoc mo ra qua suc ep va su kham pha.",
        }),
      ],
      playerRole: localizedText(language, {
        en: "Protagonist",
        vi: "Nhan vat chinh",
      }),
      conflict: input.premise,
      startingLocation: localizedText(language, {
        en: "The opening threshold",
        vi: "Nguong cua mo dau",
      }),
      seedHint: `${input.genre}-${input.enginePreset}`,
      contentWarnings: [],
    };
  },
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
