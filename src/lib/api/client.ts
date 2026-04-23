import { z } from "zod";

export const authUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  displayName: z.string(),
  isActive: z.boolean(),
  lastSeenAt: z.string().optional(),
});

const authResponseSchema = z.object({
  user: authUserSchema,
  token: z.string(),
});

export const sessionListItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  premise: z.string(),
  genre: z.string(),
  tone: z.string(),
  enginePreset: z.string(),
  difficulty: z.string().optional(),
  lengthPreference: z.string().optional(),
  status: z.string(),
  currentTurn: z.number(),
  currentSceneSummary: z.string(),
  lastPlayedAt: z.string(),
  latestSceneTitle: z.string().optional(),
});

const choiceSchema = z.object({
  id: z.string(),
  label: z.string(),
  intent: z.string(),
  tags: z.array(z.string()).optional(),
});

const sessionDetailSchema = sessionListItemSchema.extend({
  seedPrompt: z.string().optional(),
  world: z
    .object({
      setting: z.string(),
      worldRules: z.array(z.string()),
      playerRole: z.string(),
      conflict: z.string(),
      startingLocation: z.string(),
      seed: z.string(),
      contentWarnings: z.array(z.string()),
    })
    .optional(),
  currentScene: z
    .object({
      title: z.string(),
      body: z.string(),
      choices: z.array(choiceSchema),
    })
    .optional(),
  canonicalState: z
    .object({
      sceneSummary: z.string(),
      worldFlags: z.array(z.string()),
      questFlags: z.array(z.string()),
      inventory: z.array(
        z.object({
          id: z.string(),
          label: z.string(),
          quantity: z.number(),
          tags: z.array(z.string()),
        }),
      ),
      stats: z.record(z.string(), z.number()),
      clues: z.array(
        z.object({
          id: z.string(),
          label: z.string(),
          description: z.string(),
        }),
      ),
    })
    .optional(),
  characters: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      role: z.string(),
      relationshipScore: z.number(),
      relationshipBucket: z.string(),
      statusFlags: z.array(z.string()),
      secretsKnown: z.array(z.string()),
      isPlayer: z.boolean(),
    }),
  ),
});

const turnResponseSchema = z.object({
  session: sessionDetailSchema,
  turn: z.object({
    turnNumber: z.number(),
    sceneTitle: z.string(),
    sceneBody: z.string(),
    sceneSummary: z.string(),
    choices: z.array(choiceSchema),
  }),
  summary: z.object({
    short: z.string(),
    medium: z.string(),
    canon: z.string(),
  }),
});

const recapResponseSchema = z.object({
  recap: z.string(),
  highlights: z.array(z.string()),
  openThreads: z.array(z.string()),
});

const analyticsOverviewSchema = z.object({
  windowDays: z.number(),
  eventCounts: z.array(z.object({ eventType: z.string(), count: z.number() })),
  actionMix: z.object({
    choiceCount: z.number(),
    customActionCount: z.number(),
    customActionPercent: z.number(),
    choicePercent: z.number(),
  }),
  generationLatency: z.object({
    averageMs: z.number(),
    p95Ms: z.number(),
  }),
  aiUsage: z.array(
    z.object({
      provider: z.string(),
      model: z.string(),
      requests: z.number(),
      failures: z.number(),
      promptTokens: z.number(),
      completionTokens: z.number(),
      totalTokens: z.number(),
      averageLatencyMs: z.number(),
    }),
  ),
  sessions: z.object({
    totalSessions: z.number(),
    averageSessionLengthTurns: z.number(),
    activeSessions: z.number(),
    pausedSessions: z.number(),
  }),
  topGenres: z.array(z.object({ label: z.string(), count: z.number() })),
  topTones: z.array(z.object({ label: z.string(), count: z.number() })),
  abandonBuckets: z.array(z.object({ bucket: z.string(), count: z.number() })),
});

const historyResponseSchema = z.array(
  z.object({
    turnNumber: z.number(),
    sceneTitle: z.string().optional(),
    sceneText: z.string(),
    sceneSummary: z.string(),
    chosenAction: z.string(),
    actionSource: z.string(),
    createdAt: z.string().optional(),
  }),
);

const preferencesSchema = z.object({
  _id: z.string().optional(),
  userId: z.string().optional(),
  preferredGenres: z.array(z.string()).default([]),
  avoidedGenres: z.array(z.string()).default([]),
  preferredTones: z.array(z.string()).default([]),
  avoidedThemes: z.array(z.string()).default([]),
  customPromptHints: z.array(z.string()).default([]),
});

const meResponseSchema = z.object({
  user: authUserSchema,
  preferences: preferencesSchema,
});

type ApiEnvelope<T> = { data: T; meta: { requestId: string } };

export type AuthResponse = z.infer<typeof authResponseSchema>;
export type SessionListItem = z.infer<typeof sessionListItemSchema>;
export type SessionDetail = z.infer<typeof sessionDetailSchema>;
export type TurnResponse = z.infer<typeof turnResponseSchema>;
export type RecapResponse = z.infer<typeof recapResponseSchema>;
export type AnalyticsOverview = z.infer<typeof analyticsOverviewSchema>;
export type HistoryResponse = z.infer<typeof historyResponseSchema>;
export type Preferences = z.infer<typeof preferencesSchema>;
export type MeResponse = z.infer<typeof meResponseSchema>;

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

export async function apiRequest<T>(
  path: string,
  options: {
    method?: string;
    token?: string | null;
    body?: unknown;
    schema: z.ZodType<T>;
  },
) {
  const response = await fetch(path, {
    method: options.method ?? "GET",
    credentials: "include",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.token && options.token !== "session"
        ? { Authorization: `Bearer ${options.token}` }
        : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await response.text();
  const payload = text ? (JSON.parse(text) as Record<string, unknown>) : {};

  if (!response.ok) {
    throw new ApiClientError(
      String(payload.error ?? "Request failed."),
      response.status,
      payload.code ? String(payload.code) : undefined,
      payload.details,
    );
  }

  const parsedEnvelope = z
    .object({
      data: options.schema,
      meta: z.object({
        requestId: z.string(),
      }),
    })
    .parse(payload as ApiEnvelope<T>);

  return parsedEnvelope.data;
}

export const api = {
  register(input: { email: string; displayName: string; password: string }) {
    return apiRequest("/api/auth/register", {
      method: "POST",
      body: input,
      schema: authResponseSchema,
    });
  },
  login(input: { email: string; password: string }) {
    return apiRequest("/api/auth/login", {
      method: "POST",
      body: input,
      schema: authResponseSchema,
    });
  },
  logout() {
    return apiRequest("/api/auth/logout", {
      method: "POST",
      schema: z.object({ loggedOut: z.boolean() }),
    });
  },
  me(token?: string | null) {
    return apiRequest("/api/me", {
      token,
      schema: meResponseSchema,
    });
  },
  updatePreferences(token: string, input: Partial<Preferences>) {
    return apiRequest("/api/me/preferences", {
      method: "PATCH",
      token,
      body: input,
      schema: preferencesSchema,
    });
  },
  listSessions(token: string) {
    return apiRequest("/api/story-sessions", {
      token,
      schema: z.array(sessionListItemSchema),
    });
  },
  createSession(
    token: string,
    input: {
      titleHint?: string;
      premise: string;
      seedPrompt?: string;
      genre: string;
      tone: string;
      enginePreset: string;
      difficulty: string;
      lengthPreference: string;
      deterministic: boolean;
      seed?: string;
    },
  ) {
    return apiRequest("/api/story-sessions", {
      method: "POST",
      token,
      body: input,
      schema: sessionListItemSchema,
    });
  },
  getSession(token: string, id: string) {
    return apiRequest(`/api/story-sessions/${id}`, {
      token,
      schema: sessionDetailSchema,
    });
  },
  startSession(token: string, id: string) {
    return apiRequest(`/api/story-sessions/${id}/start`, {
      method: "POST",
      token,
      schema: sessionDetailSchema,
    });
  },
  submitChoice(token: string, id: string, choiceId: string) {
    return apiRequest(`/api/story-sessions/${id}/turn`, {
      method: "POST",
      token,
      body: { choiceId },
      schema: turnResponseSchema,
    });
  },
  submitCustomAction(token: string, id: string, customInput: string) {
    return apiRequest(`/api/story-sessions/${id}/custom-action`, {
      method: "POST",
      token,
      body: { customInput },
      schema: turnResponseSchema,
    });
  },
  saveSession(token: string, id: string) {
    return apiRequest(`/api/story-sessions/${id}/save`, {
      method: "POST",
      token,
      schema: sessionListItemSchema,
    });
  },
  resumeSession(token: string, id: string) {
    return apiRequest(`/api/story-sessions/${id}/resume`, {
      method: "POST",
      token,
      schema: sessionDetailSchema,
    });
  },
  getHistory(token: string, id: string) {
    return apiRequest(`/api/story-sessions/${id}/history`, {
      token,
      schema: historyResponseSchema,
    });
  },
  getRecap(token: string, id: string) {
    return apiRequest(`/api/story-sessions/${id}/recap`, {
      token,
      schema: recapResponseSchema,
    });
  },
  deleteSession(token: string, id: string) {
    return apiRequest(`/api/story-sessions/${id}`, {
      method: "DELETE",
      token,
      schema: z.object({ deleted: z.boolean() }),
    });
  },
  getAnalyticsOverview(token: string, days = 30) {
    return apiRequest(`/api/admin/analytics?days=${days}`, {
      token,
      schema: analyticsOverviewSchema,
    });
  },
};
