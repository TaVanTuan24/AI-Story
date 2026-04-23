import type { AiLogger } from "@/server/ai/types";
import { logger } from "@/server/logging/logger";

export const consoleAiLogger: AiLogger = {
  info(entry) {
    logger.info("ai.info", entry);
  },
  warn(entry) {
    logger.warn("ai.warn", entry);
  },
  error(entry) {
    logger.error("ai.error", entry);
  },
};
