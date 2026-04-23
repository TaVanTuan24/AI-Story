import { randomUUID } from "node:crypto";

export function createRequestId(prefix = "ai") {
  return `${prefix}_${randomUUID()}`;
}
