import { env } from "@/lib/config/env";
import { ApiError } from "@/server/api/errors/api-error";
import {
  AiMalformedResponseError,
  AiModelConfigurationError,
  AiProviderRequestError,
  AiStructuredOutputValidationError,
  AiProviderTimeoutError,
} from "@/server/ai/errors";
import {
  isValidationError,
  MalformedJsonError,
  safeParseStructuredOutput,
  type StructuredOutputRepairEvent,
} from "@/server/ai/parsers/structured-output-parser";
import type { AiInvocationResult, AiRoute, AiStructuredRequest, AiTokenUsage } from "@/server/ai/types";
import { createRequestId } from "@/server/ai/utils/request-id";
import { withRetry, withTimeout } from "@/server/ai/utils/retry";
import { logger, serializeError } from "@/server/logging/logger";

export abstract class BaseAiProvider {
  abstract readonly name: string;
  abstract readonly defaultModel: string;
  readonly route?: AiRoute;

  constructor(route?: AiRoute) {
    this.route = route;
  }

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
    let finalProviderRequestId: string | undefined;
    let attemptsUsed = 0;
    let usedFallback = false;
    const repairEvents: StructuredOutputRepairEvent[] = [];
    let hadValidationRetry = false;
    const structuredContext = {
      requestId,
      provider: this.name,
      model,
      task: request.task,
      routeSource: this.route?.source,
      credentialSource: resolveCredentialSource(this.route),
    };

    const output = await withRetry<TResult>(
      async (attempt) => {
        attemptsUsed = attempt;
        logger.info("ai.invoke_attempt", {
          requestId,
          provider: this.name,
          model,
          task: request.task,
          attempt,
          routeSource: this.route?.source,
          credentialSource: resolveCredentialSource(this.route),
          userId: this.route?.userId,
        });

        const response = await withTimeout(
          () => invoke({ requestId, model, attempt }),
          request.timeoutMs ?? this.getTimeoutMs(model),
        );
        finalText = response.text;
        finalUsage = response.usage;
        finalProviderRequestId = response.providerRequestId;

        const parsed = safeParseStructuredOutput(
          response.text,
          request.responseSchema as never,
          {
            task: request.task,
            onRepair: (repair) => {
              repairEvents.push(repair);
              this.logStructuredRepair({
                ...structuredContext,
                attempt,
                repair,
              });
            },
          },
        );

        if (parsed.success) {
          request.postValidateOutput?.(parsed.data);
          return parsed.data as TResult;
        }

        hadValidationRetry = true;

        const structuredError = toStructuredOutputError(parsed.error, structuredContext);
        const structuredErrorDetails = describeStructuredOutputError(parsed.error);

        logger[attempt >= (request.retryAttempts ?? env.AI_MAX_RETRIES) ? "error" : "warn"](
          attempt >= (request.retryAttempts ?? env.AI_MAX_RETRIES)
            ? "ai.structured_validation_failed"
            : "ai.structured_retry",
          {
            ...structuredContext,
            attempt,
            parseError: structuredErrorDetails,
          },
        );

        if (attempt >= (request.retryAttempts ?? env.AI_MAX_RETRIES)) {
          throw structuredError;
        }

        throw structuredError;
      },
      {
        attempts: request.retryAttempts ?? env.AI_MAX_RETRIES,
        shouldRetry: (error) => isRetryableAiError(error),
      },
    ).catch((error) => {
      logger.error("ai.invoke_failed", {
        requestId,
        provider: this.name,
        model,
        task: request.task,
        attemptsUsed,
        routeSource: this.route?.source,
        credentialSource: resolveCredentialSource(this.route),
        error: serializeError(error),
      });

      if (error instanceof ApiError) {
        throw error;
      }

      throw normalizeProviderError(error, {
        ...structuredContext,
      });
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
      providerRequestId: finalProviderRequestId,
      structuredOutput: {
        status: usedFallback
          ? "fallback"
          : repairEvents.length > 0
            ? "repaired"
            : "validated",
        repairCount: repairEvents.length,
        hadValidationRetry,
      },
      output,
      rawText: finalText,
    };
  }

  protected abstract resolveModel(): string;

  protected getTimeoutMs(_model: string) {
    return env.AI_REQUEST_TIMEOUT_MS;
  }

  private logStructuredRepair(input: {
    requestId: string;
    provider: string;
    model: string;
    task: string;
    attempt: number;
    credentialSource: string;
    routeSource?: string;
    repair: StructuredOutputRepairEvent;
  }) {
    logger.warn("ai.structured_output_repaired", {
      requestId: input.requestId,
      provider: input.provider,
      model: input.model,
      task: input.task,
      attempt: input.attempt,
      credentialSource: input.credentialSource,
      routeSource: input.routeSource,
      fieldPath: input.repair.path,
      repairReason: input.repair.reason,
      originalValue: input.repair.originalValue,
      repairedValue: input.repair.repairedValue,
    });
  }
}

function normalizeProviderError(
  error: unknown,
  context: Record<string, unknown>,
) {
  if (
    error instanceof AiProviderRequestError ||
    error instanceof AiProviderTimeoutError ||
    error instanceof AiMalformedResponseError ||
    error instanceof AiStructuredOutputValidationError
  ) {
    return error;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes("timed out") || message.includes("timeout")) {
      return new AiProviderTimeoutError(
        "The AI provider took too long to respond. Please retry in a moment.",
        context,
      );
    }

    if (
      message.includes("model") &&
      (message.includes("not found") ||
        message.includes("invalid") ||
        message.includes("unsupported") ||
        message.includes("does not exist"))
    ) {
      return new AiModelConfigurationError(
        "The selected AI model is not supported by the provider anymore. Update the task routing in AI Settings and try again.",
        context,
      );
    }

    if (message.includes("json") || message.includes("malformed") || message.includes("parse")) {
      return new AiMalformedResponseError(
        "The AI provider returned an invalid structured response. Please retry in a moment.",
        context,
      );
    }

    if (
      message.includes("schema") ||
      message.includes("zod") ||
      message.includes("validation")
    ) {
      return new AiStructuredOutputValidationError(
        "The AI returned an invalid story structure. Please retry or choose a different model.",
        context,
      );
    }
  }

  return new AiProviderRequestError(
    "The AI provider could not complete generation. Please retry in a moment.",
    "AI_PROVIDER_UNAVAILABLE",
    context,
  );
}

function resolveCredentialSource(route?: AiRoute) {
  if (!route) {
    return "direct_provider";
  }

  if (route.source === "app_fallback") {
    return "app_fallback_env";
  }

  if (route.source === "bootstrap") {
    return "bootstrap";
  }

  return "user_settings";
}

function isRetryableAiError(error: unknown) {
  if (
    error instanceof AiMalformedResponseError ||
    error instanceof AiStructuredOutputValidationError ||
    error instanceof MalformedJsonError ||
    isValidationError(error)
  ) {
    return true;
  }

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

function toStructuredOutputError(
  error: Error,
  context: Record<string, unknown>,
) {
  const details = {
    ...context,
    ...describeStructuredOutputError(error),
  };

  if (error instanceof MalformedJsonError) {
    return new AiMalformedResponseError(
      "The AI provider returned an invalid structured response. Please retry in a moment.",
      details,
    );
  }

  if (isValidationError(error)) {
    return new AiStructuredOutputValidationError(
      "The AI returned an invalid story structure. Please retry or choose a different model.",
      details,
    );
  }

  return new AiStructuredOutputValidationError(
    "The AI returned an invalid story structure. Please retry or choose a different model.",
    details,
  );
}

function describeStructuredOutputError(error: Error) {
  if (isValidationError(error)) {
    return {
      error: {
        name: error.name,
        message: error.message,
        issues: error.issues.map((issue) => ({
          code: issue.code,
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
    };
  }

  return {
    error: serializeError(error),
  };
}
