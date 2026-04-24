import { z } from "zod";

import { ApiError } from "@/server/api/errors/api-error";
import { AnthropicProvider } from "@/server/ai/providers/anthropic-provider";
import { BootstrapProvider } from "@/server/ai/providers/bootstrap-provider";
import { GoogleGeminiProvider } from "@/server/ai/providers/google-gemini-provider";
import { OpenAiProvider } from "@/server/ai/providers/openai-provider";
import { XaiProvider } from "@/server/ai/providers/xai-provider";
import { ModelRoutingService } from "@/server/ai/routing/model-routing-service";
import type { AiProvider, AiRoute, AiStructuredRequest } from "@/server/ai/types";
import { consoleAiLogger } from "@/server/ai/runtime/console-logger";
import { STORY_GENRES } from "@/server/persistence/shared/constants";
import { UserPreferenceRepository } from "@/server/persistence/repositories/user-preference-repository";

const rewriteSchema = z.object({
  rewrittenText: z.string().min(1).max(4_000),
  suggestedGenre: z.enum(STORY_GENRES).optional(),
  suggestedTone: z.string().min(1).max(120).optional(),
  dynamicStatsPreview: z
    .array(
      z.object({
        key: z.string().min(1).max(40),
        label: z.string().min(1).max(120),
        description: z.string().min(1).max(240),
      }),
    )
    .max(8)
    .default([]),
});

export class StoryIdeaRewriteService {
  constructor(
    private readonly routingService = new ModelRoutingService(),
    private readonly preferenceRepository = new UserPreferenceRepository(),
    private readonly logger = consoleAiLogger,
  ) {}

  async rewrite(userId: string, text: string) {
    const route = await this.routingService.resolveRoute({
      userId,
      task: "generateWorld",
    });
    const provider = createProvider(route);
    const preferences = await this.preferenceRepository.upsertDefault(userId);
    const storyOutputLanguage =
      preferences?.storyOutputLanguage === "vi" ? "vi" : "en";

    const request: AiStructuredRequest<{ text: string }> = {
      task: "generateWorld",
      promptVersion: "v1",
      input: { text },
      systemPrompt: [
        "You rewrite story ideas for a production interactive fiction app.",
        storyOutputLanguage === "vi"
          ? "Rewrite all player-facing text entirely in Vietnamese. Do not mix languages."
          : "Rewrite all player-facing text entirely in English. Do not mix languages.",
        "Preserve the user's intent while improving clarity, dramatic tension, specificity, and hook strength.",
        "Suggest a suitable genre, a concise tone, and a short preview of dynamic stats that fit the premise.",
        "Do not invent a full story outline. Do not add markup. Do not reveal hidden notes.",
        "Return only strict JSON with rewrittenText, suggestedGenre, suggestedTone, and dynamicStatsPreview.",
      ].join(" "),
      userPrompt: [
        "Rewrite the following story idea so it feels sharper, more cinematic, and more usable as a session concept.",
        "Keep it concise, polished, and readable.",
        "Infer the closest supported genre when possible.",
        "Input:",
        text,
      ].join("\n\n"),
      jsonSchemaName: "rewrite_story_idea",
      jsonSchema: {
        type: "object",
        additionalProperties: false,
        required: ["rewrittenText", "dynamicStatsPreview"],
        properties: {
          rewrittenText: { type: "string" },
          suggestedGenre: { type: "string", enum: [...STORY_GENRES] },
          suggestedTone: { type: "string" },
          dynamicStatsPreview: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["key", "label", "description"],
              properties: {
                key: { type: "string" },
                label: { type: "string" },
                description: { type: "string" },
              },
            },
          },
        },
      },
      responseSchema: rewriteSchema,
      fallback: () => ({ rewrittenText: text.trim(), dynamicStatsPreview: [] }),
      metadata: {
        feature: "story_idea_rewrite",
      },
    };

    const result = await provider.invokeStructured<z.infer<typeof rewriteSchema>>(request);

    this.logger.info({
      requestId: result.requestId,
      provider: result.provider,
      model: result.model,
      task: "story_idea_rewrite",
      routeSource: route.source,
      routedTask: route.task,
    });

    const rewrittenText = result.output.rewrittenText.trim();
    if (!rewrittenText) {
      throw new ApiError(
        "The AI rewrite result was empty. Please try again.",
        502,
        "AI_REWRITE_EMPTY",
      );
    }

    return {
      rewrittenText,
      suggestedGenre: result.output.suggestedGenre,
      suggestedTone: result.output.suggestedTone,
      dynamicStatsPreview: result.output.dynamicStatsPreview ?? [],
    };
  }
}

function createProvider(route: AiRoute): AiProvider {
  switch (route.provider) {
    case "anthropic":
      return new AnthropicProvider(route);
    case "google_gemini":
      return new GoogleGeminiProvider(route);
    case "xai":
      return new XaiProvider(route);
    case "bootstrap":
      return new BootstrapProvider(route);
    case "openai":
    default:
      return new OpenAiProvider(route);
  }
}
