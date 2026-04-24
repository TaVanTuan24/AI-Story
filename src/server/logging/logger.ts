import { env } from "@/lib/config/env";

type LogLevel = "debug" | "info" | "warn" | "error";

const levelPriority: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const redactedKeys = [
  "authorization",
  "cookie",
  "token",
  "password",
  "passwordHash",
  "authSecret",
  "secret",
  "apiKey",
  "encryptedApiKey",
  "apiKeyMasked",
  "openaiApiKey",
  "anthropicApiKey",
  "googleGeminiApiKey",
  "xaiApiKey",
];

export const logger = {
  debug(event: string, payload?: Record<string, unknown>) {
    write("debug", event, payload);
  },
  info(event: string, payload?: Record<string, unknown>) {
    write("info", event, payload);
  },
  warn(event: string, payload?: Record<string, unknown>) {
    write("warn", event, payload);
  },
  error(event: string, payload?: Record<string, unknown>) {
    write("error", event, payload);
  },
};

export function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: env.NODE_ENV === "production" ? undefined : error.stack,
    };
  }

  return {
    message: String(error),
  };
}

function write(level: LogLevel, event: string, payload?: Record<string, unknown>) {
  if (levelPriority[level] < levelPriority[env.LOG_LEVEL]) {
    return;
  }

  const entry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...(redactSensitive(payload ?? {}) as Record<string, unknown>),
  };

  const line = JSON.stringify(entry);
  if (level === "error") {
    console.error(line);
    return;
  }
  if (level === "warn") {
    console.warn(line);
    return;
  }
  console.info(line);
}

function redactSensitive(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redactSensitive);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entryValue]) => [
      key,
      redactedKeys.includes(key) ? "[REDACTED]" : redactSensitive(entryValue),
    ]),
  );
}
