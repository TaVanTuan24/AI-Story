# Analytics

AI Story uses a small internal analytics layer for product and generation-health metrics. The implementation is intentionally modular so the storage-backed tracker can later be replaced or mirrored to PostHog, Segment, or another provider.

## Goals

- Track story engagement without storing sensitive story text in analytics.
- Measure AI provider latency, token usage, and failures.
- Understand session health, action mix, genre/tone demand, and abandon points.
- Keep analytics calls isolated from controllers and services through `AnalyticsTracker`.

## Event Storage

Events are stored in `AnalyticsEvent`:

- `userId`, optional ObjectId reference
- `storySessionId`, optional ObjectId reference
- `eventType`
- `eventTime`
- `properties`

AI provider usage is stored in `APIUsageLog`:

- provider and model
- operation/task name
- status
- latency
- prompt/completion/total tokens
- request id
- non-sensitive metadata

## Tracked Event Types

- `session_created`
- `session_started`
- `session_resumed`
- `session_saved`
- `session_abandoned`
- `turn_played`
- `choice_selected`
- `custom_action_submitted`
- `turn_generation_latency`
- `ai_provider_usage`
- `token_usage`
- `completion_failed`
- `summary_generated`
- `recommendation_impression`
- `search_query_executed`
- `api_error`

## Hook Locations

- `StorySessionService.createSession`
  Tracks `session_created` with genre, tone, engine preset, difficulty, length preference, and seed flags.

- `StorySessionService.startSession`
  Tracks `session_started` and first-scene `turn_generation_latency`.

- `StorySessionService.processTurn`
  Tracks `choice_selected` or `custom_action_submitted`, then `turn_played` and `turn_generation_latency`.

- `StorySessionService.resumeSession`
  Tracks `session_resumed`.

- `StorySessionService.saveSession`
  Tracks `session_saved` and a conservative `session_abandoned` signal when an active started session is paused.

- `StorySessionController`
  Tracks `completion_failed` when start, turn, custom action, or recap generation fails.

- `StoryAiOrchestrator`
  Sends provider usage into the configured `usageHook`, currently persisted by `AnalyticsService.trackAiUsage`.

## Admin Dashboard

Internal analytics are available at:

```text
/admin/analytics
```

The page fetches:

```text
GET /api/admin/analytics?days=30
```

Cards and sections include:

- sessions created
- sessions resumed
- turns played
- completion failures
- average session length
- custom action percentage vs button choice percentage
- average and p95 generation latency
- total token usage
- action mix bar chart
- abandon buckets by current turn
- most selected genres
- most selected tones
- AI provider usage table

## Admin Access

Set admin emails in environment variables:

```env
ADMIN_EMAILS=founder@example.com,ops@example.com
```

The `/admin/*` pages require an auth cookie through middleware. The admin analytics API additionally checks that the authenticated email is listed in `ADMIN_EMAILS`.

## Privacy Boundaries

Analytics should not include:

- raw custom action text
- scene body text
- full prompts
- passwords or auth tokens
- email addresses in event properties
- display names in event properties

Allowed properties should stay categorical or operational, such as genre, tone, turn number, action source, provider, model, token counts, latency, and failure code.

## Future Provider Swap

The app depends on the `AnalyticsTracker` interface, not a vendor SDK. To add PostHog later:

1. Implement a `PostHogAnalyticsProvider` with the same `track` and `trackAiUsage` methods.
2. Fan out from `AnalyticsService`, or replace the repository-backed implementation.
3. Keep the same event names and privacy rules so dashboards remain comparable.
