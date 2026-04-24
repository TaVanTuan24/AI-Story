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
import { GoogleGeminiProvider } from "@/server/ai/providers/google-gemini-provider";
import { OpenAiProvider } from "@/server/ai/providers/openai-provider";
import { XaiProvider } from "@/server/ai/providers/xai-provider";
import { getAiTaskRuntimeProfile, resolveTaskReasoningEffort } from "@/server/ai/task-profile";
import { ModelRoutingService } from "@/server/ai/routing/model-routing-service";
import { toUserAITask } from "@/server/ai/routing/tasks";
import { AiStructuredOutputValidationError } from "@/server/ai/errors";
import type {
  AiReasoningEffort,
  AiOrchestratorOptions,
  AiProvider,
  AiRoute,
  AiTaskExecution,
  AiTaskName,
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
  private readonly logger;
  private readonly routingService: ModelRoutingService;

  constructor(
    private readonly provider?: AiProvider,
    private readonly options: AiOrchestratorOptions = {},
    routingService = new ModelRoutingService(),
  ) {
    this.logger = this.options.logger ?? consoleAiLogger;
    this.routingService = routingService;
  }

  async generateWorld(input: GenerateWorldInput) {
    return (await this.generateWorldDetailed(input)).output;
  }

  async generateWorldDetailed(input: GenerateWorldInput) {
    return this.runTask<GenerateWorldInput, GenerateWorldOutput>(
      worldGeneratorPrompt,
      JSON_SCHEMAS.generateWorld,
      generateWorldOutputSchema,
      input,
    );
  }

  async generateCharacters(input: GenerateCharactersInput) {
    return (await this.generateCharactersDetailed(input)).output;
  }

  async generateCharactersDetailed(input: GenerateCharactersInput) {
    return this.runTask<GenerateCharactersInput, GenerateCharactersOutput>(
      characterGeneratorPrompt,
      JSON_SCHEMAS.generateCharacters,
      generateCharactersOutputSchema,
      input,
    );
  }

  async generateOpeningScene(input: GenerateOpeningSceneInput) {
    return (await this.generateOpeningSceneDetailed(input)).output;
  }

  async generateOpeningSceneDetailed(input: GenerateOpeningSceneInput) {
    return this.runTask<GenerateOpeningSceneInput, GenerateOpeningSceneOutput>(
      openingSceneGeneratorPrompt,
      JSON_SCHEMAS.generateOpeningScene,
      generateOpeningSceneOutputSchema,
      input,
    );
  }

  async generateChoices(input: GenerateChoicesInput) {
    return (await this.generateChoicesDetailed(input)).output;
  }

  async generateChoicesDetailed(input: GenerateChoicesInput) {
    return this.runTask<GenerateChoicesInput, GenerateChoicesOutput>(
      choiceGeneratorPrompt,
      JSON_SCHEMAS.generateChoices,
      generateChoicesOutputSchema,
      input,
    );
  }

  async interpretCustomAction(input: InterpretCustomActionInput) {
    return (await this.interpretCustomActionDetailed(input)).output;
  }

  async interpretCustomActionDetailed(input: InterpretCustomActionInput) {
    return this.runTask<InterpretCustomActionInput, InterpretCustomActionOutput>(
      customActionInterpreterPrompt,
      JSON_SCHEMAS.interpretCustomAction,
      interpretCustomActionOutputSchema,
      input,
    );
  }

  async generateNextScene(input: GenerateNextSceneInput) {
    return (await this.generateNextSceneDetailed(input)).output;
  }

  async generateNextSceneDetailed(input: GenerateNextSceneInput) {
    return this.runTask<GenerateNextSceneInput, GenerateNextSceneOutput>(
      nextSceneGeneratorPrompt,
      JSON_SCHEMAS.generateNextScene,
      generateNextSceneOutputSchema,
      input,
    );
  }

  async summarizeTurns(input: SummarizeTurnsInput) {
    return (await this.summarizeTurnsDetailed(input)).output;
  }

  async summarizeTurnsDetailed(input: SummarizeTurnsInput) {
    return this.runTask<SummarizeTurnsInput, SummarizeTurnsOutput>(
      turnSummarizerPrompt,
      JSON_SCHEMAS.summarizeTurns,
      summarizeTurnsOutputSchema,
      input,
    );
  }

  async checkConsistency(input: CheckConsistencyInput) {
    return (await this.checkConsistencyDetailed(input)).output;
  }

  async checkConsistencyDetailed(input: CheckConsistencyInput) {
    return this.runTask<CheckConsistencyInput, CheckConsistencyOutput>(
      consistencyCheckerPrompt,
      JSON_SCHEMAS.checkConsistency,
      checkConsistencyOutputSchema,
      input,
    );
  }

  async generateSessionTitle(input: GenerateSessionTitleInput) {
    return (await this.generateSessionTitleDetailed(input)).output;
  }

  async generateSessionTitleDetailed(input: GenerateSessionTitleInput) {
    return this.runTask<GenerateSessionTitleInput, GenerateSessionTitleOutput>(
      sessionTitleGeneratorPrompt,
      JSON_SCHEMAS.generateSessionTitle,
      generateSessionTitleOutputSchema,
      input,
    );
  }

  async generateRecap(input: GenerateRecapInput) {
    return (await this.generateRecapDetailed(input)).output;
  }

  async generateRecapDetailed(input: GenerateRecapInput) {
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
  ): Promise<AiTaskExecution<TResult>> {
    const startedAt = Date.now();
    const taskName = prompt.task as AiTaskName;
    const taskProfile = getAiTaskRuntimeProfile(taskName);
    const route = this.provider
      ? this.provider.route ?? createStaticRoute(taskName, this.provider)
      : await this.routingService.resolveRoute({
          userId: this.options.userId,
          task: taskName,
        });
    const provider = this.provider ?? createProvider(route);
    const reasoningEffort = resolveTaskReasoningEffort(
      taskName,
      route.reasoningEffort,
      input,
    );
    const startedAtIso = new Date(startedAt).toISOString();

    this.logger.info({
      event: "ai.task_started",
      startedAt: startedAtIso,
      provider: route.provider,
      model: route.model,
      task: taskName,
      routeSource: route.source,
      reasoningEffort,
    });

    const result = await provider.invokeStructured<TResult>({
      task: taskName as never,
      promptVersion: prompt.version,
      input,
      systemPrompt: prompt.system,
      userPrompt: appendLanguageInstruction(prompt.user(input), input),
      jsonSchemaName: jsonSchema.name,
      jsonSchema: jsonSchema.schema,
      responseSchema: responseSchema as never,
      fallback: () => prompt.fallback(input),
      reasoningEffort,
      maxOutputTokens: taskProfile.maxOutputTokens,
      timeoutMs: taskProfile.timeoutMs,
      retryAttempts: taskProfile.retryAttempts,
      postValidateOutput: (output) => {
        validateOutputLanguage(taskName, output, input);
      },
      metadata: { task: prompt.task, promptVersion: prompt.version, startedAt: startedAtIso },
    });
    const latencyMs = Date.now() - startedAt;

    this.logger.info({
      requestId: result.requestId,
      provider: result.provider,
      model: result.model,
      task: result.task,
      attempts: result.attempts,
      usedFallback: result.usedFallback,
      usage: result.usage,
      routeSource: route.source,
      routedTask: route.task,
      reasoningEffort,
      latencyMs,
      startedAt: startedAtIso,
      endedAt: new Date(startedAt + latencyMs).toISOString(),
      retries: Math.max(0, result.attempts - 1),
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
      latencyMs,
      success: true,
      metadata: {
        promptVersion: result.promptVersion,
        routeSource: route.source,
        routedTask: route.task,
        reasoningEffort,
      },
    });

    return {
      output: result.output,
      invocation: result,
      route,
    };
  }
}

function appendLanguageInstruction<TInput>(userPrompt: string, input: TInput) {
  const language = resolveStoryOutputLanguage(input);
  if (!language) {
    return userPrompt;
  }

  const instruction =
    language === "vi"
      ? "Language requirement: all player-facing text MUST be written entirely in Vietnamese. Do not mix languages. Keep JSON keys, enum values, ids, and machine-readable fields in the required schema format."
      : "Language requirement: all player-facing text MUST be written entirely in English. Do not mix languages. Keep JSON keys, enum values, ids, and machine-readable fields in the required schema format.";

  return `${userPrompt}\n\n${instruction}`;
}

function resolveStoryOutputLanguage(input: unknown) {
  if (!input || typeof input !== "object") {
    return null;
  }

  const direct = (input as { storyOutputLanguage?: unknown }).storyOutputLanguage;
  if (direct === "en" || direct === "vi") {
    return direct;
  }

  const contextLanguage = (input as {
    contextPack?: { language?: { storyOutputLanguage?: unknown } };
  }).contextPack?.language?.storyOutputLanguage;

  return contextLanguage === "en" || contextLanguage === "vi" ? contextLanguage : null;
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

function createStaticRoute(task: AiTaskName, provider: AiProvider): AiRoute {
  return {
    task: toUserAITask(task as never),
    provider: provider.name as AiRoute["provider"],
    model: provider.defaultModel,
    source: provider.name === "bootstrap" ? "bootstrap" : "app_fallback",
  };
}

function validateOutputLanguage(
  task: AiTaskName,
  output: unknown,
  input: unknown,
) {
  const language = resolveStoryOutputLanguage(input);
  if (!language) {
    return;
  }

  const playerFacingStrings = extractPlayerFacingStrings(task, output);
  const mixed = playerFacingStrings.find((text) => isLanguageMismatch(text, language));
  if (!mixed) {
    return;
  }

  throw new AiStructuredOutputValidationError(
    "The AI returned player-facing text in the wrong language.",
    {
      task,
      expectedLanguage: language,
      sample: mixed.slice(0, 240),
    },
  );
}

function extractPlayerFacingStrings(task: AiTaskName, output: unknown): string[] {
  if (!output || typeof output !== "object") {
    return [];
  }

  switch (task) {
    case "generateWorld": {
      const value = output as {
        setting?: string;
        worldRules?: string[];
        playerRole?: string;
        conflict?: string;
        startingLocation?: string;
        contentWarnings?: string[];
      };
      return [
        value.setting,
        ...(value.worldRules ?? []),
        value.playerRole,
        value.conflict,
        value.startingLocation,
        ...(value.contentWarnings ?? []),
      ].filter(isNonEmptyString);
    }
    case "generateCharacters": {
      const value = output as {
        characters?: Array<{ role?: string; personality?: string[] }>;
      };
      return (value.characters ?? [])
        .flatMap((character) => [character.role, ...(character.personality ?? [])])
        .filter(isNonEmptyString);
    }
    case "generateOpeningScene":
    case "generateNextScene": {
      const value = output as {
        story?: string;
        worldMemoryUpdates?: string[];
        choices?: Array<{ text?: string; strategy?: string; hiddenImpact?: string }>;
      };
      return [
        value.story,
        ...(value.worldMemoryUpdates ?? []),
        ...((value.choices ?? []).flatMap((choice) => [
          choice.text,
          choice.strategy,
          choice.hiddenImpact,
        ]) as string[]),
      ].filter(isNonEmptyString);
    }
    case "generateChoices": {
      const value = output as { choices?: Array<{ label?: string }> };
      return (value.choices ?? []).map((choice) => choice.label).filter(isNonEmptyString);
    }
    case "interpretCustomAction": {
      const value = output as { normalizedText?: string; rationale?: string };
      return [value.normalizedText, value.rationale].filter(isNonEmptyString);
    }
    case "summarizeTurns": {
      const value = output as { short?: string; medium?: string; canon?: string };
      return [value.short, value.medium, value.canon].filter(isNonEmptyString);
    }
    case "generateSessionTitle": {
      const value = output as { title?: string; rationale?: string };
      return [value.title, value.rationale].filter(isNonEmptyString);
    }
    case "generateRecap": {
      const value = output as { recap?: string; highlights?: string[]; openThreads?: string[] };
      return [value.recap, ...(value.highlights ?? []), ...(value.openThreads ?? [])].filter(
        isNonEmptyString,
      );
    }
    default:
      return [];
  }
}

function isLanguageMismatch(text: string, expectedLanguage: "en" | "vi") {
  const normalized = text.toLowerCase();
  const englishSignals = countMatches(normalized, ENGLISH_SIGNAL_WORDS);
  const vietnameseSignals =
    countMatches(normalized, VIETNAMESE_SIGNAL_WORDS) + countVietnameseDiacritics(text);

  if (expectedLanguage === "en") {
    return vietnameseSignals >= 3 && vietnameseSignals > englishSignals;
  }

  return englishSignals >= 3 && englishSignals > vietnameseSignals;
}

function countMatches(text: string, signals: string[]) {
  return signals.reduce(
    (count, signal) => count + (text.includes(signal) ? 1 : 0),
    0,
  );
}

function countVietnameseDiacritics(text: string) {
  const matches = text.match(/[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/gi);
  return matches?.length ?? 0;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

const ENGLISH_SIGNAL_WORDS = [
  " the ",
  " and ",
  " with ",
  " before ",
  " after ",
  " through ",
  " story ",
  " world ",
  " choice ",
  " danger ",
  " pressure ",
  " trust ",
];

const VIETNAMESE_SIGNAL_WORDS = [
  " khong ",
  " va ",
  " nhan vat ",
  " cau chuyen ",
  " the gioi ",
  " hanh dong ",
  " ket qua ",
  " tinh huong ",
  " niem tin ",
  " ap luc ",
  " rui ro ",
];
