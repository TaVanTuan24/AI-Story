import { env } from "@/lib/config/env";
import { ApiError } from "@/server/api/errors/api-error";
import { BaseAiProvider } from "@/server/ai/providers/base-provider";
import type { AiInvocationResult, AiProvider, AiRoute, AiStructuredRequest } from "@/server/ai/types";

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
};

export class GoogleGeminiProvider extends BaseAiProvider implements AiProvider {
  readonly name = "google_gemini";
  readonly defaultModel = env.GOOGLE_GEMINI_MODEL;

  constructor(route?: AiRoute) {
    super(route);
  }

  async invokeStructured<TResult>(
    request: AiStructuredRequest<unknown>,
  ): Promise<AiInvocationResult<TResult>> {
    const apiKey = this.route?.credentials?.apiKey ?? env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
      throw new ApiError(
        "Google Gemini is not configured yet. Add a Gemini API key in Profile > AI Settings, or set GOOGLE_GEMINI_API_KEY for app-level fallback.",
        503,
        "AI_PROVIDER_NOT_CONFIGURED",
      );
    }

    return this.executeWithStructuredOutput<TResult>(request, async ({ model }) => {
      const baseUrl =
        this.route?.credentials?.baseUrl ??
        "https://generativelanguage.googleapis.com/v1beta";
      const response = await fetch(
        `${baseUrl}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: request.systemPrompt }],
            },
            contents: [
              {
                role: "user",
                parts: [{ text: request.userPrompt }],
              },
            ],
            generationConfig: {
              responseMimeType: "application/json",
              maxOutputTokens: 4_000,
            },
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Gemini request failed with ${response.status}.`);
      }

      const payload = (await response.json()) as GeminiResponse;
      return {
        text: payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("\n") ?? "",
        usage: {
          inputTokens: payload.usageMetadata?.promptTokenCount,
          outputTokens: payload.usageMetadata?.candidatesTokenCount,
          totalTokens: payload.usageMetadata?.totalTokenCount,
        },
      };
    });
  }

  protected resolveModel() {
    return this.route?.model || env.GOOGLE_GEMINI_MODEL || this.defaultModel;
  }
}
