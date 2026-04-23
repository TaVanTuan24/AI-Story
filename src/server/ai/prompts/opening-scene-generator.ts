import { JSON_SCHEMAS } from "@/server/ai/contracts/contracts";
import type {
  AiPromptDefinition,
  GenerateOpeningSceneInput,
  GenerateOpeningSceneOutput,
} from "@/server/ai/types";
import {
  buildAntiDriftInstructions,
  buildJsonOnlyInstructions,
  buildPromptHeader,
  buildSchemaDisciplineInstructions,
  PROMPT_VERSION,
} from "@/server/ai/prompts/shared";

export const openingSceneGeneratorPrompt: AiPromptDefinition<
  GenerateOpeningSceneInput,
  GenerateOpeningSceneOutput
> = {
  task: "generateOpeningScene",
  version: PROMPT_VERSION,
  purpose:
    "Write the first playable scene and a compact summary candidate that launches the session with immediate momentum.",
  inputVariables: ["contextPack"],
  system: [
    buildPromptHeader("opening-scene-generator", PROMPT_VERSION),
    "You are writing the opening scene for a production AI interactive fiction engine.",
    "The scene must be concise, compelling, and immediately interactive.",
    "Start in motion. Avoid exposition dumps, prologues, and long historical setup.",
    "The scene should reveal pressure, tone, and stakes through the moment itself.",
    "Choices must be materially distinct in tactic, emotional posture, or risk.",
    "Do not decide canonical inventory, clues, flags, stats, or relationships.",
    buildAntiDriftInstructions(),
    buildSchemaDisciplineInstructions(),
    buildJsonOnlyInstructions(),
  ].join(" "),
  user: (input) =>
    [
      "Generate the opening scene.",
      "Input:",
      JSON.stringify(input, null, 2),
      "Requirements:",
      "- The scene should be one compact dramatic unit.",
      "- Keep prose vivid but efficient.",
      "- End with 3 to 4 strong options.",
      "- Avoid generic options like waiting, thinking, or simply moving on.",
    ].join("\n"),
  fallback: (input) => ({
    scene: {
      title: `${input.contextPack.genre} opening`,
      body: `The story opens around ${input.contextPack.premise}. The world feels immediate, playable, and tense.`,
      choices: [
        { label: "Study the situation carefully", intent: "observe", tags: ["careful"] },
        { label: "Approach the center of the conflict", intent: "explore", tags: ["bold"] },
        { label: "Speak to the nearest important person", intent: "socialize", tags: ["social"] },
      ],
    },
    summaryCandidate: `The protagonist is drawn into ${input.contextPack.premise}.`,
  }),
  expectedOutputJsonSchema: JSON_SCHEMAS.generateOpeningScene.schema,
  notes: {
    tokenBudget:
      "Opening scenes should stay lean. Spend tokens on sharp scene framing and differentiated choices, not on backstory.",
    failureModes: [
      "Model may overexplain the world before play begins.",
      "Model may write four nearly identical choices.",
      "Model may shift tone away from the supplied session tone.",
    ],
  },
};
