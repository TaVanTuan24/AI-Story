# Prompt Contracts

## Purpose

Prompt contracts define the boundary between the application and the model.

Each contract specifies:

- the task name
- the prompt version
- the required JSON shape
- what the model is allowed to produce
- what the model is explicitly not allowed to decide

## Shared rule

For every task:

- output must be JSON only
- output must validate with Zod before use
- output is advisory unless the engine or service layer promotes it

## Contracts

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
  Each item includes `id`, `name`, `role`, `personality`, `initialRelationshipScore`, `statusFlags`, `secretsKnown`, `isPlayer`

### `generateOpeningScene`

Produces:

- `scene.title`
- `scene.body`
- `scene.choices[]`
- `summaryCandidate`

### `generateChoices`

Produces:

- `choices[]`
  Each choice includes `label`, `intent`, `tags`

### `interpretCustomAction`

Produces:

- `normalizedText`
- `intent`
- `tags`
- `rationale`

### `generateNextScene`

Produces:

- `scene.title`
- `scene.body`
- `scene.choices[]`
- `summaryCandidate`

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

## What models may not do

Models may not directly author canonical:

- inventory
- flags
- stats
- clues
- relationship truth
- world-fact truth

They may mention events in prose, but the engine decides whether those events become durable state.
