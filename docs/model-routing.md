# Model Routing

AI Story routes each AI task to an effective provider and model at runtime. Routing is task-aware, user-aware, and audited without logging raw API keys.

## Task Map

The canonical map from internal orchestration task to user-facing routing task lives in:

```text
src/server/ai/routing/tasks.ts
```

```ts
{
  generateWorld: "world_generation",
  generateCharacters: "character_generation",
  generateOpeningScene: "opening_scene",
  generateChoices: "choice_generation",
  interpretCustomAction: "custom_action_interpretation",
  generateNextScene: "next_scene",
  summarizeTurns: "summarization",
  checkConsistency: "consistency_check",
  generateSessionTitle: "session_title",
  generateRecap: "recap"
}
```

This keeps the responsibility of each model explicit in code and aligned with the Settings UI.

## Routing Algorithm

`ModelRoutingService.resolveRoute({ userId, task })` resolves in this order:

1. Convert the internal AI task name to the user-facing task enum.
2. If `userId` is present, load the user's encrypted AI settings.
3. Use a task-specific provider/model override when configured.
4. Otherwise use the user's global default provider and model.
5. Otherwise use the first enabled user provider with a saved encrypted key.
6. If `AI_ALLOW_APP_PROVIDER_FALLBACK=true`, use the app-level provider env vars.
7. Otherwise fail with `AI_ROUTE_NOT_CONFIGURED`.

Returned route shape:

```ts
{
  task,
  provider,
  model,
  credentials: {
    apiKey,
    baseUrl,
    headers
  },
  source,
  userId
}
```

`source` is one of:

- `task_override`
- `default_provider`
- `first_configured`
- `app_fallback`
- `bootstrap`

## Credential Loading

Credential priority:

1. User-level encrypted API key from `UserAISettings`.
2. App-level fallback env var when fallback is enabled.
3. Clear configuration error when no valid credentials exist.

Raw keys are decrypted only server-side while building the provider route. They are not returned to the frontend and are not logged.

Supported app fallback env vars:

```env
AI_ALLOW_APP_PROVIDER_FALLBACK=true
AI_PROVIDER=openai
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-5.4-mini

ANTHROPIC_API_KEY=...
ANTHROPIC_MODEL=claude-sonnet-4-20250514

GOOGLE_GEMINI_API_KEY=...
GOOGLE_GEMINI_MODEL=gemini-2.5-pro

XAI_API_KEY=...
XAI_MODEL=grok-4.20-reasoning
XAI_BASE_URL=https://api.x.ai/v1
```

Provider defaults and UI model options live in `src/lib/ai/provider-catalog.ts`.

## Story Generation Pipeline

The authenticated `userId` is passed into `StoryAiOrchestrator` from `StorySessionService`.

Generation flow:

```text
StorySessionController
  -> StorySessionService
    -> StoryAiOrchestrator(userId)
      -> ModelRoutingService.resolveRoute(userId, task)
      -> Provider instance for that route
      -> External AI API
```

Nested generation paths also receive the same routed orchestrator:

- `TurnProcessingService`
  Opening scene, next scene, and consistency checks.

- `MemoryService`
  Rolling summarization.

- `StorySessionService.getRecap`
  Recap generation.

This avoids hidden global-provider usage during long story sessions.

## Inspecting Task Ownership

Task ownership is easy to inspect in two places:

- Code:
  `src/server/ai/routing/tasks.ts` is the canonical task map.
- UI:
  `Profile > AI Settings > Model Routing` shows each task, its assigned provider, chosen model, and fallback behavior.

Example:

- `next_scene -> openai / gpt-5.4`
- `summarization -> xai / grok-3-mini`
- `consistency_check -> anthropic / claude-sonnet-4-20250514`

## Audit Logging

Every resolved route writes an audit log:

```json
{
  "event": "ai.route_selected",
  "userId": "...",
  "task": "next_scene",
  "provider": "anthropic",
  "model": "claude-sonnet-4-20250514",
  "source": "task_override",
  "hasUserCredentials": true
}
```

The log intentionally excludes raw API keys.

## Unsupported Or Unconfigured Providers

Unsupported providers are prevented by validation and enum types.

Unconfigured providers are handled as follows:

- User provider disabled or missing encrypted key:
  The route resolver skips it.

- Task override points to an unavailable provider:
  The route resolver falls back to user default or app fallback.

- No usable user provider and app fallback disabled:
  The resolver throws `AI_ROUTE_NOT_CONFIGURED`.

- App fallback selected but missing its env key:
  The resolver throws `AI_ROUTE_NOT_CONFIGURED` with provider details.

This keeps failures explicit and recoverable from the UI.

## Supported Provider Matrix

| Provider | User Keys | App Fallback | Structured JSON Path | Custom Base URL | Default Model |
| --- | --- | --- | --- | --- | --- |
| OpenAI | Yes | Yes | Shared parser + Zod validation | Yes | `gpt-5.4-mini` |
| Anthropic | Yes | Yes | Shared parser + Zod validation | No | `claude-sonnet-4-20250514` |
| Google Gemini | Yes | Yes | Shared parser + Zod validation | Yes | `gemini-2.5-pro` |
| xAI Grok | Yes | Yes | Shared parser + Zod validation | Yes | `grok-4.20-reasoning` |

xAI-specific notes are documented in `docs/providers/xai.md`.
