import { randomUUID } from "node:crypto";

export type RequestContext = {
  requestId: string;
  startedAt: number;
  method: string;
  path: string;
  ip: string;
  userAgent: string;
};

export function createRequestContext(request: Request): RequestContext {
  const url = new URL(request.url);

  return {
    requestId: request.headers.get("x-request-id") ?? `req_${randomUUID()}`,
    startedAt: Date.now(),
    method: request.method,
    path: url.pathname,
    ip:
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "127.0.0.1",
    userAgent: request.headers.get("user-agent") ?? "unknown",
  };
}
