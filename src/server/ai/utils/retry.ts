import { env } from "@/lib/config/env";

export async function withRetry<T>(
  operation: (attempt: number) => Promise<T>,
  options?: {
    attempts?: number;
    shouldRetry?: (error: unknown, attempt: number) => boolean;
  },
) {
  const attempts = options?.attempts ?? 2;
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation(attempt);
    } catch (error) {
      lastError = error;
      const retry = attempt < attempts && (options?.shouldRetry?.(error, attempt) ?? true);
      if (!retry) {
        break;
      }

      await delay(getBackoffDelay(attempt));
    }
  }

  throw lastError;
}

export async function withTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs = env.AI_REQUEST_TIMEOUT_MS,
) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  return new Promise<T>((resolve, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Operation timed out after ${timeoutMs}ms.`));
    }, timeoutMs);

    operation()
      .then(resolve)
      .catch(reject)
      .finally(() => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      });
  });
}

function getBackoffDelay(attempt: number) {
  const exponential = env.AI_RETRY_BASE_DELAY_MS * 2 ** Math.max(attempt - 1, 0);
  const jitter = Math.floor(Math.random() * env.AI_RETRY_BASE_DELAY_MS);
  return Math.min(exponential + jitter, env.AI_RETRY_MAX_DELAY_MS);
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
