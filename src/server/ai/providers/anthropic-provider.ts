import Anthropic from "@anthropic-ai/sdk";

import { env } from "@/lib/config/env";
import { ApiError } from "@/server/api/errors/api-error";
import { BaseAiProvider } from "@/server/ai/providers/base-provider";
import type { AiInvocationResult, AiProvider, AiStructuredRequest } from "@/server/ai/types";

export class AnthropicProvider extends BaseAiProvider implements AiProvider {
  readonly name = "anthropic";
  readonly defaultModel = env.ANTHROPIC_MODEL;
  private readonly client = env.ANTHROPIC_API_KEY
    ? new Anthropic({
        apiKey: env.ANTHROPIC_API_KEY,
      })
    : null;

  async invokeStructured<TResult>(
    request: AiStructuredRequest<unknown>,
  ): Promise<AiInvocationResult<TResult>> {
    if (!this.client) {
      throw new ApiError(
        "AI provider is not configured. Set ANTHROPIC_API_KEY or switch AI_PROVIDER to bootstrap.",
        503,
        "AI_PROVIDER_NOT_CONFIGURED",
      );
    }

    return this.executeWithStructuredOutput<TResult>(request, async ({ model }) => {
      // Anthropic structured JSON support may need provider-specific tightening later.
      const response = await this.client!.messages.create({
        model,
        max_tokens: 1_500,
        system: request.systemPrompt,
        messages: [{ role: "user", content: request.userPrompt }],
      });

      const text = response.content
        .filter((item) => item.type === "text")
        .map((item) => (item.type === "text" ? item.text : ""))
        .join("\n");

      return {
        text,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        },
        providerRequestId: response.id,
      };
    });
  }

  protected resolveModel() {
    return env.ANTHROPIC_MODEL || this.defaultModel;
  }
}
