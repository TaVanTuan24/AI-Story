# Data Model

## Overview

The platform stores AI-generated fiction as a set of linked collections instead of one giant session document. This keeps hot session metadata cheap to query, preserves turn-by-turn continuity, and leaves room for future search, analytics, and recommendation systems.

## Collections

### `users`

- Stores account identity and lifecycle fields.
- Exists so one user can own many story sessions over time.
- Indexed by `email` and `isActive`.

### `storysessions`

- Stores the top-level playable session record.
- Holds `title`, `genre`, `tone`, `status`, `userId`, `currentTurn`, `currentSceneSummary`, `startTime`, and `lastPlayedAt`.
- Exists as the primary resume/search surface for dashboards and “continue story” lists.
- Indexed for common reads by `userId`, `status`, `genre`, and `lastPlayedAt`.

### `storyworlds`

- Stores the persistent world framing for a session.
- Holds `setting`, `worldRules`, `playerRole`, `conflict`, `startingLocation`, `seed`, and `storySessionId`.
- Exists so world setup remains stable and queryable without repeating it inside every turn or snapshot.

### `characterstates`

- Stores current durable character continuity for the session.
- Holds `name`, `role`, `personality`, `relationshipScore`, `relationshipBucket`, `statusFlags`, and `secretsKnown`.
- Exists so character-centric recommendation, search, and continuity checks can happen without scanning raw turn text.

### `sessionstatesnapshots`

- Stores canonical state at a specific turn or checkpoint.
- Holds the durable story state after the narrative engine resolves a turn.
- Exists so resume, rollback, branching, debugging, and continuity auditing are possible without recomputing from all turns.

### `turnlogs`

- Stores the per-turn play transcript.
- Holds `sceneText`, `sceneSummary`, `presentedChoices`, `chosenAction`, `actionSource`, and optional AI response references.
- Exists for replay, debugging, moderation, and future analytics on choice behavior.

### `storysummaries`

- Stores rolling summaries in `short`, `medium`, and `canon` forms.
- Exists to support context compression for AI prompting and future full-text search/recommendation workflows.

### `userpreferences`

- Scaffold collection for personalization.
- Holds genre likes/dislikes, tone preferences, avoided themes, and prompt hints.
- Exists so recommendations and session bootstrapping can become personalized later without reshaping the core session model.

### `analyticsevents`

- Scaffold collection for product analytics.
- Stores timestamped product events with flexible properties.
- Exists so story behavior can be measured independently from the gameplay collections.

### `apiusagelogs`

- Scaffold collection for model-provider observability and cost tracking.
- Stores provider, model, operation, latency, token usage, status, and error metadata.
- Exists so AI quality, failures, and cost can be analyzed without polluting turn logs.

## Relationships

- A `User` has many `StorySession` records.
- A `StorySession` has one `StoryWorld`.
- A `StorySession` has many `CharacterState` records.
- A `StorySession` has many `SessionStateSnapshot` records.
- A `StorySession` has many `TurnLog` records.
- A `StorySession` has many `StorySummary` records.
- A `User` may have one `UserPreference`.
- `AnalyticsEvent` and `APIUsageLog` may reference both `User` and `StorySession`.

## Why snapshots and turn logs are separate

Turn logs are an interaction transcript. Snapshots are canonical state. Keeping them separate prevents gameplay transcripts from becoming the source of truth and makes branching or rollback much safer.

## Validation strategy

- Mongoose schemas enforce persistence rules and indexes.
- Mirrored Zod schemas validate payloads before data reaches persistence.
- Shared enums keep API validation and database validation aligned.
