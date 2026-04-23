import { env } from "@/lib/config/env";
import { ApiError } from "@/server/api/errors/api-error";

const inflightByActor = new Map<string, number>();

export async function withGenerationPermit<T>(actorKey: string, operation: () => Promise<T>) {
  const inflight = inflightByActor.get(actorKey) ?? 0;
  if (inflight >= env.GENERATION_MAX_CONCURRENT_PER_ACTOR) {
    throw new ApiError(
      "A generation request is already running for this account. Please wait for it to finish.",
      429,
      "GENERATION_IN_PROGRESS",
    );
  }

  inflightByActor.set(actorKey, inflight + 1);
  try {
    return await operation();
  } finally {
    const next = (inflightByActor.get(actorKey) ?? 1) - 1;
    if (next <= 0) {
      inflightByActor.delete(actorKey);
    } else {
      inflightByActor.set(actorKey, next);
    }
  }
}

export function clearGenerationPermits() {
  inflightByActor.clear();
}
