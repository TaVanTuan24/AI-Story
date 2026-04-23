import { logger } from "@/server/logging/logger";

type RequestLogEntry = {
  requestId: string;
  method: string;
  path: string;
  status: number;
  durationMs: number;
  ip: string;
  userAgent?: string;
};

export function logRequest(entry: RequestLogEntry) {
  logger.info("http.request", entry);
}
