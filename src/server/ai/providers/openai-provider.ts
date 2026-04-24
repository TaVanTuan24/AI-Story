import OpenAI from "openai";

import { env } from "@/lib/config/env";
import { ApiError } from "@/server/api/errors/api-error";
import { BaseAiProvider } from "@/server/ai/providers/base-provider";
import type { AiInvocationResult, AiProvider, AiRoute, AiStructuredRequest } from "@/server/ai/types";

export class OpenAiProvider extends BaseAiProvider implements AiProvider {
  readonly name = "openai";
  readonly defaultModel = env.OPENAI_MODEL;
  private readonly client: OpenAI | null;

  constructor(route?: AiRoute) {
    super(route);
    const apiKey = route?.credentials?.apiKey ?? env.OPENAI_API_KEY;
    this.client = apiKey
      ? new OpenAI({
          apiKey,
          baseURL: route?.credentials?.baseUrl ?? env.OPENAI_BASE_URL,
          organization: route?.credentials?.headers?.organizationId,
          project: route?.credentials?.headers?.projectId,
        })
      : null;
  }

  async invokeStructured<TResult>(
    request: AiStructuredRequest<unknown>,
  ): Promise<AiInvocationResult<TResult>> {
    if (!this.client) {
      throw new ApiError(
        "OpenAI is not configured yet. Add an OpenAI API key in Profile > AI Settings, or set OPENAI_API_KEY for app-level fallback.",
        503,
        "AI_PROVIDER_NOT_CONFIGURED",
      );
    }

    return this.executeWithStructuredOutput<TResult>(request, async ({ model }) => {
      const basePayload = {
        model,
        max_output_tokens: request.maxOutputTokens ?? 4_000,
        input: [
          {
            role: "system" as const,
            content: [{ type: "input_text" as const, text: request.systemPrompt }],
          },
          {
            role: "user" as const,
            content: [{ type: "input_text" as const, text: request.userPrompt }],
          },
        ],
        ...(this.route?.capabilities?.supportsReasoningEffort && request.reasoningEffort
          ? {
              reasoning: {
                effort: request.reasoningEffort,
              },
            }
          : {}),
      };
      const response = await this.client!.responses.create(
        this.route?.capabilities?.supportsNativeStrictJson === false
          ? basePayload
          : {
              ...basePayload,
              text: {
                format: {
                  type: "json_schema",
                  name: request.jsonSchemaName,
                  strict: true,
                  schema: request.jsonSchema,
                },
              },
            },
      );

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
    return this.route?.model || env.OPENAI_MODEL || this.defaultModel;
  }
}
