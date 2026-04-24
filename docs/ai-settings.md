# Per-User AI Settings

AI Story supports per-user AI provider settings so each logged-in user can bring their own API keys and model preferences. The settings flow now keeps key lifecycle state explicit, stores only encrypted secrets, and returns masked metadata for the UI.

## Supported Providers

| Provider | Label | Default Model | Notes |
| --- | --- | --- | --- |
| `openai` | OpenAI | `gpt-5.4-mini` | Balanced default for structured story generation. |
| `anthropic` | Anthropic | `claude-sonnet-4-20250514` | Strong prose and dialogue option. |
| `google_gemini` | Google Gemini | `gemini-2.5-pro` | Broad-context option for story and support tasks. |
| `xai` | xAI Grok | `grok-4.20-reasoning` | OpenAI-compatible Grok provider; see `docs/providers/xai.md`. |

The provider/model list used by the Settings UI comes from `src/lib/ai/provider-catalog.ts` and is returned by `GET /api/me/ai-settings`.

## Supported Tasks

- `world_generation`
- `character_generation`
- `opening_scene`
- `next_scene`
- `choice_generation`
- `custom_action_interpretation`
- `summarization`
- `consistency_check`
- `session_title`
- `recap`

## Stored Shape

Settings are stored as one `UserAISettings` document per user:

```ts
{
  userId: ObjectId,
  defaultProvider?: "openai" | "anthropic" | "google_gemini" | "xai",
  providers: [
    {
      provider: "openai" | "anthropic" | "google_gemini" | "xai",
      isEnabled: boolean,
      hasApiKey: boolean,
      encryptedApiKey?: string,
      apiKeyMasked?: string,
      baseUrl?: string,
      defaultModel?: string,
      taskModels: {
        [taskName]?: { model: string }
      },
      headers: {
        organizationId?: string,
        projectId?: string
      },
      createdAt: Date,
      updatedAt: Date
    }
  ],
  taskOverrides: {
    [taskName]?: {
      provider: "openai" | "anthropic" | "google_gemini" | "xai",
      model?: string
    }
  },
  createdAt: Date,
  updatedAt: Date
}
```

`encryptedApiKey` is excluded from default query selection and is never returned by API presenters. `hasApiKey` is persisted separately so the UI can truthfully show configured state without loading secrets.

## Route Contract

### `GET /api/me/ai-settings`

Requires authentication. Returns only the authenticated user's settings.

Response:

```ts
{
  data: {
    defaultProvider: ProviderName | null,
    providers: [
      {
        provider: ProviderName,
        isEnabled: boolean,
        hasApiKey: boolean,
        apiKeyMasked: string | null,
        baseUrl: string | null,
        defaultModel: string | null,
        taskModels: Partial<Record<TaskName, { model: string }>>,
        headers: {
          organizationId?: string,
          projectId?: string
        },
        updatedAt: string | null
      }
    ],
    taskOverrides: Partial<Record<TaskName, { provider: ProviderName, model?: string }>>,
    supportedProviders: ProviderName[],
    supportedTasks: TaskName[],
    providerCatalog: Record<ProviderName, {
      label: string,
      shortLabel: string,
      description: string,
      defaultModel: string,
      models: Array<{
        id: string,
        label: string,
        description: string,
        group: "flagship" | "balanced" | "reasoning" | "fast" | "economy" | "specialized",
        capabilities: Array<"storytelling" | "reasoning" | "summarization" | "consistency_check" | "fast" | "low_cost">,
        recommendedTasks: string[],
        latency: "fast" | "balanced" | "slow",
        costTier: "low" | "medium" | "high",
        isDefault?: boolean,
        isRecommended?: boolean
      }>,
      supportsStructuredJson: boolean,
      supportsCustomBaseUrl: boolean,
      defaultBaseUrl?: string
    }>,
    fallbackStrategy: string,
    updatedAt: string | null
  },
  meta: { requestId: string }
}
```

### `PATCH /api/me/ai-settings`

Requires authentication. Updates only the authenticated user's settings.

Request:

```ts
{
  defaultProvider?: ProviderName | null,
  providers?: [
    {
      provider: ProviderName,
      isEnabled?: boolean,
      newApiKey?: string,
      replaceApiKey?: boolean,
      clearApiKey?: boolean,
      baseUrl?: string | null,
      defaultModel?: string | null,
      taskModels?: Partial<Record<TaskName, { model: string }>>,
      headers?: {
        organizationId?: string | null,
        projectId?: string | null
      }
    }
  ],
  taskOverrides?: Partial<Record<TaskName, { provider: ProviderName, model?: string } | null>>
}
```

Rules:

- If `newApiKey` is omitted, the saved key is preserved.
- If `newApiKey` is provided, it replaces the saved key after encryption.
- `replaceApiKey` is an explicit client-side intent flag so the backend can distinguish “keep current key” from “replace current key”.
- If `clearApiKey` is true, the saved encrypted key is removed and `hasApiKey` becomes `false`.
- If a task override is set to `null`, that override is removed.
- `defaultProvider` can be `null` to clear the user default.
- Partial provider updates are merged safely. Omitted fields keep their current saved values.

## Encryption And Masking

API keys are encrypted with AES-256-GCM in `src/server/security/secret-encryption.ts`.

Encryption key:

```env
AI_SETTINGS_ENCRYPTION_KEY=replace-with-a-long-random-ai-settings-secret
```

Production startup fails if this value is left as the development default. The key is hashed to a 256-bit encryption key before use. Stored values use this format:

```text
v1:<iv>:<authTag>:<ciphertext>
```

The frontend receives only:

```ts
{
  hasApiKey: true,
  apiKeyMasked: "sk-****abcd"
}
```

Raw keys are accepted only on `PATCH` and are never sent back after persistence.

## Key Lifecycle

1. First save:
   - The client sends `newApiKey`.
   - The server encrypts it into `encryptedApiKey`, stores `apiKeyMasked`, and sets `hasApiKey=true`.
2. Reload:
   - The client receives only `hasApiKey=true` and the masked key.
   - The raw secret is never returned.
3. Unrelated update:
   - If `newApiKey` is omitted, the existing encrypted key is preserved.
4. Replacement:
   - The client sends `replaceApiKey=true` and a fresh `newApiKey`.
   - The server overwrites the encrypted value and refreshes the mask.
5. Removal:
   - The client sends `clearApiKey=true`.
   - The server removes the encrypted value and clears `apiKeyMasked`.

## Fallback Logic

`UserAISettingsService.resolveTaskAssignment(userId, task)` resolves generation configuration in this order:

1. Task-specific provider/model override.
2. User global default provider.
3. Provider-level task model.
4. Provider default model.
5. First enabled provider with a usable saved API key.
6. `null`, allowing the generation runtime to fall back to global server provider configuration or return a safe configuration error.

## xAI Notes

xAI is stored and routed like every other user provider. Users can enable `xai`, save an encrypted Grok API key, select a Grok model from the shared catalog, and route any supported task to that provider.

Current xAI model options in the shared catalog are:

- `grok-4.20-reasoning`
- `grok-4.20`
- `grok-4.20-multi-agent`
- `grok-4-1-fast-reasoning`
- `grok-4`
- `grok-3`
- `grok-3-mini`
- `grok-3-mini-fast`

xAI model capabilities are centralized in `src/lib/ai/provider-catalog.ts`, including task suitability such as storytelling, reasoning, summarization, consistency checking, and low-cost/fast support work.

## End-To-End Settings Flow

1. A user signs in and opens `Profile`.
2. In `Profile Preferences`, they choose interface language and story output language.
3. In `AI Settings`, they enable providers, save keys, and choose a default provider.
4. In `Model Routing`, they optionally assign a provider/model per task.
5. When a story session starts or advances, the authenticated `userId` is passed into the AI orchestrator.
6. The routing service resolves the effective provider and model for each task from that user's saved settings.
7. If no usable route exists, the UI receives a friendly configuration error instead of a silent failure.

## Example Task Ownership

Example assignment for one user:

```ts
{
  defaultProvider: "openai",
  taskOverrides: {
    next_scene: { provider: "openai", model: "gpt-5.4" },
    summarization: { provider: "xai", model: "grok-3-mini-fast" },
    consistency_check: {
      provider: "anthropic",
      model: "claude-sonnet-4-20250514"
    }
  }
}
```

That setup keeps scene writing, summarization, and consistency checking visibly separate in both code and UI.

## Security Notes

- API routes use `requireAuth`, so users can only read or write their own settings.
- Raw API keys are not logged, returned, or stored unencrypted.
- Provider settings leave room for future `organizationId`, `projectId`, or provider-specific headers.
- The profile UI treats API key fields as write-only and clears them after save.
