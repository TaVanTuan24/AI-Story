import { JSON_SCHEMAS } from "@/server/ai/contracts/contracts";
import type {
  AiPromptDefinition,
  GenerateCharactersInput,
  GenerateCharactersOutput,
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

export const characterGeneratorPrompt: AiPromptDefinition<
  GenerateCharactersInput,
  GenerateCharactersOutput
> = {
  task: "generateCharacters",
  version: PROMPT_VERSION,
  purpose:
    "Generate a compact cast of major characters with distinctive roles, motives, and personalities for the session.",
  inputVariables: ["genre", "tone", "premise", "enginePreset", "world"],
  system: [
    buildPromptHeader("character-generator", PROMPT_VERSION),
    "You are generating major characters for a production AI interactive fiction engine.",
    "Each character must be narratively useful, distinct, and able to sustain continuity across many turns.",
    "Do not create a bloated cast. Prefer a small group with sharp contrasts.",
    "Personality traits must imply behavior, not just describe aesthetics.",
    "Secrets should create future dramatic leverage, not random twists.",
    "These character records are suggestions for the orchestration layer, not canonical relationship truth.",
    buildAntiDriftInstructions(),
    buildSchemaDisciplineInstructions(),
    buildJsonOnlyInstructions(),
  ].join(" "),
  user: (input) =>
    [
      "Generate the major characters for this session.",
      "Input:",
      JSON.stringify(input, null, 2),
      "Requirements:",
      "- Return valid JSON only. Do not add markdown, commentary, or any extra wrapper text.",
      "- Return 2 to 6 major characters unless the premise clearly needs fewer or more, and never exceed 8.",
      "- Include the player character if appropriate.",
      "- Ensure each character has a distinct story function.",
      "- Avoid clone personalities and generic archetype labels.",
      "- initialRelationshipScore must be an integer from -100 to 100.",
      "- Negative scores mean distrust, rivalry, hostility, or fear. Positive scores mean warmth, trust, loyalty, or admiration.",
      "- Keep relationship scores plausible and moderate unless the premise strongly implies an extreme.",
      "- Valid relationship score examples: -65, -20, 0, 35, 80.",
      "- Do not output values outside the required schema.",
    ].join("\n"),
  fallback: (input) => {
    const language = resolvePromptLanguage(input);
    return {
      characters: [
        {
          id: "protagonist",
          name: localizedText(language, {
            en: "Protagonist",
            vi: "Nhan vat chinh",
          }),
          role: localizedText(language, {
            en: "Player character",
            vi: "Nhan vat cua nguoi choi",
          }),
          personality: [
            localizedText(language, { en: "adaptable", vi: "linh hoat" }),
            localizedText(language, { en: "driven", vi: "quyet tam" }),
          ],
          initialRelationshipScore: 50,
          statusFlags: ["player"],
          secretsKnown: [],
          isPlayer: true,
        },
        {
          id: "counterpart",
          name: localizedText(language, {
            en: "Primary Counterpart",
            vi: "Nhan vat doi ung chinh",
          }),
          role: localizedText(language, {
            en: "Key supporting figure",
            vi: "Nhan vat phu then chot",
          }),
          personality: [
            localizedText(language, { en: "guarded", vi: "kin dao" }),
            localizedText(language, { en: "observant", vi: "tinh mat" }),
          ],
          initialRelationshipScore: 45,
          statusFlags: [],
          secretsKnown: [],
          isPlayer: false,
        },
      ],
    };
  },
  expectedOutputJsonSchema: JSON_SCHEMAS.generateCharacters.schema,
  notes: {
    tokenBudget:
      "Aim for a compact cast. Too many characters waste context and weaken continuity.",
    failureModes: [
      "Model may produce too many minor characters.",
      "Model may repeat traits across the cast.",
      "Model may create melodramatic secrets with no grounding in the premise.",
    ],
  },
};
