import { JSON_SCHEMAS } from "@/server/ai/contracts/contracts";
import type {
  AiPromptDefinition,
  GenerateChoicesInput,
  GenerateChoicesOutput,
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

export const choiceGeneratorPrompt: AiPromptDefinition<
  GenerateChoicesInput,
  GenerateChoicesOutput
> = {
  task: "generateChoices",
  version: PROMPT_VERSION,
  purpose:
    "Generate a small set of strong, non-redundant next actions for the current turn.",
  inputVariables: ["contextPack", "sceneSummary"],
  system: [
    buildPromptHeader("choice-generator", PROMPT_VERSION),
    "You are generating player-facing choices for an interactive fiction engine.",
    "Choices must create real divergence in approach, risk, social consequence, or information gained.",
    "Avoid filler, restatements, and cosmetic variants of the same action.",
    "Each label should be short, clear, and actionable.",
    buildAntiDriftInstructions(),
    buildSchemaDisciplineInstructions(),
    buildJsonOnlyInstructions(),
  ].join(" "),
  user: (input) =>
    [
      "Generate choices for the current scene.",
      "Input:",
      JSON.stringify(input, null, 2),
      "Requirements:",
      "- Return 3 to 4 choices.",
      "- Choices must be meaningfully different.",
      "- Prefer concrete verbs and specific stakes.",
      "- Avoid repetitive filler choices.",
      '- Each choice.intent must be one of exactly: "explore", "investigate", "socialize", "fight", "protect", "negotiate", "rest", "deceive", "reveal", "escape", "observe", or "improvise".',
      "- Do not output synonym labels for intents. Convert ideas like talk, defend, search, persuade, or flee into the allowed enum values.",
    ].join("\n"),
  fallback: (input) => {
    const language = resolvePromptLanguage(input);
    return {
      choices: [
        {
          label: localizedText(language, {
            en: "Investigate the most suspicious detail",
            vi: "Kiem tra chi tiet dang ngo nhat",
          }),
          intent: "investigate",
          tags: ["probe"],
        },
        {
          label: localizedText(language, {
            en: "Protect someone vulnerable nearby",
            vi: "Bao ve nguoi de bi ton thuong o gan",
          }),
          intent: "protect",
          tags: ["defensive"],
        },
        {
          label: localizedText(language, {
            en: "Push the situation forward aggressively",
            vi: "Day tinh huong tien len mot cach quyet liet",
          }),
          intent: "explore",
          tags: ["bold"],
        },
      ],
    };
  },
  expectedOutputJsonSchema: JSON_SCHEMAS.generateChoices.schema,
  notes: {
    tokenBudget:
      "This prompt should be very cheap. It only needs to return compact labels and intents.",
    failureModes: [
      "Model may produce choices that overlap heavily.",
      "Model may choose generic verbs with no scenario specificity.",
      "Model may ignore the scene pressure and offer low-stakes options.",
    ],
  },
};
