# Settings UI

The player-facing AI settings UI lives under:

```text
/profile
```

It uses the real authenticated API routes:

```text
GET /api/me/ai-settings
PATCH /api/me/ai-settings
```

No mock state is used for persistence.

## Page Structure

The profile page contains:

- `PreferencesForm`
  User story taste preferences such as genres, tones, avoided themes, and prompt hints.
- `AISettingsForm`
  Provider setup, key lifecycle controls, default model selection, task routing, and language guidance.

`AISettingsForm` is organized into four tabs:

- `General`
  Shows default provider/model, configured provider count, and the fallback order.
- `AI Providers`
  Shows one provider card each for OpenAI, Anthropic, Google Gemini, and xAI.
- `Model Routing`
  Splits tasks into storytelling and support groups and explains why a model fits each task.
- `Language`
  Explains interface language versus story output language.

## Provider Setup UX

Each provider card includes:

- enable/disable toggle
- masked saved key display, for example `sk-****abcd`
- write-only API key input
- clear saved key action with confirmation
- explicit key state:
  - `Not configured`
  - `Configured`
  - `New key not saved yet`
- helper text explaining:
  - leave blank to keep the current key
  - paste a new key to replace it
  - use clear to remove it
- default model dropdown
- optional base URL input
- field-level validation feedback when a provider is selected without a usable saved key

Model dropdowns are disabled until a provider is enabled and has either a saved key or a newly typed key that will be saved.

## Task Routing UX

The model routing tab separates responsibilities:

- Storytelling tasks
  World generation, character generation, opening scene, next scene, and choice generation.
- Support tasks
  Custom action interpretation, summarization, consistency check, session title, and recap.

Each task card includes:

- title and concise description
- recommended model type
- task badges such as `Primary Task`, `Background Task`, and `Performance Critical`
- quick signals like `🎭`, `🧠`, `⚡`, and `💰`
- provider dropdown
- model dropdown
- selected model details when the chosen model is known in the shared catalog
- fallback explanation when unset
- field-level validation feedback if the selected provider is not actually usable

If a task is not explicitly assigned, the UI says it falls back to the default provider/model. If no default provider is selected, it falls back to the server default.

## Secret Safety

The UI never receives raw saved API keys. After saving, key inputs are cleared and the API returns only:

```ts
{
  hasApiKey: true,
  apiKeyMasked: "sk-****abcd"
}
```

The UI uses explicit save intent:

- `newApiKey`
- `replaceApiKey`
- `clearApiKey`

Blank inputs do not overwrite existing saved keys.

## xAI Model Presentation

xAI models are rendered from the shared provider catalog and grouped logically in dropdowns, for example:

- reasoning
- flagship
- fast
- economy
- specialized

The catalog also carries suitability metadata so the UI can make clearer recommendations for:

- storytelling
- reasoning
- summarization
- consistency checking
- fast / low-cost tasks

## Production Notes

- The settings UI is desktop-first, with cards and grids that collapse on smaller screens.
- Save state is visible in the sticky footer.
- Error text is shown beside the save action and through the toast provider.
- Provider and task routing controls are disabled when a provider has no usable key, reducing accidental broken routes.
