# Memory System

## Overview

The platform now uses a 3-layer memory stack for every scene-generation request:

1. `short-term memory`
   Recent turn records only. This keeps immediate conversational and tactical continuity.
2. `rolling summary memory`
   Compact summaries generated every `MEMORY_SUMMARY_INTERVAL` turns and stored in `StorySummary`.
3. `canon memory`
   Structured facts, irreversible events, and important flags stored separately from recap prose.

The goal is to keep long sessions coherent without continuously replaying the entire story back to the model.

## Context Pack Structure

Each AI request is assembled through `src/server/memory/context-assembler.ts` into a pack shaped like:

```ts
{
  storyId,
  title,
  genre,
  tone,
  premise,
  enginePreset,
  currentTurn,
  deterministic,
  currentSceneSummary,
  worldRules,
  flags: {
    world: string[],
    quest: string[],
  },
  stats,
  inventory,
  relationships,
  clues,
  knownFacts,
  memory: {
    shortTerm: [
      { turnNumber, actionText, sceneTitle, sceneSummary }
    ],
    rollingSummaries: [
      { turnNumber, fromTurn, toTurn, content }
    ],
    canon: {
      facts: [
        { id, category, subject, value, immutable }
      ],
      irreversibleEvents: string[],
      importantFlags: string[],
    },
  },
  normalizedAction?,
  repairContext?,
  continuity: {
    protectionRules: string[],
    contradictionPolicy: string[],
    consistencyCheckEnabled: boolean,
  },
  guidance: {
    shouldRespectContinuity: true,
    stateOwnedByEngine: true,
    outputExpectations: string[],
  },
}
```

## Summary Triggering

Rolling summaries are triggered in `MemoryService.captureTurnMemory()` when:

```ts
turnNumber % MEMORY_SUMMARY_INTERVAL === 0
```

When triggered:

1. The latest summary window is collected from recent turn logs.
2. `StoryAiOrchestrator.summarizeTurns()` compresses that window.
3. A `rolling` summary row is stored in `StorySummary` with `sourceTurnRange`.
4. Structured canon updates from that summary are merged conservatively into canon memory.

Per-turn `short`, `medium`, and `canon` summary rows are still written on every turn for traceability.

## Contradiction Handling

Contradictions are handled in two different layers:

### Engine contradictions

`NarrativeEngine` still rejects impossible state transitions such as:

- adding and removing the same flag in one turn
- rewriting an existing immutable world fact
- impossible inventory removals

### Memory contradictions

Structured canon extracted from summaries never overwrites canon blindly.

Merge behavior:

1. If a canon fact is new, it is added.
2. If the same fact is re-confirmed with the same value, its `lastConfirmedTurn` is refreshed.
3. If a summary proposes a different value for an existing canon fact, the old canon wins.
4. The conflict is recorded in `memory.canon.conflicts` for debugging and future tooling.

This means recap text can drift without silently mutating hard continuity.

## Consistency Check And Repair

If `MEMORY_ENABLE_CONSISTENCY_CHECK=true`, generated continuation scenes go through:

1. scene generation
2. consistency validation via `checkConsistency`
3. optional repair retry if validation fails
4. conservative fallback scene if repair still fails

Repair retries are bounded by `MEMORY_MAX_REPAIR_ATTEMPTS`.

If `MEMORY_ENABLE_SCENE_REPAIR=false`, the system skips retries and falls back immediately after a failed check.

## Environment Variables

```env
MEMORY_SHORT_TERM_TURNS=6
MEMORY_SUMMARY_INTERVAL=4
MEMORY_ROLLING_SUMMARIES_MAX=3
MEMORY_CANON_FACTS_MAX=24
MEMORY_ENABLE_CONSISTENCY_CHECK=true
MEMORY_ENABLE_SCENE_REPAIR=true
MEMORY_MAX_REPAIR_ATTEMPTS=1
```

These tune recall depth, summary cadence, and how aggressively the system tries to repair inconsistent generations.
