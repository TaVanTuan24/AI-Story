import OpenAI from "openai";

import { env } from "@/lib/config/env";
import { ApiError } from "@/server/api/errors/api-error";
import { BaseAiProvider } from "@/server/ai/providers/base-provider";
import type { AiInvocationResult, AiProvider, AiRoute, AiStructuredRequest } from "@/server/ai/types";

export class XaiProvider extends BaseAiProvider implements AiProvider {
  readonly name = "xai";
  readonly defaultModel = env.XAI_MODEL;
  private readonly client: OpenAI | null;

  constructor(route?: AiRoute) {
    super(route);
    const apiKey = route?.credentials?.apiKey ?? env.XAI_API_KEY;
    this.client = apiKey
      ? new OpenAI({
          apiKey,
          baseURL: route?.credentials?.baseUrl ?? env.XAI_BASE_URL,
        })
      : null;
  }

  async invokeStructured<TResult>(
    request: AiStructuredRequest<unknown>,
  ): Promise<AiInvocationResult<TResult>> {
    if (!this.client) {
      throw new ApiError(
        "xAI Grok is not configured yet. Add an xAI API key in Profile > AI Settings, or set XAI_API_KEY for app-level fallback.",
        503,
        "AI_PROVIDER_NOT_CONFIGURED",
      );
    }

    return this.executeWithStructuredOutput<TResult>(request, async ({ model }) => {
      const response = await this.client!.responses.create({
        model,
        max_output_tokens: 4_000,
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
    return this.route?.model || env.XAI_MODEL || this.defaultModel;
  }

  protected getTimeoutMs(model: string) {
    if (model.includes("reasoning")) {
      return Math.max(env.AI_REQUEST_TIMEOUT_MS, 90_000);
    }

    return Math.max(env.AI_REQUEST_TIMEOUT_MS, 45_000);
  }
}
