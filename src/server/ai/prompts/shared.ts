export function buildJsonOnlyInstructions() {
  return [
    "Return JSON only.",
    "Do not wrap the response in markdown.",
    "Do not add commentary outside the JSON object.",
    "Never update canonical game state directly.",
    "Narrative prose and suggestions are allowed; canonical state is owned by the engine.",
  ].join(" ");
}

export function buildPromptHeader(task: string, version: string) {
  return `Task: ${task}. Prompt version: ${version}.`;
}

export function buildAntiDriftInstructions() {
  return [
    "Preserve continuity with the supplied context.",
    "Do not change established setting, era, social dynamics, or genre logic without evidence in the input.",
    "Keep character behavior consistent with prior personality, motives, and relationships.",
    "Respect the supplied world rules and known facts.",
    "Avoid repetitive scene structure, repeated imagery, and recycled choice phrasing.",
    "Keep scenes concise, vivid, and forward-moving.",
    "Choices must be meaningfully different in tactic, risk, or emotional consequence.",
    "Avoid generic filler such as 'wait and see', 'keep going', or 'do something else'.",
  ].join(" ");
}

export function buildSchemaDisciplineInstructions() {
  return [
    "Every required field must be present.",
    "Do not add extra keys.",
    "Strings should be compact and high-signal.",
    "If unsure, choose the safest interpretation that preserves continuity.",
  ].join(" ");
}

export const PROMPT_VERSION = "v1" as const;

export function resolvePromptLanguage(input: unknown): "en" | "vi" {
  if (!input || typeof input !== "object") {
    return "en";
  }

  const direct = (input as { storyOutputLanguage?: unknown }).storyOutputLanguage;
  if (direct === "vi") {
    return "vi";
  }
  if (direct === "en") {
    return "en";
  }

  const contextLanguage = (input as {
    contextPack?: { language?: { storyOutputLanguage?: unknown } };
  }).contextPack?.language?.storyOutputLanguage;

  return contextLanguage === "vi" ? "vi" : "en";
}

export function localizedText(
  language: "en" | "vi",
  copy: { en: string; vi: string },
) {
  return language === "vi" ? copy.vi : copy.en;
}
