import { JSON_SCHEMAS } from "@/server/ai/contracts/contracts";
import type {
  AiPromptDefinition,
  GenerateNextSceneInput,
  GenerateNextSceneOutput,
} from "@/server/ai/types";
import {
  buildAntiDriftInstructions,
  buildJsonOnlyInstructions,
  buildPromptHeader,
  buildSchemaDisciplineInstructions,
  PROMPT_VERSION,
} from "@/server/ai/prompts/shared";

export const nextSceneGeneratorPrompt: AiPromptDefinition<
  GenerateNextSceneInput,
  GenerateNextSceneOutput
> = {
  task: "generateNextScene",
  version: PROMPT_VERSION,
  purpose:
    "Write the next scene after the engine has already resolved the player's action into canonical context.",
  inputVariables: ["contextPack", "latestScene"],
  system: [
    buildPromptHeader("next-scene-generator", PROMPT_VERSION),
    "You are writing the next scene for a production AI interactive fiction engine.",
    "The narrative engine already owns canonical state. You must only write prose and suggested next options.",
    "Treat the context pack as the authoritative continuity source.",
    "Do not retroactively alter setting logic, world rules, or character motivations.",
    "Escalate through consequence, revelation, pressure, or intimacy instead of random shock twists.",
    "Keep the scene concise and dramatically useful.",
    buildAntiDriftInstructions(),
    buildSchemaDisciplineInstructions(),
    buildJsonOnlyInstructions(),
  ].join(" "),
  user: (input) =>
    [
      "Generate the next scene.",
      "Input:",
      JSON.stringify(input, null, 2),
      "Requirements:",
      "- Reflect the latest normalized player action.",
      "- Continue the established tone.",
      "- Keep scenes compact and playable.",
      "- End with 3 to 4 meaningfully distinct next options.",
      "- If repairContext is present, treat it as mandatory correction guidance and fix those issues without changing canon.",
    ].join("\n"),
  fallback: (input) => ({
    scene: {
      title: `Turn ${input.contextPack.currentTurn + 1}: Consequences`,
      body: `The action "${input.contextPack.normalizedAction?.normalizedText ?? "continue"}" changes the pressure in the scene while keeping continuity intact.`,
      choices: [
        { label: "Investigate the opening that just appeared", intent: "investigate", tags: ["careful"] },
        { label: "Protect your position before it collapses", intent: "protect", tags: ["urgent"] },
        { label: "Reveal something that changes the balance", intent: "reveal", tags: ["dramatic"] },
      ],
    },
    summaryCandidate: "After the last action, the situation escalates and new options emerge.",
  }),
  expectedOutputJsonSchema: JSON_SCHEMAS.generateNextScene.schema,
  notes: {
    tokenBudget:
      "This is the hottest prompt in the system. Keep inputs compact and output scene length disciplined.",
    failureModes: [
      "Model may contradict prior world facts or character behavior.",
      "Model may produce repetitive scene rhythm across turns.",
      "Model may offer bland or overlapping choices.",
    ],
  },
};
