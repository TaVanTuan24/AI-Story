import { JSON_SCHEMAS } from "@/server/ai/contracts/contracts";
import type {
  AiPromptDefinition,
  SummarizeTurnsInput,
  SummarizeTurnsOutput,
} from "@/server/ai/types";
import {
  buildAntiDriftInstructions,
  buildJsonOnlyInstructions,
  buildPromptHeader,
  buildSchemaDisciplineInstructions,
  PROMPT_VERSION,
} from "@/server/ai/prompts/shared";

export const turnSummarizerPrompt: AiPromptDefinition<
  SummarizeTurnsInput,
  SummarizeTurnsOutput
> = {
  task: "summarizeTurns",
  version: PROMPT_VERSION,
  purpose:
    "Compress recent turns into layered summaries for future prompting, recap, and continuity support.",
  inputVariables: ["contextPack", "recentTurns"],
  system: [
    buildPromptHeader("turn-summarizer", PROMPT_VERSION),
    "You are summarizing recent turns for an interactive fiction engine.",
    "You must compress, not embellish.",
    "Do not introduce new facts, motives, or events.",
    "The canon summary must be faithful enough to support later continuity.",
    buildAntiDriftInstructions(),
    buildSchemaDisciplineInstructions(),
    buildJsonOnlyInstructions(),
  ].join(" "),
  user: (input) =>
    [
      "Summarize the recent turns.",
      "Input:",
      JSON.stringify(input, null, 2),
      "Requirements:",
      "- short: quick memory refresh.",
      "- medium: stronger narrative continuity summary.",
      "- canon: durable factual compression with no invented details.",
      "- canonUpdate: structured facts, important flags, and irreversible events for canon memory.",
    ].join("\n"),
  fallback: (input) => ({
    short: `Recent turns advanced the story through ${input.recentTurns.length} key beats.`,
    medium: input.recentTurns.map((turn) => `${turn.turnNumber}: ${turn.sceneSummary}`).join(" "),
    canon: input.recentTurns
      .map((turn) => `Turn ${turn.turnNumber} followed "${turn.actionText}" and produced "${turn.sceneSummary}".`)
      .join(" "),
    canonUpdate: {
      facts: input.recentTurns.map((turn) => ({
        id: `turn-${turn.turnNumber}-summary`,
        category: "event" as const,
        subject: turn.sceneTitle,
        value: turn.sceneSummary,
        immutable: true,
      })),
      irreversibleEvents: [],
      importantFlags: [],
    },
  }),
  expectedOutputJsonSchema: JSON_SCHEMAS.summarizeTurns.schema,
  notes: {
    tokenBudget:
      "Use only the most relevant recent turns. This prompt exists to reduce future context cost, not increase it.",
    failureModes: [
      "Model may become too poetic and lose factual precision.",
      "Model may omit a critical turning point.",
      "Model may accidentally introduce invented connective tissue.",
    ],
  },
};
