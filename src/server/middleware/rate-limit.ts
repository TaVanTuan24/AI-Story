import { env } from "@/lib/config/env";
import { ApiError } from "@/server/api/errors/api-error";

type RateLimitBucket = {
  count: number;
  expiresAt: number;
};

const buckets = new Map<string, RateLimitBucket>();

export function checkRateLimit(
  key: string,
  options?: {
    maxRequests?: number;
    windowMs?: number;
  },
) {
  const now = Date.now();
  const existing = buckets.get(key);
  const windowMs = options?.windowMs ?? env.RATE_LIMIT_WINDOW_MS;
  const maxRequests = options?.maxRequests ?? env.RATE_LIMIT_MAX_REQUESTS;

  if (!existing || existing.expiresAt <= now) {
    buckets.set(key, {
      count: 1,
      expiresAt: now + windowMs,
    });
    return;
  }

  if (existing.count >= maxRequests) {
    throw new ApiError("Rate limit exceeded.", 429, "RATE_LIMIT_EXCEEDED", {
      retryAfterMs: existing.expiresAt - now,
    });
  }

  existing.count += 1;
  buckets.set(key, existing);
}

export function clearRateLimits() {
  buckets.clear();
}
