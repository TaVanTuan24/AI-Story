# AI Orchestration

## Overview

The AI orchestration layer is responsible for calling external model providers and translating model output into validated, structured application data.

It is **not** the source of truth for canonical story state.

The rule is:

- AI writes narrative text, world flavor, summaries, and suggested options.
- The narrative engine owns inventory, flags, clues, stats, relationships, and world facts.
- Every AI response is treated as untrusted until it is parsed and validated with Zod.

## Provider architecture

### Main components

- `src/server/ai/ai-orchestrator.ts`
  Orchestrates task-level AI calls such as world generation and next-scene generation.
- `src/server/ai/providers/base-provider.ts`
  Shared retry, parse, and fallback behavior.
- `src/server/ai/providers/openai-provider.ts`
  Default provider using the OpenAI Responses API with JSON schema output.
- `src/server/ai/providers/anthropic-provider.ts`
  Placeholder-compatible provider with the same task interface.
- `src/server/ai/providers/bootstrap-provider.ts`
  Local structured fallback provider for development and resilience.

### Provider selection

Provider switching is controlled by `AI_PROVIDER`:

- `openai`
- `anthropic`
- `bootstrap`

OpenAI is the default provider.

## Supported AI tasks

- `generateWorld`
- `generateCharacters`
- `generateOpeningScene`
- `generateChoices`
- `interpretCustomAction`
- `generateNextScene`
- `summarizeTurns`
- `checkConsistency`

Each task has:

- a prompt module
- a JSON contract
- a Zod validator
- a fallback payload

## Request lifecycle

1. The orchestrator selects a provider from env configuration.
2. A task-specific prompt builder creates system and user prompts.
3. The provider requests structured JSON from the model.
4. The raw response is parsed and validated with Zod.
5. If parsing fails, the provider retries.
6. If retries are exhausted, the provider returns a safe structured fallback.
7. The orchestrator logs the request id, task, provider, model, attempts, and usage.

## Malformed output handling

Malformed output is handled in three steps:

1. Direct JSON parse.
2. Best-effort repair by extracting fenced or embedded JSON.
3. Retry and then deterministic fallback if the response still fails validation.

This keeps the app resilient while ensuring invalid model output never becomes trusted application data.

## Token usage tracking

Providers capture usage metadata when available.

The orchestrator exposes a `usageHook` for future persistence into `APIUsageLog` or analytics pipelines without coupling the AI runtime directly to the database layer.

## Provider-specific notes

- OpenAI currently uses strict JSON schema output.
- Anthropic is scaffolded behind the same abstraction, but provider-specific structured-output tuning may still be needed as models evolve.
- Model names are centralized in env config rather than scattered across task modules.
