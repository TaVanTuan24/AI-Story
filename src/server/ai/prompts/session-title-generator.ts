import { JSON_SCHEMAS } from "@/server/ai/contracts/contracts";
import type {
  AiPromptDefinition,
  GenerateSessionTitleInput,
  GenerateSessionTitleOutput,
} from "@/server/ai/types";
import {
  buildAntiDriftInstructions,
  buildJsonOnlyInstructions,
  buildPromptHeader,
  buildSchemaDisciplineInstructions,
  PROMPT_VERSION,
} from "@/server/ai/prompts/shared";

export const sessionTitleGeneratorPrompt: AiPromptDefinition<
  GenerateSessionTitleInput,
  GenerateSessionTitleOutput
> = {
  task: "generateSessionTitle",
  version: PROMPT_VERSION,
  purpose:
    "Generate a memorable but restrained session title aligned with premise, tone, and genre.",
  inputVariables: ["genre", "tone", "premise", "enginePreset", "worldSummary"],
  system: [
    buildPromptHeader("session-title-generator", PROMPT_VERSION),
    "You are generating a session title for an interactive fiction engine.",
    "The title should be concise, evocative, and aligned with the story's tone.",
    "Avoid clichéd fantasy-novel naming, random poetic vagueness, or franchise-like subtitles.",
    buildAntiDriftInstructions(),
    buildSchemaDisciplineInstructions(),
    buildJsonOnlyInstructions(),
  ].join(" "),
  user: (input) =>
    [
      "Generate a session title.",
      "Input:",
      JSON.stringify(input, null, 2),
      "Requirements:",
      "- Keep it short and memorable.",
      "- Match tone and genre without sounding generic.",
      "- Include a brief rationale.",
    ].join("\n"),
  fallback: (input) => ({
    title: "Untitled Session",
    rationale: `Fallback title for a ${input.genre} story.`,
  }),
  expectedOutputJsonSchema: JSON_SCHEMAS.generateSessionTitle.schema,
  notes: {
    tokenBudget:
      "Very small output. This prompt should stay cheap and fast.",
    failureModes: [
      "Model may produce overlong or overly ornate titles.",
      "Model may ignore tone and produce a mismatched vibe.",
      "Model may sound derivative of common genre titles.",
    ],
  },
};
