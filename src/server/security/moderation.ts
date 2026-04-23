import { env } from "@/lib/config/env";
import { ApiError } from "@/server/api/errors/api-error";
import { sanitizeText } from "@/server/security/sanitization";

const blockedPatterns = [
  {
    category: "prompt-injection",
    pattern:
      /\b(ignore (all|the) (previous|prior) instructions|reveal (the )?system prompt|bypass (the )?(rules|guardrails)|act as (chatgpt|the system)|developer message)\b/i,
  },
  {
    category: "sexual-minors",
    pattern: /\b(child sexual|minor sexual|underage sex|sexualize a child)\b/i,
  },
  {
    category: "targeted-hate-or-abuse",
    pattern: /\b(genocide|ethnic cleansing|lynch|how to groom a child)\b/i,
  },
];

const violationCooldowns = new Map<string, number>();

export function moderateCustomInput(input: string, actorKey: string) {
  const cooldownUntil = violationCooldowns.get(actorKey);
  if (cooldownUntil && cooldownUntil > Date.now()) {
    throw new ApiError(
      "Custom actions are temporarily blocked after unsafe input. Please wait and try again.",
      429,
      "CUSTOM_INPUT_COOLDOWN",
      { retryAfterMs: cooldownUntil - Date.now() },
    );
  }

  const normalized = sanitizeText(input);
  const match = blockedPatterns.find((entry) => entry.pattern.test(normalized));

  if (!match) {
    return { safeText: normalized };
  }

  violationCooldowns.set(actorKey, Date.now() + env.CUSTOM_INPUT_MODERATION_COOLDOWN_MS);
  throw new ApiError(
    "This custom input was blocked by safety moderation. Rephrase it as an in-world story action.",
    422,
    "CUSTOM_INPUT_BLOCKED",
    { category: match.category },
  );
}

export function clearModerationState() {
  violationCooldowns.clear();
}
