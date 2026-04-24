import Anthropic from "@anthropic-ai/sdk";

import { env } from "@/lib/config/env";
import { ApiError } from "@/server/api/errors/api-error";
import { BaseAiProvider } from "@/server/ai/providers/base-provider";
import type { AiInvocationResult, AiProvider, AiRoute, AiStructuredRequest } from "@/server/ai/types";

export class AnthropicProvider extends BaseAiProvider implements AiProvider {
  readonly name = "anthropic";
  readonly defaultModel = env.ANTHROPIC_MODEL;
  private readonly client: Anthropic | null;

  constructor(route?: AiRoute) {
    super(route);
    const apiKey = route?.credentials?.apiKey ?? env.ANTHROPIC_API_KEY;
    this.client = apiKey
      ? new Anthropic({
          apiKey,
          baseURL: route?.credentials?.baseUrl,
        })
      : null;
  }

  async invokeStructured<TResult>(
    request: AiStructuredRequest<unknown>,
  ): Promise<AiInvocationResult<TResult>> {
    if (!this.client) {
      throw new ApiError(
        "Anthropic is not configured yet. Add an Anthropic API key in Profile > AI Settings, or set ANTHROPIC_API_KEY for app-level fallback.",
        503,
        "AI_PROVIDER_NOT_CONFIGURED",
      );
    }

    return this.executeWithStructuredOutput<TResult>(request, async ({ model }) => {
      // Anthropic structured JSON support may need provider-specific tightening later.
      const response = await this.client!.messages.create({
        model,
        max_tokens: 4_000,
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
    return this.route?.model || env.ANTHROPIC_MODEL || this.defaultModel;
  }
}
