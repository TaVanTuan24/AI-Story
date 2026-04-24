# Prompt Contracts

## Purpose

Prompt contracts define the boundary between the application and the model.

Each contract specifies:

- the task name
- the prompt version
- the required JSON shape
- what the model is allowed to propose
- what the engine or service layer still owns

## Shared Rules

For every structured task:

- output must be JSON only
- output must validate with Zod before use
- the application never trusts numeric updates blindly
- dynamic stat keys are sanitized before persistence
- invalid structured output is repaired when safe, retried when possible, and otherwise replaced with a deterministic fallback

## Opening And Continuation Contracts

`generateOpeningScene` and `generateNextScene` now share the same dynamic story-turn contract.

Required top-level fields:

- `story`
- `coreStateUpdates`
- `dynamicStatUpdates`
- `newDynamicStats`
- `relationshipUpdates`
- `inventoryChanges`
- `abilityChanges`
- `flagChanges`
- `worldMemoryUpdates`
- `choices`

Optional top-level fields:

- `newRelationships`

### `story`

- Long player-facing narrative
- Generated in the session story output language
- Vietnamese when the session language is `vi`

### `coreStateUpdates`

Required shape:

```json
{
  "currentArc": "optional string",
  "gameOver": false,
  "endingType": null,
  "gameRules": ["optional", "replacement", "rules"]
}
```

Notes:

- `gameOver` is always required
- `endingType` is `good`, `neutral`, `bad`, or `null`
- if `gameOver` is `true`, `choices` must be empty

### `dynamicStatUpdates`

Map of stat keys to delta objects:

```json
{
  "evidence": {
    "delta": 8,
    "reason": "The clue materially advances the investigation."
  }
}
```

Notes:

- only deltas are accepted for existing stats
- values are clamped to the stat's stored min/max
- unsupported or unsafe keys are ignored

### `newDynamicStats`

Allows the model to introduce a new stat only when strongly justified:

```json
{
  "political_debt": {
    "value": 35,
    "label": "Nợ chính trị",
    "description": "Mức độ nhân vật bị ràng buộc bởi ân tình và thỏa thuận quyền lực.",
    "min": 0,
    "max": 100
  }
}
```

Notes:

- new keys are sanitized
- values are clamped between `min` and `max`
- the engine keeps visible stat count under control and archives overflow into `worldMemory`

### `relationshipUpdates`

Map of relationship changes keyed by character id:

```json
{
  "inspector_linh": {
    "name": "Linh",
    "role": "investigator",
    "affinityDelta": 4,
    "trustDelta": -2,
    "conflictDelta": 3,
    "notes": "Linh respects the deduction but distrusts the secrecy.",
    "statusFlags": ["wary"]
  }
}
```

### `newRelationships`

Optional map of newly introduced relationship records with full stored state.

### `inventoryChanges`

String commands interpreted by the engine:

- `gain:item-id|Label|1`
- `lose:item-id|Label|1`

### `abilityChanges`

String commands interpreted by the engine:

- `gain:ability-id|Label|Description|1`
- `lose:ability-id|Label|Description|1`

### `flagChanges`

String commands interpreted by the engine:

- `add:flag-name`
- `remove:flag-name`
- bare values are treated as additive flags

### `worldMemoryUpdates`

- Short durable memory entries
- Used to preserve important world facts, consequences, and archived state

### `choices`

Each choice must include:

- `id`
- `text`
- `risk`
- `strategy`
- `hiddenImpact`

Example:

```json
[
  {
    "id": "choice_1",
    "text": "Lật lại hồ sơ niêm phong trước khi trời sáng.",
    "risk": "medium",
    "strategy": "Investigate before witnesses vanish",
    "hiddenImpact": "May uncover evidence while increasing scrutiny."
  }
]
```

Notes:

- `risk` must be `low`, `medium`, or `high`
- if the turn is not terminal, return 3 to 5 choices
- `hiddenImpact` is for the system, not direct player UI

## Other Contracts

### `generateWorld`

Produces:

- `setting`
- `worldRules`
- `playerRole`
- `conflict`
- `startingLocation`
- `seedHint`
- `contentWarnings`

### `generateCharacters`

Produces:

- `characters[]`

Each character includes:

- `id`
- `name`
- `role`
- `personality`
- `initialRelationshipScore`
- `statusFlags`
- `secretsKnown`
- `isPlayer`

`initialRelationshipScore` is an integer from `-100` to `100`.

### `generateChoices`

Produces:

- `choices[]`

Each choice includes:

- `label`
- `intent`
- `tags`

### `interpretCustomAction`

Produces:

- `normalizedText`
- `intent`
- `tags`
- `rationale`

### `summarizeTurns`

Produces:

- `short`
- `medium`
- `canon`

### `checkConsistency`

Produces:

- `valid`
- `issues[]`
- `recommendations[]`

### `story_idea_rewrite`

Produces:

- `rewrittenText`
- `suggestedGenre`
- `suggestedTone`
- `dynamicStatsPreview[]`

Each preview stat includes:

- `key`
- `label`
- `description`

## What Models May Not Own

Models may propose changes, but they do not directly own canonical persistence rules for:

- final numeric clamping
- key sanitization
- visible stat count limits
- secure session persistence
- provider routing
- retries, repair, and fallback handling
- authorization, moderation, and rate limits
