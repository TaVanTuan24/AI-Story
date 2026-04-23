# Narrative Engine

## Purpose

The narrative engine is the canonical rules layer for the platform. AI is responsible for scene prose and suggested options. The engine is responsible for durable truth.

That means:

- AI can suggest what happens next in the story text.
- AI can suggest clickable options for the player.
- AI cannot directly set inventory, flags, clues, HP, relationship scores, or world facts.
- Canonical state changes only happen through deterministic engine logic and validated deltas.

## Core responsibilities

### 1. Initialize canonical state

`NarrativeEngine.createInitialState()` creates a session-safe baseline:

- preset-specific starting stats
- world rules
- baseline facts
- empty inventory, clue list, and relationships
- initial available actions

### 2. Validate and normalize player actions

`NarrativeEngine.normalizeAction()`:

- validates clicked choices against current available actions
- trims and normalizes custom input
- maps custom actions into engine intents such as `investigate`, `socialize`, `fight`, or `reveal`

### 3. Resolve rule-driven state changes

`NarrativeEngine.prepareTurn()`:

- derives deterministic state deltas from the normalized action
- applies those deltas to canonical state
- rejects contradictions before the turn can proceed
- creates a compact context pack for the AI layer

### 4. Finalize the turn after AI prose is generated

`NarrativeEngine.finalizeTurn()`:

- accepts only scene prose and suggested options from the AI layer
- creates the next scene object
- compiles the next available action set
- writes the turn log
- returns updated canonical state plus summary candidates

## Engine presets

- `freeform`: broad genre support and light systemic pressure
- `rpg-lite`: stronger health, stamina, and danger loops
- `mystery`: clue acquisition and suspicion are emphasized
- `social-drama`: trust, influence, and emotional consequences are emphasized

## Separation from AI generation

The engine sends the AI layer a compact context pack containing:

- premise, title, tone, preset
- current scene summary
- current flags
- relevant stats
- inventory summary
- known relationships
- clue list
- normalized action

The AI layer returns:

- scene title
- scene body
- suggested options
- summary candidate

The AI layer does **not** return canonical state changes. Even if a model implies that the player found a clue or lost health in prose, that is not canonical until the engine records it.

## Contradiction handling

The engine rejects:

- adding and removing the same flag in one turn
- mutually exclusive preset flags in the same turn
- removing inventory that does not exist
- rewriting established facts without an explicit migration rule
- stat changes outside canonical bounds

## Turn flow

1. User submits a clicked choice or custom action.
2. Engine validates and normalizes the action.
3. Engine derives deterministic state deltas.
4. Engine applies deltas and produces a context pack.
5. AI generates scene prose and suggested options from that pack.
6. Engine finalizes the turn and writes canonical outputs.

## Main files

- `src/server/narrative/types.ts`
- `src/server/narrative/engine.ts`
- `src/server/narrative/turn-processing-service.ts`
- `src/server/narrative/presets.ts`
- `src/server/narrative/random.ts`
- `src/server/narrative/utils/*`
