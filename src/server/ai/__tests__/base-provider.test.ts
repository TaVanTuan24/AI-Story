import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";

import { env } from "@/lib/config/env";
import { generateCharactersOutputSchema } from "@/server/ai/contracts/contracts";
import { AiStructuredOutputValidationError } from "@/server/ai/errors";
import { BaseAiProvider } from "@/server/ai/providers/base-provider";
import type {
  AiInvocationResult,
  AiRoute,
  AiStructuredRequest,
  GenerateCharactersOutput,
} from "@/server/ai/types";

describe("BaseAiProvider structured output handling", () => {
  const originalRetryCount = env.AI_MAX_RETRIES;

  afterEach(() => {
    env.AI_MAX_RETRIES = originalRetryCount;
  });

  it("accepts xAI character output with negative relationship scores", async () => {
    env.AI_MAX_RETRIES = 1;
    const provider = new TestProvider({
      task: "character_generation",
      provider: "xai",
      model: "grok-4-1-fast-reasoning",
      source: "task_override",
      userId: "user-1",
    });

    const result = await provider.invokeStructured<GenerateCharactersOutput>(
      createCharacterRequest(
        JSON.stringify({
          characters: [
            {
              id: "rival",
              name: "Captain Vey",
              role: "Smuggler rival",
              personality: ["sharp", "defiant"],
              initialRelationshipScore: -67,
              statusFlags: ["rival"],
              secretsKnown: [],
              isPlayer: false,
            },
          ],
        }),
      ),
    );

    expect(result.output.characters[0]?.initialRelationshipScore).toBe(-67);
    expect(result.provider).toBe("xai");
    expect(result.model).toBe("grok-4-1-fast-reasoning");
  });

  it("classifies schema validation failures as structured output errors", async () => {
    env.AI_MAX_RETRIES = 1;
    const provider = new TestProvider({
      task: "character_generation",
      provider: "xai",
      model: "grok-4-1-fast-reasoning",
      source: "task_override",
      userId: "user-1",
    });

    await expect(
      provider.invokeStructured(
        createCharacterRequest(
          JSON.stringify({
            characters: [
              {
                id: "broken",
                role: "Incomplete payload",
                personality: ["vague"],
                initialRelationshipScore: "not-a-number",
                statusFlags: [],
                secretsKnown: [],
                isPlayer: false,
              },
            ],
          }),
        ),
      ),
    ).rejects.toMatchObject({
      name: "AiStructuredOutputValidationError",
      code: "AI_STRUCTURED_OUTPUT_INVALID",
    });
  });

  it("treats language-mismatch post validation as a structured output failure", async () => {
    env.AI_MAX_RETRIES = 1;
    const provider = new TestProvider({
      task: "recap",
      provider: "openai",
      model: "gpt-5.4-mini",
      source: "task_override",
      userId: "user-1",
    });

    await expect(
      provider.invokeStructured({
        task: "generateRecap",
        promptVersion: "v1",
        input: {},
        systemPrompt: "system",
        userPrompt: "user",
        jsonSchemaName: "generate_recap",
        jsonSchema: {},
        responseSchema: z.object({
          recap: z.string(),
        }),
        fallback: () => ({
          recap: "fallback",
        }),
        postValidateOutput: (output) => {
          const recap = (output as { recap?: string }).recap ?? "";
          if (recap.includes("và")) {
            throw new AiStructuredOutputValidationError(
              "The AI returned player-facing text in the wrong language.",
            );
          }
        },
        metadata: {
          rawText: JSON.stringify({
            recap: "The hero runs into danger và everything changes.",
          }),
        },
      }),
    ).rejects.toMatchObject({
      name: "AiStructuredOutputValidationError",
      code: "AI_STRUCTURED_OUTPUT_INVALID",
    });
  });
});

class TestProvider extends BaseAiProvider {
  readonly name = "xai";
  readonly defaultModel = "grok-4-1-fast-reasoning";

  constructor(route: AiRoute, private readonly rawText?: string) {
    super(route);
  }

  async invokeStructured<TResult>(
    request: AiStructuredRequest<unknown>,
  ): Promise<AiInvocationResult<TResult>> {
    return this.executeWithStructuredOutput<TResult>(request, async () => ({
      text: this.rawText ?? String(request.metadata?.rawText ?? ""),
    }));
  }

  protected resolveModel() {
    return this.route?.model ?? this.defaultModel;
  }
}

function createCharacterRequest(rawText: string): AiStructuredRequest<unknown> {
  return {
    task: "generateCharacters",
    promptVersion: "v1",
    input: {},
    systemPrompt: "system",
    userPrompt: "user",
    jsonSchemaName: "generate_characters",
    jsonSchema: {},
    responseSchema: generateCharactersOutputSchema,
    fallback: () => ({
      characters: [],
    }),
    metadata: {
      rawText,
    },
  };
}
