import { JSON_SCHEMAS } from "@/server/ai/contracts/contracts";
import type {
  AiPromptDefinition,
  CheckConsistencyInput,
  CheckConsistencyOutput,
} from "@/server/ai/types";
import {
  buildAntiDriftInstructions,
  buildJsonOnlyInstructions,
  buildPromptHeader,
  buildSchemaDisciplineInstructions,
  PROMPT_VERSION,
} from "@/server/ai/prompts/shared";

export const consistencyCheckerPrompt: AiPromptDefinition<
  CheckConsistencyInput,
  CheckConsistencyOutput
> = {
  task: "checkConsistency",
  version: PROMPT_VERSION,
  purpose:
    "Check whether a candidate scene appears to drift from established continuity, tone, rules, or character behavior.",
  inputVariables: ["contextPack", "candidateScene"],
  system: [
    buildPromptHeader("consistency-checker", PROMPT_VERSION),
    "You are a continuity checker for an interactive fiction engine.",
    "You do not rewrite the scene. You only judge consistency and report issues.",
    "Be strict about world rules, known facts, tone drift, and character behavior drift.",
    "Do not invent new canon to justify inconsistencies.",
    buildAntiDriftInstructions(),
    buildSchemaDisciplineInstructions(),
    buildJsonOnlyInstructions(),
  ].join(" "),
  user: (input) =>
    [
      "Check this candidate scene for continuity issues.",
      "Input:",
      JSON.stringify(input, null, 2),
      "Requirements:",
      "- Flag only meaningful issues.",
      "- Distinguish clear violations from mild concerns.",
      "- Keep recommendations actionable.",
    ].join("\n"),
  fallback: () => ({
    valid: true,
    issues: [],
    recommendations: [],
  }),
  expectedOutputJsonSchema: JSON_SCHEMAS.checkConsistency.schema,
  notes: {
    tokenBudget:
      "Use this selectively. It is useful for high-stakes turns or debugging but does not need to run every turn.",
    failureModes: [
      "Model may over-flag harmless stylistic differences.",
      "Model may miss subtle character drift.",
      "Model may report vague issues without actionable recommendations.",
    ],
  },
};
