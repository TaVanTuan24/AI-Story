import { env } from "@/lib/config/env";
import { ApiError } from "@/server/api/errors/api-error";
import { safeParseStructuredOutput } from "@/server/ai/parsers/structured-output-parser";
import type { AiInvocationResult, AiStructuredRequest, AiTokenUsage } from "@/server/ai/types";
import { createRequestId } from "@/server/ai/utils/request-id";
import { withRetry, withTimeout } from "@/server/ai/utils/retry";

export abstract class BaseAiProvider {
  abstract readonly name: string;
  abstract readonly defaultModel: string;

  protected async executeWithStructuredOutput<TResult>(
    request: AiStructuredRequest<unknown>,
    invoke: (payload: {
      requestId: string;
      model: string;
      attempt: number;
    }) => Promise<{
      text: string;
      usage?: AiTokenUsage;
      providerRequestId?: string;
    }>,
  ): Promise<AiInvocationResult<TResult>> {
    const requestId = request.requestId ?? createRequestId(this.name);
    const model = this.resolveModel();
    let finalText = "";
    let finalUsage: AiTokenUsage | undefined;
    let attemptsUsed = 0;
    let usedFallback = false;

    const output = await withRetry<TResult>(
      async (attempt) => {
        attemptsUsed = attempt;
        const response = await withTimeout(() => invoke({ requestId, model, attempt }));
        finalText = response.text;
        finalUsage = response.usage;

        const parsed = safeParseStructuredOutput(
          response.text,
          request.responseSchema as never,
        );

        if (parsed.success) {
          return parsed.data as TResult;
        }

        if (attempt >= env.AI_MAX_RETRIES) {
          usedFallback = true;
          return request.fallback() as TResult;
        }

        throw parsed.error;
      },
      {
        attempts: env.AI_MAX_RETRIES,
        shouldRetry: (error) => isRetryableAiError(error),
      },
    ).catch((error) => {
      if (error instanceof ApiError) {
        throw error;
      }

      throw new ApiError(
        "The AI provider could not complete generation. Please retry in a moment.",
        503,
        "AI_PROVIDER_UNAVAILABLE",
        { provider: this.name, model, requestId },
      );
    });

    return {
      requestId,
      task: request.task,
      promptVersion: request.promptVersion,
      provider: this.name,
      model,
      attempts: attemptsUsed,
      usedFallback,
      usage: finalUsage,
      output,
      rawText: finalText,
    };
  }

  protected abstract resolveModel(): string;
}

function isRetryableAiError(error: unknown) {
  if (!(error instanceof Error)) {
    return true;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("timeout") ||
    message.includes("timed out") ||
    message.includes("rate limit") ||
    message.includes("429") ||
    message.includes("500") ||
    message.includes("502") ||
    message.includes("503") ||
    message.includes("504") ||
    message.includes("network")
  );
}
