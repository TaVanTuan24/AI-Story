import { env } from "@/lib/config/env";

export function getMemoryConfig() {
  return {
    shortTermTurns: env.MEMORY_SHORT_TERM_TURNS,
    summaryInterval: env.MEMORY_SUMMARY_INTERVAL,
    rollingSummariesMax: env.MEMORY_ROLLING_SUMMARIES_MAX,
    canonFactsMax: env.MEMORY_CANON_FACTS_MAX,
    consistencyCheckEnabled: env.MEMORY_ENABLE_CONSISTENCY_CHECK,
    sceneRepairEnabled: env.MEMORY_ENABLE_SCENE_REPAIR,
    maxRepairAttempts: env.MEMORY_MAX_REPAIR_ATTEMPTS,
  };
}
