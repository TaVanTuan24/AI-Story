# xAI Grok Provider

AI Story supports xAI through the same provider abstraction used by OpenAI, Anthropic, Gemini, and the local bootstrap provider.

## Architecture

- Provider implementation: `src/server/ai/providers/xai-provider.ts`
- Shared provider/model catalog: `src/lib/ai/provider-catalog.ts`
- Routing entry point: `src/server/ai/routing/model-routing-service.ts`
- Settings storage: `UserAISettings.providers[]` with `provider: "xai"`

xAI routes are resolved per task like every other provider:

```text
task override -> user default -> first configured user provider -> app fallback
```

## Configuration

User-level configuration is preferred. A user can save an xAI API key in Settings, enable xAI, select a default Grok model, and assign xAI to any narrative task.

App-level fallback configuration:

```env
AI_PROVIDER=xai
XAI_API_KEY=...
XAI_MODEL=grok-4.20-reasoning
XAI_BASE_URL=https://api.x.ai/v1
```

`XAI_BASE_URL` defaults to `https://api.x.ai/v1` and is useful for compatible proxies or regional routing.

## API Convention

AI Story uses xAI's inference API convention through the OpenAI-compatible chat completions surface. These are inference keys, not xAI management API credentials.

The provider stores user keys in the same encrypted per-user settings path as the other hosted providers and passes them only when constructing the runtime route.

## Shared Model Catalog

xAI model choices are centralized in `src/lib/ai/provider-catalog.ts`. The catalog stores:

- model id
- UI label
- short description
- model group
- capabilities
- recommended tasks
- latency tier
- cost tier
- recommended/default markers

Current xAI entries in the app catalog are:

- `grok-4.20-reasoning`
- `grok-4.20`
- `grok-4.20-multi-agent`
- `grok-4-1-fast-reasoning`
- `grok-4`
- `grok-3`
- `grok-3-mini`
- `grok-3-mini-fast`

Typical suitability mapping:

- Storytelling:
  `grok-4.20-reasoning`, `grok-4.20`, `grok-4`
- Reasoning / consistency:
  `grok-4.20-reasoning`, `grok-4.20-multi-agent`, `grok-4-1-fast-reasoning`
- Summaries / lower-cost helpers:
  `grok-3-mini`, `grok-3-mini-fast`

The settings API still accepts future model aliases that match the safe model-name pattern, so the app does not need a deploy for every provider-side model release.

## Provider-Specific Quirks

- xAI exposes an OpenAI-compatible chat completions API, so `XaiProvider` reuses the OpenAI SDK with `baseURL`.
- Structured JSON generation uses the shared structured-output parser and Zod validation path.
- The request asks for `response_format: { type: "json_object" }` and then validates the returned JSON against the task schema.
- Reasoning Grok models may reject unsupported tuning parameters. The provider intentionally does not send `presencePenalty`, `frequencyPenalty`, `stop`, or `reasoning_effort`.
- Model availability can vary by account. If a model is unavailable, the provider error is wrapped as a graceful generation failure and surfaced through the existing fallback/error UI.

## Logging And Safety

Route audit logs include:

- provider: `xai`
- model
- task
- route source

Raw API keys are never logged. User keys are encrypted at rest and decrypted only server-side when constructing the route.

## References

- xAI API introduction: https://docs.x.ai/docs/introduction
- xAI text generation guide: https://docs.x.ai/docs/guides/chat
- xAI model listing API: https://docs.x.ai/developers/rest-api-reference/inference/models
- xAI model notes: https://docs.x.ai/docs/models
