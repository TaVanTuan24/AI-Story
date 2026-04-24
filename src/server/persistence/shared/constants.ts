export const STORY_GENRES = [
  "fantasy",
  "mystery",
  "romance",
  "xianxia",
  "sci-fi",
  "horror",
  "historical",
  "politics",
  "school-life",
  "slice-of-life",
  "survival",
  "adventure",
  "drama",
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

export const API_PROVIDERS = [
  "bootstrap",
  "openai",
  "anthropic",
  "google_gemini",
  "xai",
  "internal",
] as const;

export const API_USAGE_STATUSES = ["success", "error", "rate_limited", "timeout"] as const;

export const USER_AI_PROVIDERS = [
  "openai",
  "anthropic",
  "google_gemini",
  "xai",
] as const;

export const USER_AI_TASKS = [
  "world_generation",
  "character_generation",
  "opening_scene",
  "next_scene",
  "choice_generation",
  "custom_action_interpretation",
  "summarization",
  "consistency_check",
  "session_title",
  "recap",
] as const;

export const INTERFACE_LANGUAGES = ["en", "vi"] as const;

export const STORY_OUTPUT_LANGUAGES = ["en", "vi"] as const;

export const AI_REASONING_EFFORTS = ["low", "medium", "high"] as const;

export const APP_THEMES = ["light", "dark", "system"] as const;
