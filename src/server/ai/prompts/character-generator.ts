import { JSON_SCHEMAS } from "@/server/ai/contracts/contracts";
import type {
  AiPromptDefinition,
  GenerateCharactersInput,
  GenerateCharactersOutput,
} from "@/server/ai/types";
import {
  buildAntiDriftInstructions,
  buildJsonOnlyInstructions,
  buildPromptHeader,
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
      "- Include the player character if appropriate.",
      "- Ensure each character has a distinct story function.",
      "- Avoid clone personalities and generic archetype labels.",
      "- Initial relationship scores should be plausible and moderate unless the premise strongly implies otherwise.",
    ].join("\n"),
  fallback: () => ({
    characters: [
      {
        id: "protagonist",
        name: "Protagonist",
        role: "Player character",
        personality: ["adaptable", "driven"],
        initialRelationshipScore: 50,
        statusFlags: ["player"],
        secretsKnown: [],
        isPlayer: true,
      },
      {
        id: "counterpart",
        name: "Primary Counterpart",
        role: "Key supporting figure",
        personality: ["guarded", "observant"],
        initialRelationshipScore: 45,
        statusFlags: [],
        secretsKnown: [],
        isPlayer: false,
      },
    ],
  }),
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
