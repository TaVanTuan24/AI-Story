import { z } from "zod";

const actionIntentSchema = z.enum([
  "explore",
  "investigate",
  "socialize",
  "fight",
  "protect",
  "negotiate",
  "rest",
  "deceive",
  "reveal",
  "escape",
  "observe",
  "improvise",
]);

const choiceSuggestionSchema = z.object({
  label: z.string().min(1).max(240),
  intent: actionIntentSchema,
  tags: z.array(z.string().min(1).max(60)).max(8).default([]),
});

const dynamicStatDefinitionSchema = z.object({
  value: z.number().int().min(0).max(100),
  label: z.string().min(1).max(120),
  description: z.string().min(1).max(320),
  min: z.number().int().min(0).max(100),
  max: z.number().int().min(0).max(100),
});

const storyTurnCoreStateUpdateSchema = z.object({
  currentArc: z.string().min(1).max(240).optional(),
  gameOver: z.boolean(),
  endingType: z.enum(["good", "neutral", "bad"]).nullable(),
  gameRules: z.array(z.string().min(1).max(320)).max(10).optional(),
});

const storyTurnDynamicStatUpdateSchema = z.object({
  delta: z.number().int().min(-100).max(100),
  reason: z.string().min(1).max(240),
});

const storyTurnRelationshipUpdateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  role: z.string().min(1).max(160).optional(),
  affinityDelta: z.number().int().min(-100).max(100),
  trustDelta: z.number().int().min(-100).max(100),
  conflictDelta: z.number().int().min(-100).max(100),
  notes: z.string().min(1).max(240),
  statusFlags: z.array(z.string().min(1).max(80)).max(8).optional(),
});

const storyTurnRelationshipStateSchema = z.object({
  characterId: z.string().min(1).max(120),
  name: z.string().min(1).max(120),
  role: z.string().min(1).max(160),
  affinity: z.number().int().min(0).max(100),
  trust: z.number().int().min(0).max(100),
  conflict: z.number().int().min(0).max(100),
  notes: z.string().min(0).max(320),
  statusFlags: z.array(z.string().min(1).max(80)).max(8).default([]),
});

const storyTurnChoiceSchema = z.object({
  id: z.string().min(1).max(120),
  text: z.string().min(1).max(320),
  risk: z.enum(["low", "medium", "high"]),
  strategy: z.string().min(1).max(160),
  hiddenImpact: z.string().min(1).max(240),
});

const storyTurnSchema = z.object({
  story: z.string().min(1).max(20_000),
  coreStateUpdates: storyTurnCoreStateUpdateSchema,
  dynamicStatUpdates: z.record(z.string(), storyTurnDynamicStatUpdateSchema),
  newDynamicStats: z.record(z.string(), dynamicStatDefinitionSchema),
  relationshipUpdates: z.record(z.string(), storyTurnRelationshipUpdateSchema),
  newRelationships: z.record(z.string(), storyTurnRelationshipStateSchema).optional(),
  inventoryChanges: z.array(z.string().min(1).max(200)).max(12).default([]),
  abilityChanges: z.array(z.string().min(1).max(240)).max(12).default([]),
  flagChanges: z.array(z.string().min(1).max(120)).max(16).default([]),
  worldMemoryUpdates: z.array(z.string().min(1).max(400)).max(16).default([]),
  choices: z.array(storyTurnChoiceSchema).min(0).max(5),
});

export const generateWorldOutputSchema = z.object({
  setting: z.string().min(1).max(2_000),
  worldRules: z.array(z.string().min(1).max(400)).min(2).max(8),
  playerRole: z.string().min(1).max(240),
  conflict: z.string().min(1).max(2_000),
  startingLocation: z.string().min(1).max(240),
  seedHint: z.string().min(1).max(240),
  contentWarnings: z.array(z.string().min(1).max(120)).max(8).default([]),
});

export const generateCharactersOutputSchema = z.object({
  characters: z.array(
    z.object({
      id: z.string().min(1).max(120),
      name: z.string().min(1).max(120),
      role: z.string().min(1).max(200),
      personality: z.array(z.string().min(1).max(80)).min(1).max(8),
      initialRelationshipScore: z.number().int().min(-100).max(100),
      statusFlags: z.array(z.string().min(1).max(80)).max(8).default([]),
      secretsKnown: z.array(z.string().min(1).max(200)).max(8).default([]),
      isPlayer: z.boolean().default(false),
    }),
  ).min(1).max(8),
});

const sceneSchema = z.object({
  title: z.string().min(1).max(240),
  body: z.string().min(1).max(8_000),
  choices: z.array(choiceSuggestionSchema).min(3).max(4),
});

export const generateOpeningSceneOutputSchema = storyTurnSchema;

export const generateChoicesOutputSchema = z.object({
  choices: z.array(choiceSuggestionSchema).min(3).max(4),
});

export const interpretCustomActionOutputSchema = z.object({
  normalizedText: z.string().min(1).max(500),
  intent: actionIntentSchema,
  tags: z.array(z.string().min(1).max(60)).max(8).default([]),
  rationale: z.string().min(1).max(500),
});

export const generateNextSceneOutputSchema = storyTurnSchema;

export const summarizeTurnsOutputSchema = z.object({
  short: z.string().min(1).max(600),
  medium: z.string().min(1).max(1_500),
  canon: z.string().min(1).max(3_000),
  canonUpdate: z.object({
    facts: z.array(
      z.object({
        id: z.string().min(1).max(120),
        category: z.enum(["world", "character", "event", "flag"]),
        subject: z.string().min(1).max(200),
        value: z.string().min(1).max(500),
        immutable: z.boolean(),
      }),
    ).max(16),
    irreversibleEvents: z.array(z.string().min(1).max(200)).max(12),
    importantFlags: z.array(z.string().min(1).max(120)).max(12),
  }),
});

export const checkConsistencyOutputSchema = z.object({
  valid: z.boolean(),
  issues: z.array(z.string().min(1).max(500)).max(12),
  recommendations: z.array(z.string().min(1).max(500)).max(12),
});

export const generateSessionTitleOutputSchema = z.object({
  title: z.string().min(2).max(120),
  rationale: z.string().min(1).max(300),
});

export const generateRecapOutputSchema = z.object({
  recap: z.string().min(1).max(1_500),
  highlights: z.array(z.string().min(1).max(240)).min(1).max(8),
  openThreads: z.array(z.string().min(1).max(240)).max(8),
});

export const JSON_SCHEMAS = {
  generateWorld: {
    name: "generate_world",
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["setting", "worldRules", "playerRole", "conflict", "startingLocation", "seedHint", "contentWarnings"],
      properties: {
        setting: { type: "string" },
        worldRules: { type: "array", minItems: 2, maxItems: 8, items: { type: "string" } },
        playerRole: { type: "string" },
        conflict: { type: "string" },
        startingLocation: { type: "string" },
        seedHint: { type: "string" },
        contentWarnings: { type: "array", items: { type: "string" } },
      },
    },
  },
  generateCharacters: {
    name: "generate_characters",
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["characters"],
      properties: {
        characters: {
          type: "array",
          minItems: 1,
          maxItems: 8,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["id", "name", "role", "personality", "initialRelationshipScore", "statusFlags", "secretsKnown", "isPlayer"],
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              role: { type: "string" },
              personality: { type: "array", items: { type: "string" } },
              initialRelationshipScore: { type: "number" },
              statusFlags: { type: "array", items: { type: "string" } },
              secretsKnown: { type: "array", items: { type: "string" } },
              isPlayer: { type: "boolean" },
            },
          },
        },
      },
    },
  },
  generateOpeningScene: {
    name: "generate_opening_scene",
    schema: {
      type: "object",
      additionalProperties: false,
      required: [
        "story",
        "coreStateUpdates",
        "dynamicStatUpdates",
        "newDynamicStats",
        "relationshipUpdates",
        "inventoryChanges",
        "abilityChanges",
        "flagChanges",
        "worldMemoryUpdates",
        "choices",
      ],
      properties: {
        story: { type: "string" },
        coreStateUpdates: storyTurnCoreStateUpdatesJsonSchema(),
        dynamicStatUpdates: storyTurnDynamicStatUpdatesJsonSchema(),
        newDynamicStats: dynamicStatDefinitionsJsonSchema(),
        relationshipUpdates: storyTurnRelationshipUpdatesJsonSchema(),
        newRelationships: relationshipStatesJsonSchema(),
        inventoryChanges: { type: "array", items: { type: "string" } },
        abilityChanges: { type: "array", items: { type: "string" } },
        flagChanges: { type: "array", items: { type: "string" } },
        worldMemoryUpdates: { type: "array", items: { type: "string" } },
        choices: { type: "array", minItems: 0, maxItems: 5, items: storyTurnChoiceJsonSchema() },
      },
    },
  },
  generateChoices: {
    name: "generate_choices",
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["choices"],
      properties: {
        choices: { type: "array", minItems: 3, maxItems: 4, items: choiceJsonSchema() },
      },
    },
  },
  interpretCustomAction: {
    name: "interpret_custom_action",
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["normalizedText", "intent", "tags", "rationale"],
      properties: {
        normalizedText: { type: "string" },
        intent: { type: "string" },
        tags: { type: "array", items: { type: "string" } },
        rationale: { type: "string" },
      },
    },
  },
  generateNextScene: {
    name: "generate_next_scene",
    schema: {
      type: "object",
      additionalProperties: false,
      required: [
        "story",
        "coreStateUpdates",
        "dynamicStatUpdates",
        "newDynamicStats",
        "relationshipUpdates",
        "inventoryChanges",
        "abilityChanges",
        "flagChanges",
        "worldMemoryUpdates",
        "choices",
      ],
      properties: {
        story: { type: "string" },
        coreStateUpdates: storyTurnCoreStateUpdatesJsonSchema(),
        dynamicStatUpdates: storyTurnDynamicStatUpdatesJsonSchema(),
        newDynamicStats: dynamicStatDefinitionsJsonSchema(),
        relationshipUpdates: storyTurnRelationshipUpdatesJsonSchema(),
        newRelationships: relationshipStatesJsonSchema(),
        inventoryChanges: { type: "array", items: { type: "string" } },
        abilityChanges: { type: "array", items: { type: "string" } },
        flagChanges: { type: "array", items: { type: "string" } },
        worldMemoryUpdates: { type: "array", items: { type: "string" } },
        choices: { type: "array", minItems: 0, maxItems: 5, items: storyTurnChoiceJsonSchema() },
      },
    },
  },
  summarizeTurns: {
    name: "summarize_turns",
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["short", "medium", "canon", "canonUpdate"],
      properties: {
        short: { type: "string" },
        medium: { type: "string" },
        canon: { type: "string" },
        canonUpdate: {
          type: "object",
          additionalProperties: false,
          required: ["facts", "irreversibleEvents", "importantFlags"],
          properties: {
            facts: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["id", "category", "subject", "value", "immutable"],
                properties: {
                  id: { type: "string" },
                  category: { type: "string" },
                  subject: { type: "string" },
                  value: { type: "string" },
                  immutable: { type: "boolean" },
                },
              },
            },
            irreversibleEvents: { type: "array", items: { type: "string" } },
            importantFlags: { type: "array", items: { type: "string" } },
          },
        },
      },
    },
  },
  checkConsistency: {
    name: "check_consistency",
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["valid", "issues", "recommendations"],
      properties: {
        valid: { type: "boolean" },
        issues: { type: "array", items: { type: "string" } },
        recommendations: { type: "array", items: { type: "string" } },
      },
    },
  },
  generateSessionTitle: {
    name: "generate_session_title",
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["title", "rationale"],
      properties: {
        title: { type: "string" },
        rationale: { type: "string" },
      },
    },
  },
  generateRecap: {
    name: "generate_recap",
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["recap", "highlights", "openThreads"],
      properties: {
        recap: { type: "string" },
        highlights: { type: "array", items: { type: "string" } },
        openThreads: { type: "array", items: { type: "string" } },
      },
    },
  },
} as const;

function choiceJsonSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["label", "intent", "tags"],
    properties: {
      label: { type: "string" },
      intent: { type: "string" },
      tags: { type: "array", items: { type: "string" } },
    },
  };
}

function sceneJsonSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["title", "body", "choices"],
    properties: {
      title: { type: "string" },
      body: { type: "string" },
      choices: { type: "array", minItems: 3, maxItems: 4, items: choiceJsonSchema() },
    },
  };
}

function storyTurnChoiceJsonSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["id", "text", "risk", "strategy", "hiddenImpact"],
    properties: {
      id: { type: "string" },
      text: { type: "string" },
      risk: { type: "string", enum: ["low", "medium", "high"] },
      strategy: { type: "string" },
      hiddenImpact: { type: "string" },
    },
  };
}

function storyTurnCoreStateUpdatesJsonSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["gameOver", "endingType"],
    properties: {
      currentArc: { type: "string" },
      gameOver: { type: "boolean" },
      endingType: { type: ["string", "null"], enum: ["good", "neutral", "bad", null] },
      gameRules: { type: "array", items: { type: "string" } },
    },
  };
}

function storyTurnDynamicStatUpdatesJsonSchema() {
  return {
    type: "object",
    additionalProperties: {
      type: "object",
      additionalProperties: false,
      required: ["delta", "reason"],
      properties: {
        delta: { type: "number" },
        reason: { type: "string" },
      },
    },
  };
}

function dynamicStatDefinitionsJsonSchema() {
  return {
    type: "object",
    additionalProperties: {
      type: "object",
      additionalProperties: false,
      required: ["value", "label", "description", "min", "max"],
      properties: {
        value: { type: "number" },
        label: { type: "string" },
        description: { type: "string" },
        min: { type: "number" },
        max: { type: "number" },
      },
    },
  };
}

function storyTurnRelationshipUpdatesJsonSchema() {
  return {
    type: "object",
    additionalProperties: {
      type: "object",
      additionalProperties: false,
      required: ["affinityDelta", "trustDelta", "conflictDelta", "notes"],
      properties: {
        name: { type: "string" },
        role: { type: "string" },
        affinityDelta: { type: "number" },
        trustDelta: { type: "number" },
        conflictDelta: { type: "number" },
        notes: { type: "string" },
        statusFlags: { type: "array", items: { type: "string" } },
      },
    },
  };
}

function relationshipStatesJsonSchema() {
  return {
    type: "object",
    additionalProperties: {
      type: "object",
      additionalProperties: false,
      required: ["characterId", "name", "role", "affinity", "trust", "conflict", "notes", "statusFlags"],
      properties: {
        characterId: { type: "string" },
        name: { type: "string" },
        role: { type: "string" },
        affinity: { type: "number" },
        trust: { type: "number" },
        conflict: { type: "number" },
        notes: { type: "string" },
        statusFlags: { type: "array", items: { type: "string" } },
      },
    },
  };
}
