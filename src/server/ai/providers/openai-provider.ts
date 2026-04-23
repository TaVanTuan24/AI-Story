import OpenAI from "openai";

import { env } from "@/lib/config/env";
import { ApiError } from "@/server/api/errors/api-error";
import { BaseAiProvider } from "@/server/ai/providers/base-provider";
import type { AiInvocationResult, AiProvider, AiStructuredRequest } from "@/server/ai/types";

export class OpenAiProvider extends BaseAiProvider implements AiProvider {
  readonly name = "openai";
  readonly defaultModel = env.OPENAI_MODEL;
  private readonly client = env.OPENAI_API_KEY
    ? new OpenAI({
        apiKey: env.OPENAI_API_KEY,
      })
    : null;

  async invokeStructured<TResult>(
    request: AiStructuredRequest<unknown>,
  ): Promise<AiInvocationResult<TResult>> {
    if (!this.client) {
      throw new ApiError(
        "AI provider is not configured. Set OPENAI_API_KEY or switch AI_PROVIDER to bootstrap.",
        503,
        "AI_PROVIDER_NOT_CONFIGURED",
      );
    }

    return this.executeWithStructuredOutput<TResult>(request, async ({ model }) => {
      // Provider-specific knobs may need tuning per model family.
      const response = await this.client!.responses.create({
        model,
        input: [
          {
            role: "system",
            content: [{ type: "input_text", text: request.systemPrompt }],
          },
          {
            role: "user",
            content: [{ type: "input_text", text: request.userPrompt }],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: request.jsonSchemaName,
            strict: true,
            schema: request.jsonSchema,
          },
        },
      });

      return {
        text: response.output_text,
        usage: {
          inputTokens: response.usage?.input_tokens,
          outputTokens: response.usage?.output_tokens,
          totalTokens: response.usage?.total_tokens,
        },
        providerRequestId: response.id,
      };
    });
  }

  protected resolveModel() {
    return env.OPENAI_MODEL || this.defaultModel;
  }
}
