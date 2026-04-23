export const STORY_GENRES = [
  "fantasy",
  "mystery",
  "romance",
  "sci-fi",
  "horror",
  "politics",
  "school-life",
  "survival",
  "custom",
] as const;

export const SESSION_STATUSES = ["active", "paused", "completed", "archived"] as const;

export const ACTION_SOURCES = ["choice", "custom"] as const;

export const RELATIONSHIP_BUCKETS = [
  "hostile",
  "wary",
  "neutral",
  "trusted",
  "bonded",
] as const;

export const SNAPSHOT_KINDS = ["turn", "autosave", "checkpoint", "milestone"] as const;

export const SUMMARY_KINDS = ["short", "medium", "canon", "rolling"] as const;

export const ANALYTICS_EVENT_TYPES = [
  "session_created",
  "session_started",
  "session_resumed",
  "turn_played",
  "choice_selected",
  "custom_action_submitted",
  "turn_generation_latency",
  "ai_provider_usage",
  "token_usage",
  "completion_failed",
  "session_abandoned",
  "session_saved",
  "summary_generated",
  "recommendation_impression",
  "search_query_executed",
  "api_error",
] as const;

export const API_PROVIDERS = ["bootstrap", "openai", "anthropic", "internal"] as const;

export const API_USAGE_STATUSES = ["success", "error", "rate_limited", "timeout"] as const;
