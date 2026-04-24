import { buildInitialCoreState, getGenreTemplate } from "@/server/narrative/genre-templates";
import type {
  DynamicStatDefinition,
  DynamicStatMap,
  InventoryItem,
  PlayerStats,
  StoryAbility,
  StoryChoice,
  StoryRelationshipMap,
  StoryRelationshipState,
  StoryRiskLevel,
  StoryState,
  StoryWorldMemoryEntry,
} from "@/server/narrative/types";

const PLAYER_STAT_KEYS = [
  "health",
  "stamina",
  "morale",
  "trust",
  "suspicion",
  "danger",
  "stress",
  "focus",
] as const;

const MAX_VISIBLE_DYNAMIC_STATS = 10;

const LEGACY_STAT_LABELS: Record<string, { label: string; description: string }> = {
  health: {
    label: "Sức khỏe",
    description: "Khả năng chịu thương tích và tiếp tục hành động.",
  },
  stamina: {
    label: "Thể lực",
    description: "Mức năng lượng thể chất để theo đuổi hành động dài hơi.",
  },
  morale: {
    label: "Tinh thần",
    description: "Độ bền cảm xúc và ý chí khi tình thế xấu đi.",
  },
  trust: {
    label: "Niềm tin",
    description: "Mức độ người khác còn sẵn sàng tin vào nhân vật.",
  },
  suspicion: {
    label: "Nghi ngờ",
    description: "Mức độ nhân vật đang bị để ý hoặc bị xem là đáng ngờ.",
  },
  danger: {
    label: "Nguy hiểm",
    description: "Mức độ đe dọa trực tiếp đang bủa quanh nhân vật.",
  },
  stress: {
    label: "Căng thẳng",
    description: "Áp lực tinh thần và thần kinh đang tích lũy.",
  },
  focus: {
    label: "Tập trung",
    description: "Khả năng giữ đầu óc sắc bén khi xử lý tình huống.",
  },
  influence: {
    label: "Ảnh hưởng",
    description: "Khả năng tác động tới người khác hoặc cục diện.",
  },
};

export function ensureStoryStateDefaults<T extends StoryState>(state: T): T {
  const template = getGenreTemplate(state.genre);
  const inventory = normalizeInventory(
    state.inventory ?? state.canonicalState?.inventory ?? [],
  );
  const flags = uniqueStrings(
    state.flags ??
      [
        ...(state.canonicalState?.worldFlags ?? []),
        ...(state.canonicalState?.questFlags ?? []),
      ],
  );
  const storyHistory = normalizeStoryHistory(
    state.storyHistory,
    state.scenes?.map((scene) => scene.body) ?? [],
  );
  const worldMemory = normalizeWorldMemory(
    state.worldMemory,
    storyHistory,
    state.metadata?.turnCount ?? 0,
  );
  const dynamicStats = normalizeDynamicStats({
    source: state.dynamicStats,
    genre: state.genre,
    legacyStats: {
      ...(state.canonicalState?.stats ?? {}),
      ...(state.playerStats ?? {}),
    },
    worldMemory,
  });
  const relationships = normalizeRelationships(
    state.relationships,
    state.canonicalState?.relationships ?? [],
  );
  const abilities = normalizeAbilities(state.abilities);
  const playerStats = deriveLegacyPlayerStats(dynamicStats, {
    ...(state.canonicalState?.stats ?? {}),
    ...(state.playerStats ?? {}),
  });
  const normalizedCurrentScene = state.currentScene
    ? {
        ...state.currentScene,
        choices: normalizeChoices(state.currentScene.choices ?? []),
      }
    : state.currentScene;
  const normalizedScenes = (state.scenes ?? []).map((scene) => ({
    ...scene,
    choices: normalizeChoices(scene.choices ?? []),
  }));
  const normalizedTurnHistory = (state.turnHistory ?? []).map((turn) => ({
    ...turn,
    choices: normalizeChoices(turn.choices ?? []),
    risk: turn.risk ?? "medium",
    outcome: turn.outcome ?? "partial_success",
    roll: clampStat(turn.roll ?? 50),
    gameOver: Boolean(turn.gameOver),
  }));
  const gameOver =
    Boolean(state.gameOver) ||
    Boolean(state.coreState?.gameOver) ||
    state.metadata?.status === "completed" ||
    detectGameOver(dynamicStats, playerStats);
  const coreState = {
    ...buildInitialCoreState(
      state.genre,
      state.tone,
      state.metadata?.turnCount ?? normalizedTurnHistory.length,
    ),
    ...(state.coreState ?? {}),
    genre: state.genre,
    tone: state.tone,
    currentArc:
      state.coreState?.currentArc?.trim() || template.currentArc,
    turn: state.metadata?.turnCount ?? normalizedTurnHistory.length,
    gameOver,
    endingType: state.coreState?.endingType ?? null,
    gameRules:
      state.coreState?.gameRules?.filter(Boolean).length
        ? uniqueStrings(state.coreState.gameRules)
        : [...template.gameRules],
  };
  const legacyRelationships = mapRelationshipsToLegacyArray(relationships);

  return {
    ...state,
    currentScene: normalizedCurrentScene,
    scenes: normalizedScenes,
    turnHistory: normalizedTurnHistory,
    storyHistory,
    coreState,
    dynamicStats,
    relationships,
    inventory,
    abilities,
    flags,
    worldMemory,
    playerStats,
    lastChoice:
      state.lastChoice ??
      normalizedTurnHistory.at(-1)?.action.normalizedText ??
      null,
    gameOver,
    canonicalState: {
      ...state.canonicalState,
      stats: {
        ...(state.canonicalState?.stats ?? {}),
        ...Object.fromEntries(
          Object.entries(dynamicStats).map(([key, definition]) => [key, definition.value]),
        ),
        ...playerStats,
      },
      inventory,
      relationships: legacyRelationships,
      worldFlags: uniqueStrings(state.canonicalState?.worldFlags ?? flags),
      questFlags: uniqueStrings(state.canonicalState?.questFlags ?? []),
      clues: state.canonicalState?.clues ?? [],
      worldFacts: state.canonicalState?.worldFacts ?? [],
      sceneSummary: state.canonicalState?.sceneSummary ?? state.summary ?? state.premise,
    },
    metadata: {
      ...state.metadata,
      status: gameOver ? "completed" : state.metadata.status,
      storyOutputLanguage: state.metadata.storyOutputLanguage === "vi" ? "vi" : "en",
    },
  } as T;
}

export function normalizePlayerStats(source: Partial<Record<string, unknown>>): PlayerStats {
  return {
    health: normalizePlayerStat(source.health, 65),
    stamina: normalizePlayerStat(source.stamina, 60),
    morale: normalizePlayerStat(source.morale, 55),
    trust: normalizePlayerStat(source.trust, 40),
    suspicion: normalizePlayerStat(source.suspicion, 20),
    danger: normalizePlayerStat(source.danger, 15),
    stress: normalizePlayerStat(source.stress, 25),
    focus: normalizePlayerStat(source.focus, 55),
  };
}

export function applyPlayerStatDeltas(
  current: PlayerStats,
  deltas: Partial<Record<keyof PlayerStats, number>>,
): PlayerStats {
  return PLAYER_STAT_KEYS.reduce((next, key) => {
    const delta = Number.isFinite(deltas[key]) ? Number(deltas[key]) : 0;
    next[key] = clampStat(current[key] + delta);
    return next;
  }, {} as PlayerStats);
}

export function clampPlayerEffectDelta(value: unknown, fallback = 0) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return Math.max(-30, Math.min(30, Math.round(numeric)));
}

export function clampStat(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(numeric)));
}

export function clampBetween(value: unknown, min: number, max: number) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return min;
  }

  return Math.max(min, Math.min(max, Math.round(numeric)));
}

export function sanitizeStateKey(rawKey: string) {
  const cleaned = rawKey
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);

  return cleaned || "state";
}

export function normalizeChoices(choices: StoryChoice[]) {
  return choices.map((choice, index) => ({
    ...choice,
    id: choice.id || `choice_${index + 1}`,
    label: choice.label || `Choice ${index + 1}`,
    intent: choice.intent ?? "improvise",
    tags: choice.tags ?? [],
    risk: normalizeRisk(choice.risk),
    hiddenImpact: choice.hiddenImpact ?? "Story pressure shifts in uncertain ways.",
    strategy: choice.strategy?.trim() || undefined,
  }));
}

export function normalizeRisk(value: unknown): StoryRiskLevel {
  return value === "low" || value === "high" ? value : "medium";
}

export function applyInventoryChangeStrings(
  currentInventory: InventoryItem[],
  changes: string[],
) {
  let nextInventory = structuredClone(currentInventory);

  for (const rawChange of changes) {
    const parsed = parseInventoryChange(rawChange);
    if (!parsed) {
      continue;
    }

    if (parsed.direction === "gain") {
      const existing = nextInventory.find((item) => item.id === parsed.id);
      if (existing) {
        existing.quantity = Math.max(1, existing.quantity + parsed.quantity);
      } else {
        nextInventory.push({
          id: parsed.id,
          label: parsed.label,
          quantity: parsed.quantity,
          tags: ["story-item"],
        });
      }
      continue;
    }

    nextInventory = nextInventory
      .map((item) =>
        item.id === parsed.id
          ? { ...item, quantity: Math.max(0, item.quantity - parsed.quantity) }
          : item,
      )
      .filter((item) => item.quantity > 0);
  }

  return nextInventory;
}

export function applyAbilityChangeStrings(currentAbilities: StoryAbility[], changes: string[]) {
  let nextAbilities = structuredClone(currentAbilities);

  for (const rawChange of changes) {
    const parsed = parseAbilityChange(rawChange);
    if (!parsed) {
      continue;
    }

    if (parsed.direction === "gain") {
      const existing = nextAbilities.find((ability) => ability.id === parsed.id);
      if (existing) {
        existing.charges =
          typeof existing.charges === "number"
            ? Math.max(0, existing.charges + parsed.charges)
            : parsed.charges;
      } else {
        nextAbilities.push({
          id: parsed.id,
          label: parsed.label,
          description: parsed.description,
          tags: ["story-ability"],
          charges: parsed.charges,
        });
      }
      continue;
    }

    nextAbilities = nextAbilities
      .map((ability) =>
        ability.id === parsed.id
          ? {
              ...ability,
              charges:
                typeof ability.charges === "number"
                  ? Math.max(0, ability.charges - parsed.charges)
                  : 0,
            }
          : ability,
      )
      .filter((ability) => ability.id !== parsed.id || (ability.charges ?? 1) > 0);
  }

  return nextAbilities;
}

export function applyFlagStrings(currentFlags: string[], updates: string[]) {
  const next = new Set(currentFlags);

  for (const update of updates) {
    const trimmed = update.trim();
    if (!trimmed) {
      continue;
    }

    if (trimmed.startsWith("remove:")) {
      next.delete(trimmed.slice("remove:".length));
      continue;
    }

    if (trimmed.startsWith("add:")) {
      next.add(trimmed.slice("add:".length));
      continue;
    }

    next.add(trimmed);
  }

  return Array.from(next);
}

export function applyDynamicStatUpdates(
  currentStats: DynamicStatMap,
  updates: Record<string, { delta: number }>,
) {
  const nextStats = structuredClone(currentStats);

  for (const [rawKey, update] of Object.entries(updates ?? {})) {
    const key = sanitizeStateKey(rawKey);
    const existing = nextStats[key];
    if (!existing) {
      continue;
    }

    nextStats[key] = {
      ...existing,
      value: clampBetween(existing.value + Number(update.delta ?? 0), existing.min, existing.max),
    };
  }

  return nextStats;
}

export function mergeDynamicStats(
  currentStats: DynamicStatMap,
  incomingStats: DynamicStatMap,
  worldMemory: StoryWorldMemoryEntry[],
) {
  const merged: DynamicStatMap = { ...currentStats };

  for (const [rawKey, definition] of Object.entries(incomingStats ?? {})) {
    const key = sanitizeStateKey(rawKey);
    const min = Number.isFinite(definition.min) ? Number(definition.min) : 0;
    const max = Number.isFinite(definition.max) ? Number(definition.max) : 100;

    merged[key] = {
      value: clampBetween(definition.value, min, max),
      label: String(definition.label || key),
      description: String(definition.description || ""),
      min,
      max: Math.max(min, max),
    };
  }

  return limitDynamicStats(merged, worldMemory);
}

export function limitDynamicStats(
  stats: DynamicStatMap,
  worldMemory: StoryWorldMemoryEntry[],
) {
  const entries = Object.entries(stats);
  if (entries.length <= MAX_VISIBLE_DYNAMIC_STATS) {
    return stats;
  }

  const kept = entries.slice(0, MAX_VISIBLE_DYNAMIC_STATS);
  const archived = entries.slice(MAX_VISIBLE_DYNAMIC_STATS);

  for (const [key, definition] of archived) {
    worldMemory.push({
      id: `archived-stat-${key}`,
      kind: "archive",
      text: `Thống kê "${definition.label}" được lưu vào ký ức thế giới để tránh quá tải giao diện.`,
      turnNumber: 0,
    });
  }

  return Object.fromEntries(kept);
}

function normalizePlayerStat(value: unknown, fallback: number) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return clampStat(numeric);
}

function normalizeInventory(inventory: InventoryItem[]) {
  return (inventory ?? []).map((item) => ({
    id: String(item.id),
    label: String(item.label),
    quantity: Math.max(1, Number(item.quantity ?? 1)),
    tags: Array.isArray(item.tags) ? item.tags.map(String) : [],
    description: item.description ? String(item.description) : undefined,
  }));
}

function normalizeStoryHistory(existing: string[] | undefined, fallbackScenes: string[]) {
  const history = (existing && existing.length > 0 ? existing : fallbackScenes)
    .map((entry) => String(entry).trim())
    .filter(Boolean);

  return history.length > 0 ? history : [];
}

function normalizeAbilities(abilities: StoryAbility[] | undefined) {
  return (abilities ?? []).map((ability) => ({
    id: String(ability.id),
    label: String(ability.label),
    description: String(ability.description ?? ""),
    tags: Array.isArray(ability.tags) ? ability.tags.map(String) : [],
    charges:
      typeof ability.charges === "number" && Number.isFinite(ability.charges)
        ? Math.max(0, Math.round(ability.charges))
        : undefined,
  }));
}

function normalizeWorldMemory(
  existing: StoryWorldMemoryEntry[] | undefined,
  storyHistory: string[],
  currentTurn: number,
) {
  const fromExisting = (existing ?? [])
    .map((entry, index) => ({
      id: String(entry.id || `memory_${index + 1}`),
      text: String(entry.text ?? "").trim(),
      kind: entry.kind ?? "event",
      turnNumber:
        typeof entry.turnNumber === "number" && Number.isFinite(entry.turnNumber)
          ? Math.max(0, Math.round(entry.turnNumber))
          : currentTurn,
      pinned: Boolean(entry.pinned),
    }))
    .filter((entry) => entry.text.length > 0);

  if (fromExisting.length > 0) {
    return fromExisting;
  }

  return storyHistory.slice(-6).map((entry, index) => ({
    id: `history-memory-${index + 1}`,
    text: entry,
    kind: "event" as const,
    turnNumber: Math.max(0, currentTurn - (storyHistory.length - index - 1)),
  }));
}

function normalizeDynamicStats(input: {
  source: DynamicStatMap | undefined;
  genre: StoryState["genre"];
  legacyStats: Partial<Record<string, unknown>>;
  worldMemory: StoryWorldMemoryEntry[];
}) {
  const templateStats = structuredClone(getGenreTemplate(input.genre).dynamicStats);
  const explicitStats = normalizeExplicitDynamicStats(input.source);
  const legacyStats = mapLegacyStatsToDynamic(input.legacyStats);
  const merged = {
    ...templateStats,
    ...legacyStats,
    ...explicitStats,
  };

  return limitDynamicStats(merged, input.worldMemory);
}

function normalizeExplicitDynamicStats(source: DynamicStatMap | undefined) {
  const normalized: DynamicStatMap = {};

  for (const [rawKey, definition] of Object.entries(source ?? {})) {
    const key = sanitizeStateKey(rawKey);
    if (!definition || typeof definition !== "object") {
      continue;
    }

    const min = Number.isFinite(definition.min) ? Number(definition.min) : 0;
    const max = Number.isFinite(definition.max) ? Number(definition.max) : 100;

    normalized[key] = {
      value: clampBetween(definition.value, min, max),
      label: String(definition.label || key),
      description: String(definition.description || ""),
      min,
      max: Math.max(min, max),
    };
  }

  return normalized;
}

function mapLegacyStatsToDynamic(source: Partial<Record<string, unknown>>) {
  const normalized: DynamicStatMap = {};

  for (const [rawKey, rawValue] of Object.entries(source ?? {})) {
    if (!Number.isFinite(Number(rawValue))) {
      continue;
    }

    const key = sanitizeStateKey(rawKey);
    const meta = LEGACY_STAT_LABELS[key] ?? {
      label: humanizeStatKey(key),
      description: "Thống kê được kế thừa từ phiên cũ để giữ tương thích.",
    };

    normalized[key] = {
      value: clampStat(rawValue),
      label: meta.label,
      description: meta.description,
      min: 0,
      max: 100,
    };
  }

  return normalized;
}

function deriveLegacyPlayerStats(
  dynamicStats: DynamicStatMap,
  fallbackSource: Partial<Record<string, unknown>>,
): PlayerStats {
  const fallback = normalizePlayerStats(fallbackSource);

  return {
    health: pickDynamicStatValue(dynamicStats, ["health", "vitality"], fallback.health),
    stamina: pickDynamicStatValue(dynamicStats, ["stamina", "energy", "supplies"], fallback.stamina),
    morale: pickDynamicStatValue(dynamicStats, ["morale", "resolve", "happiness", "affection"], fallback.morale),
    trust: pickDynamicStatValue(dynamicStats, ["trust", "friendship", "public_trust", "crew_trust"], fallback.trust),
    suspicion: pickDynamicStatValue(dynamicStats, ["suspicion", "jealousy", "exposure"], fallback.suspicion),
    danger: pickDynamicStatValue(dynamicStats, ["danger", "threat", "threat_level", "peril"], fallback.danger),
    stress: pickDynamicStatValue(dynamicStats, ["stress", "fear", "pressure", "inner_demon"], fallback.stress),
    focus: pickDynamicStatValue(dynamicStats, ["focus", "evidence", "intel", "composure", "self_control"], fallback.focus),
  };
}

function pickDynamicStatValue(
  dynamicStats: DynamicStatMap,
  candidateKeys: string[],
  fallback: number,
) {
  for (const key of candidateKeys) {
    if (dynamicStats[key]) {
      const definition = dynamicStats[key];
      if (key === "injury") {
        return clampStat(100 - definition.value);
      }
      return clampBetween(definition.value, definition.min, definition.max);
    }
  }

  return fallback;
}

function normalizeRelationships(
  relationships: StoryRelationshipMap | undefined,
  legacyRelationships: Array<{
    characterId: string;
    label: string;
    score: number;
    flags: string[];
  }>,
) {
  const normalized: StoryRelationshipMap = {};

  for (const [rawKey, relationship] of Object.entries(relationships ?? {})) {
    const key = sanitizeStateKey(rawKey || relationship.characterId);
    normalized[key] = normalizeRelationshipEntry(relationship, key);
  }

  if (Object.keys(normalized).length > 0) {
    return normalized;
  }

  for (const relationship of legacyRelationships ?? []) {
    const key = sanitizeStateKey(relationship.characterId);
    normalized[key] = {
      characterId: relationship.characterId,
      name: relationship.label,
      role: "session-character",
      affinity: clampStat(relationship.score),
      trust: clampStat(relationship.score),
      conflict: clampStat(100 - relationship.score),
      notes: relationship.flags?.join(", ") ?? "",
      statusFlags: relationship.flags ?? [],
    };
  }

  return normalized;
}

function normalizeRelationshipEntry(
  relationship: Partial<StoryRelationshipState> & { characterId?: string },
  fallbackKey: string,
): StoryRelationshipState {
  return {
    characterId: String(relationship.characterId || fallbackKey),
    name: String(relationship.name || fallbackKey),
    role: String(relationship.role || "session-character"),
    affinity: clampStat(relationship.affinity ?? 50),
    trust: clampStat(relationship.trust ?? relationship.affinity ?? 50),
    conflict: clampStat(relationship.conflict ?? 0),
    notes: String(relationship.notes ?? ""),
    statusFlags: Array.isArray(relationship.statusFlags)
      ? relationship.statusFlags.map(String)
      : [],
  };
}

function mapRelationshipsToLegacyArray(relationships: StoryRelationshipMap) {
  return Object.values(relationships).map((relationship) => {
    const score = clampStat(
      Math.round((relationship.affinity + relationship.trust + (100 - relationship.conflict)) / 3),
    );
    return {
      characterId: relationship.characterId,
      label: relationship.name,
      score,
      level: deriveRelationshipLevel(score),
      flags: relationship.statusFlags,
    };
  });
}

function deriveRelationshipLevel(score: number) {
  if (score <= 20) {
    return "hostile" as const;
  }
  if (score <= 40) {
    return "wary" as const;
  }
  if (score <= 60) {
    return "neutral" as const;
  }
  if (score <= 80) {
    return "trusted" as const;
  }
  return "bonded" as const;
}

function detectGameOver(dynamicStats: DynamicStatMap, playerStats: PlayerStats) {
  if (playerStats.health <= 0 || playerStats.danger >= 100) {
    return true;
  }

  for (const [key, definition] of Object.entries(dynamicStats)) {
    const lowerKey = key.toLowerCase();
    if (["health", "vitality", "sanity", "resolve"].includes(lowerKey) && definition.value <= definition.min) {
      return true;
    }
    if (["injury", "danger", "threat", "threat_level", "peril", "inner_demon"].includes(lowerKey) && definition.value >= definition.max) {
      return true;
    }
  }

  return false;
}

function parseInventoryChange(rawChange: string) {
  const trimmed = rawChange.trim();
  if (!trimmed) {
    return null;
  }

  const [direction, body] = trimmed.split(":", 2);
  if (!body || (direction !== "gain" && direction !== "lose")) {
    return null;
  }

  const [idPart, labelPart, quantityPart] = body
    .split("|")
    .map((segment) => segment.trim());
  if (!idPart) {
    return null;
  }

  const label = labelPart || idPart.replace(/[-_]+/g, " ");
  const quantity = Math.max(1, Math.round(Number(quantityPart || "1")));

  return {
    direction,
    id: idPart,
    label,
    quantity,
  };
}

function parseAbilityChange(rawChange: string) {
  const trimmed = rawChange.trim();
  if (!trimmed) {
    return null;
  }

  const [direction, body] = trimmed.split(":", 2);
  if (!body || (direction !== "gain" && direction !== "lose")) {
    return null;
  }

  const [idPart, labelPart, descriptionPart, chargesPart] = body
    .split("|")
    .map((segment) => segment.trim());
  if (!idPart) {
    return null;
  }

  return {
    direction,
    id: idPart,
    label: labelPart || humanizeStatKey(idPart),
    description: descriptionPart || "",
    charges: Math.max(1, Math.round(Number(chargesPart || "1"))),
  };
}

function humanizeStatKey(value: string) {
  return value
    .split(/[_-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set((values ?? []).map((value) => value.trim()).filter(Boolean)));
}
