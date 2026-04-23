import { JSON_SCHEMAS } from "@/server/ai/contracts/contracts";
import type {
  AiPromptDefinition,
  GenerateRecapInput,
  GenerateRecapOutput,
} from "@/server/ai/types";
import {
  buildAntiDriftInstructions,
  buildJsonOnlyInstructions,
  buildPromptHeader,
  buildSchemaDisciplineInstructions,
  PROMPT_VERSION,
} from "@/server/ai/prompts/shared";

export const recapGeneratorPrompt: AiPromptDefinition<
  GenerateRecapInput,
  GenerateRecapOutput
> = {
  task: "generateRecap",
  version: PROMPT_VERSION,
  purpose:
    "Generate a player-facing recap that refreshes memory without inventing new events or collapsing important nuance.",
  inputVariables: ["contextPack", "recentTurns"],
  system: [
    buildPromptHeader("recap-generator", PROMPT_VERSION),
    "You are writing a recap for an interactive fiction engine.",
    "The recap should help a player resume play quickly.",
    "Stay faithful to what actually happened. Do not add new conclusions or hidden motives.",
    "Keep highlights crisp and keep open threads genuinely unresolved.",
    buildAntiDriftInstructions(),
    buildSchemaDisciplineInstructions(),
    buildJsonOnlyInstructions(),
  ].join(" "),
  user: (input) =>
    [
      "Generate a recap for the player.",
      "Input:",
      JSON.stringify(input, null, 2),
      "Requirements:",
      "- recap: readable resume summary.",
      "- highlights: most important recent beats.",
      "- openThreads: unresolved tensions, clues, or goals.",
    ].join("\n"),
  fallback: (input) => ({
    recap: `The story has advanced through ${input.recentTurns.length} recent turns and remains unresolved.`,
    highlights: input.recentTurns.slice(-3).map((turn) => turn.sceneSummary),
    openThreads: [],
  }),
  expectedOutputJsonSchema: JSON_SCHEMAS.generateRecap.schema,
  notes: {
    tokenBudget:
      "Moderate. This can be slightly richer than a summary, but it should still be compact enough for resume UX.",
    failureModes: [
      "Model may overdramatize and invent hidden meaning.",
      "Model may turn highlights into generic summaries.",
      "Model may omit the most important unresolved thread.",
    ],
  },
};
