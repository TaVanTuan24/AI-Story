import { env } from "@/lib/config/env";
import {
  checkConsistencyOutputSchema,
  generateCharactersOutputSchema,
  generateChoicesOutputSchema,
  generateNextSceneOutputSchema,
  generateOpeningSceneOutputSchema,
  generateRecapOutputSchema,
  generateSessionTitleOutputSchema,
  generateWorldOutputSchema,
  interpretCustomActionOutputSchema,
  JSON_SCHEMAS,
  summarizeTurnsOutputSchema,
} from "@/server/ai/contracts/contracts";
import {
  characterGeneratorPrompt,
  choiceGeneratorPrompt,
  consistencyCheckerPrompt,
  customActionInterpreterPrompt,
  nextSceneGeneratorPrompt,
  openingSceneGeneratorPrompt,
  recapGeneratorPrompt,
  sessionTitleGeneratorPrompt,
  turnSummarizerPrompt,
  worldGeneratorPrompt,
} from "@/server/ai/prompts";
import { consoleAiLogger } from "@/server/ai/runtime/console-logger";
import { AnthropicProvider } from "@/server/ai/providers/anthropic-provider";
import { BootstrapProvider } from "@/server/ai/providers/bootstrap-provider";
import { OpenAiProvider } from "@/server/ai/providers/openai-provider";
import type {
  AiOrchestratorOptions,
  AiProvider,
  CheckConsistencyInput,
  CheckConsistencyOutput,
  GenerateCharactersInput,
  GenerateCharactersOutput,
  GenerateChoicesInput,
  GenerateChoicesOutput,
  GenerateNextSceneInput,
  GenerateNextSceneOutput,
  GenerateOpeningSceneInput,
  GenerateOpeningSceneOutput,
  GenerateRecapInput,
  GenerateRecapOutput,
  GenerateSessionTitleInput,
  GenerateSessionTitleOutput,
  GenerateWorldInput,
  GenerateWorldOutput,
  InterpretCustomActionInput,
  InterpretCustomActionOutput,
  SummarizeTurnsInput,
  SummarizeTurnsOutput,
} from "@/server/ai/types";
import type { ZodTypeAny } from "zod";

export class StoryAiOrchestrator {
  private readonly provider: AiProvider;
  private readonly logger;

  constructor(
    provider: AiProvider = createProvider(),
    private readonly options: AiOrchestratorOptions = {},
  ) {
    this.provider = provider;
    this.logger = this.options.logger ?? consoleAiLogger;
  }

  async generateWorld(input: GenerateWorldInput) {
    return this.runTask<GenerateWorldInput, GenerateWorldOutput>(
      worldGeneratorPrompt,
      JSON_SCHEMAS.generateWorld,
      generateWorldOutputSchema,
      input,
    );
  }

  async generateCharacters(input: GenerateCharactersInput) {
    return this.runTask<GenerateCharactersInput, GenerateCharactersOutput>(
      characterGeneratorPrompt,
      JSON_SCHEMAS.generateCharacters,
      generateCharactersOutputSchema,
      input,
    );
  }

  async generateOpeningScene(input: GenerateOpeningSceneInput) {
    return this.runTask<GenerateOpeningSceneInput, GenerateOpeningSceneOutput>(
      openingSceneGeneratorPrompt,
      JSON_SCHEMAS.generateOpeningScene,
      generateOpeningSceneOutputSchema,
      input,
    );
  }

  async generateChoices(input: GenerateChoicesInput) {
    return this.runTask<GenerateChoicesInput, GenerateChoicesOutput>(
      choiceGeneratorPrompt,
      JSON_SCHEMAS.generateChoices,
      generateChoicesOutputSchema,
      input,
    );
  }

  async interpretCustomAction(input: InterpretCustomActionInput) {
    return this.runTask<InterpretCustomActionInput, InterpretCustomActionOutput>(
      customActionInterpreterPrompt,
      JSON_SCHEMAS.interpretCustomAction,
      interpretCustomActionOutputSchema,
      input,
    );
  }

  async generateNextScene(input: GenerateNextSceneInput) {
    return this.runTask<GenerateNextSceneInput, GenerateNextSceneOutput>(
      nextSceneGeneratorPrompt,
      JSON_SCHEMAS.generateNextScene,
      generateNextSceneOutputSchema,
      input,
    );
  }

  async summarizeTurns(input: SummarizeTurnsInput) {
    return this.runTask<SummarizeTurnsInput, SummarizeTurnsOutput>(
      turnSummarizerPrompt,
      JSON_SCHEMAS.summarizeTurns,
      summarizeTurnsOutputSchema,
      input,
    );
  }

  async checkConsistency(input: CheckConsistencyInput) {
    return this.runTask<CheckConsistencyInput, CheckConsistencyOutput>(
      consistencyCheckerPrompt,
      JSON_SCHEMAS.checkConsistency,
      checkConsistencyOutputSchema,
      input,
    );
  }

  async generateSessionTitle(input: GenerateSessionTitleInput) {
    return this.runTask<GenerateSessionTitleInput, GenerateSessionTitleOutput>(
      sessionTitleGeneratorPrompt,
      JSON_SCHEMAS.generateSessionTitle,
      generateSessionTitleOutputSchema,
      input,
    );
  }

  async generateRecap(input: GenerateRecapInput) {
    return this.runTask<GenerateRecapInput, GenerateRecapOutput>(
      recapGeneratorPrompt,
      JSON_SCHEMAS.generateRecap,
      generateRecapOutputSchema,
      input,
    );
  }

  private async runTask<TInput, TResult>(
    prompt: {
      task: string;
      version: `v${number}`;
      system: string;
      user: (input: TInput) => string;
      fallback: (input: TInput) => TResult;
    },
    jsonSchema: { name: string; schema: Record<string, unknown> },
    responseSchema: ZodTypeAny,
    input: TInput,
  ) {
    const startedAt = Date.now();
    const result = await this.provider.invokeStructured<TResult>({
      task: prompt.task as never,
      promptVersion: prompt.version,
      input,
      systemPrompt: prompt.system,
      userPrompt: prompt.user(input),
      jsonSchemaName: jsonSchema.name,
      jsonSchema: jsonSchema.schema,
      responseSchema: responseSchema as never,
      fallback: () => prompt.fallback(input),
      metadata: { task: prompt.task, promptVersion: prompt.version },
    });

    this.logger.info({
      requestId: result.requestId,
      provider: result.provider,
      model: result.model,
      task: result.task,
      attempts: result.attempts,
      usedFallback: result.usedFallback,
      usage: result.usage,
    });

    if (result.usedFallback) {
      this.logger.warn({
        requestId: result.requestId,
        provider: result.provider,
        task: result.task,
        message: "Structured AI output fell back after malformed or invalid responses.",
      });
    }

    await this.options.usageHook?.({
      requestId: result.requestId,
      provider: result.provider,
      model: result.model,
      task: result.task,
      usage: result.usage,
      attempts: result.attempts,
      latencyMs: Date.now() - startedAt,
      success: true,
      metadata: { promptVersion: result.promptVersion },
    });

    return result.output;
  }
}

function createProvider(): AiProvider {
  switch (env.AI_PROVIDER) {
    case "anthropic":
      return new AnthropicProvider();
    case "bootstrap":
      return new BootstrapProvider();
    case "openai":
    default:
      return new OpenAiProvider();
  }
}
