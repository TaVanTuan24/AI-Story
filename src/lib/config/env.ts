import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  APP_URL: z.url().default("http://localhost:3000"),
  MONGODB_URI: z
    .string()
    .min(1, "MONGODB_URI is required.")
    .default("mongodb://127.0.0.1:27017/ai-story"),
  AI_PROVIDER: z.enum(["bootstrap", "openai", "anthropic", "google_gemini", "xai"]).default("openai"),
  AI_ALLOW_APP_PROVIDER_FALLBACK: z
    .string()
    .optional()
    .transform((value) => value !== "false"),
  AI_MAX_RETRIES: z.coerce.number().int().min(1).max(5).default(2),
  AI_REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(120_000).default(25_000),
  AI_RETRY_BASE_DELAY_MS: z.coerce.number().int().min(50).max(10_000).default(400),
  AI_RETRY_MAX_DELAY_MS: z.coerce.number().int().min(100).max(30_000).default(4_000),
  MEMORY_SHORT_TERM_TURNS: z.coerce.number().int().min(1).max(20).default(6),
  MEMORY_SUMMARY_INTERVAL: z.coerce.number().int().min(2).max(20).default(4),
  MEMORY_ROLLING_SUMMARIES_MAX: z.coerce.number().int().min(1).max(10).default(3),
  MEMORY_CANON_FACTS_MAX: z.coerce.number().int().min(4).max(100).default(24),
  MEMORY_ENABLE_CONSISTENCY_CHECK: z
    .string()
    .optional()
    .transform((value) => value !== "false"),
  MEMORY_ENABLE_SCENE_REPAIR: z
    .string()
    .optional()
    .transform((value) => value !== "false"),
  MEMORY_MAX_REPAIR_ATTEMPTS: z.coerce.number().int().min(0).max(3).default(1),
  AUTH_SECRET: z
    .string()
    .min(16, "AUTH_SECRET must be at least 16 characters.")
    .default("dev-insecure-secret-change-me"),
  AUTH_TOKEN_TTL_HOURS: z.coerce.number().int().min(1).max(24 * 30).default(168),
  AUTH_COOKIE_NAME: z.string().min(3).max(80).default("ai-story.session"),
  AUTH_COOKIE_SECURE: z
    .string()
    .optional()
    .transform((value) => value === "true"),
  AUTH_COOKIE_SAME_SITE: z.enum(["strict", "lax", "none"]).default("lax"),
  PASSWORD_BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
  PASSWORD_PEPPER: z.string().optional(),
  AI_SETTINGS_ENCRYPTION_KEY: z
    .string()
    .min(32, "AI_SETTINGS_ENCRYPTION_KEY must be at least 32 characters.")
    .default("dev-insecure-ai-settings-key-change-me"),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).default(60_000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().min(1).default(60),
  AUTH_RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().min(1).default(10),
  GENERATION_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).default(60_000),
  GENERATION_RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().min(1).default(12),
  GENERATION_MAX_CONCURRENT_PER_ACTOR: z.coerce.number().int().min(1).max(4).default(1),
  CUSTOM_INPUT_MODERATION_COOLDOWN_MS: z.coerce.number().int().min(1000).default(300_000),
  CUSTOM_INPUT_MAX_LENGTH: z.coerce.number().int().min(100).max(4_000).default(1_000),
  REQUEST_BODY_MAX_BYTES: z.coerce.number().int().min(1_024).max(2_000_000).default(50_000),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  ADMIN_EMAILS: z
    .string()
    .optional()
    .transform((value) =>
      value
        ? value
            .split(",")
            .map((email) => email.trim().toLowerCase())
            .filter(Boolean)
        : [],
    ),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-5.4-mini"),
  OPENAI_BASE_URL: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default("claude-sonnet-4-20250514"),
  GOOGLE_GEMINI_API_KEY: z.string().optional(),
  GOOGLE_GEMINI_MODEL: z.string().default("gemini-2.5-pro"),
  XAI_API_KEY: z.string().optional(),
  XAI_MODEL: z.string().default("grok-4.20-reasoning"),
  XAI_BASE_URL: z.string().default("https://api.x.ai/v1"),
});

const parsed = envSchema.safeParse({
  NODE_ENV: process.env.NODE_ENV,
  APP_URL: process.env.APP_URL,
  MONGODB_URI: process.env.MONGODB_URI,
  AI_PROVIDER: process.env.AI_PROVIDER,
  AI_ALLOW_APP_PROVIDER_FALLBACK: process.env.AI_ALLOW_APP_PROVIDER_FALLBACK,
  AI_MAX_RETRIES: process.env.AI_MAX_RETRIES,
  AI_REQUEST_TIMEOUT_MS: process.env.AI_REQUEST_TIMEOUT_MS,
  AI_RETRY_BASE_DELAY_MS: process.env.AI_RETRY_BASE_DELAY_MS,
  AI_RETRY_MAX_DELAY_MS: process.env.AI_RETRY_MAX_DELAY_MS,
  MEMORY_SHORT_TERM_TURNS: process.env.MEMORY_SHORT_TERM_TURNS,
  MEMORY_SUMMARY_INTERVAL: process.env.MEMORY_SUMMARY_INTERVAL,
  MEMORY_ROLLING_SUMMARIES_MAX: process.env.MEMORY_ROLLING_SUMMARIES_MAX,
  MEMORY_CANON_FACTS_MAX: process.env.MEMORY_CANON_FACTS_MAX,
  MEMORY_ENABLE_CONSISTENCY_CHECK: process.env.MEMORY_ENABLE_CONSISTENCY_CHECK,
  MEMORY_ENABLE_SCENE_REPAIR: process.env.MEMORY_ENABLE_SCENE_REPAIR,
  MEMORY_MAX_REPAIR_ATTEMPTS: process.env.MEMORY_MAX_REPAIR_ATTEMPTS,
  AUTH_SECRET: process.env.AUTH_SECRET,
  AUTH_TOKEN_TTL_HOURS: process.env.AUTH_TOKEN_TTL_HOURS,
  AUTH_COOKIE_NAME: process.env.AUTH_COOKIE_NAME,
  AUTH_COOKIE_SECURE: process.env.AUTH_COOKIE_SECURE,
  AUTH_COOKIE_SAME_SITE: process.env.AUTH_COOKIE_SAME_SITE,
  PASSWORD_BCRYPT_ROUNDS: process.env.PASSWORD_BCRYPT_ROUNDS,
  PASSWORD_PEPPER: process.env.PASSWORD_PEPPER,
  AI_SETTINGS_ENCRYPTION_KEY: process.env.AI_SETTINGS_ENCRYPTION_KEY,
  RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX_REQUESTS: process.env.RATE_LIMIT_MAX_REQUESTS,
  AUTH_RATE_LIMIT_MAX_REQUESTS: process.env.AUTH_RATE_LIMIT_MAX_REQUESTS,
  GENERATION_RATE_LIMIT_WINDOW_MS: process.env.GENERATION_RATE_LIMIT_WINDOW_MS,
  GENERATION_RATE_LIMIT_MAX_REQUESTS: process.env.GENERATION_RATE_LIMIT_MAX_REQUESTS,
  GENERATION_MAX_CONCURRENT_PER_ACTOR: process.env.GENERATION_MAX_CONCURRENT_PER_ACTOR,
  CUSTOM_INPUT_MODERATION_COOLDOWN_MS: process.env.CUSTOM_INPUT_MODERATION_COOLDOWN_MS,
  CUSTOM_INPUT_MAX_LENGTH: process.env.CUSTOM_INPUT_MAX_LENGTH,
  REQUEST_BODY_MAX_BYTES: process.env.REQUEST_BODY_MAX_BYTES,
  LOG_LEVEL: process.env.LOG_LEVEL,
  ADMIN_EMAILS: process.env.ADMIN_EMAILS,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_MODEL: process.env.OPENAI_MODEL,
  OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL,
  GOOGLE_GEMINI_API_KEY: process.env.GOOGLE_GEMINI_API_KEY,
  GOOGLE_GEMINI_MODEL: process.env.GOOGLE_GEMINI_MODEL,
  XAI_API_KEY: process.env.XAI_API_KEY,
  XAI_MODEL: process.env.XAI_MODEL,
  XAI_BASE_URL: process.env.XAI_BASE_URL,
});

if (!parsed.success) {
  throw new Error(`Invalid environment variables: ${parsed.error.message}`);
}

const data = parsed.data;
const selectedProviderMissingKey =
  (data.AI_PROVIDER === "openai" && !data.OPENAI_API_KEY) ||
  (data.AI_PROVIDER === "anthropic" && !data.ANTHROPIC_API_KEY) ||
  (data.AI_PROVIDER === "google_gemini" && !data.GOOGLE_GEMINI_API_KEY) ||
  (data.AI_PROVIDER === "xai" && !data.XAI_API_KEY);
const aiProviderConfigured = data.AI_PROVIDER === "bootstrap" || !selectedProviderMissingKey;

if (
  data.NODE_ENV === "production" &&
  data.AUTH_SECRET === "dev-insecure-secret-change-me"
) {
  throw new Error("AUTH_SECRET must be changed before running in production.");
}

if (
  data.NODE_ENV === "production" &&
  data.AI_SETTINGS_ENCRYPTION_KEY === "dev-insecure-ai-settings-key-change-me"
) {
  throw new Error("AI_SETTINGS_ENCRYPTION_KEY must be changed before running in production.");
}

if (
  data.NODE_ENV !== "production" &&
  data.AI_PROVIDER !== "bootstrap" &&
  selectedProviderMissingKey &&
  process.env.AI_STORY_SUPPRESS_AI_KEY_WARNING !== "true"
) {
  console.warn(
    `[config] AI_PROVIDER=${data.AI_PROVIDER} is selected, but the matching API key is missing. Generation endpoints will return a configuration error until the key is set. Use AI_PROVIDER=bootstrap for offline development.`,
  );
}

if (
  data.NODE_ENV === "production" &&
  data.AI_PROVIDER !== "bootstrap" &&
  selectedProviderMissingKey &&
  process.env.AI_STORY_SUPPRESS_AI_KEY_WARNING !== "true"
) {
  console.warn(
    `[config] AI_PROVIDER=${data.AI_PROVIDER} is selected without an app-level API key. This is allowed when you rely on per-user encrypted keys or disable app fallback, but app-level fallback routes will fail until a provider key is configured.`,
  );
}

if (
  process.env.NEXT_PUBLIC_OPENAI_API_KEY ||
  process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY ||
  process.env.NEXT_PUBLIC_GOOGLE_GEMINI_API_KEY ||
  process.env.NEXT_PUBLIC_XAI_API_KEY ||
  process.env.NEXT_PUBLIC_AI_SETTINGS_ENCRYPTION_KEY ||
  process.env.NEXT_PUBLIC_AUTH_SECRET
) {
  throw new Error("Sensitive secrets must not be exposed through NEXT_PUBLIC_* env vars.");
}

export const env = data;
export const runtimeConfig = {
  aiProviderConfigured,
};
