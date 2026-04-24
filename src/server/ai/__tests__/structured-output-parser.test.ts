import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  generateCharactersOutputSchema,
  generateOpeningSceneOutputSchema,
} from "@/server/ai/contracts/contracts";
import {
  MalformedJsonError,
  parseStructuredOutput,
  safeParseStructuredOutput,
} from "@/server/ai/parsers/structured-output-parser";

describe("structured-output-parser", () => {
  const schema = z.object({
    ok: z.boolean(),
    value: z.string(),
  });

  it("parses valid JSON directly", () => {
    const parsed = parseStructuredOutput('{"ok":true,"value":"hello"}', schema);
    expect(parsed.value).toBe("hello");
  });

  it("repairs fenced JSON responses", () => {
    const parsed = parseStructuredOutput('```json\n{"ok":true,"value":"fixed"}\n```', schema);
    expect(parsed.value).toBe("fixed");
  });

  it("fails gracefully when no JSON exists", () => {
    const result = safeParseStructuredOutput("not json at all", schema);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeInstanceOf(MalformedJsonError);
    }
  });

  it("accepts negative character relationship scores", () => {
    const parsed = parseStructuredOutput(
      JSON.stringify({
        characters: [
          {
            id: "rival",
            name: "Iris Vale",
            role: "Political rival",
            personality: ["calculating", "disciplined"],
            initialRelationshipScore: -42,
            statusFlags: ["rival"],
            secretsKnown: [],
            isPlayer: false,
          },
        ],
      }),
      generateCharactersOutputSchema,
      { task: "generateCharacters" },
    );

    expect(parsed.characters[0]?.initialRelationshipScore).toBe(-42);
  });

  it("repairs and clamps out-of-range relationship scores", () => {
    const parsed = parseStructuredOutput(
      JSON.stringify({
        characters: [
          {
            id: "nemesis",
            name: "Rook",
            role: "Pursuer",
            personality: ["cold"],
            initialRelationshipScore: -145.8,
            statusFlags: [],
            secretsKnown: [],
            isPlayer: false,
          },
          {
            id: "ally",
            name: "Mira",
            role: "Scout",
            personality: ["loyal"],
            initialRelationshipScore: "101",
            statusFlags: [],
            secretsKnown: [],
            isPlayer: false,
          },
        ],
      }),
      generateCharactersOutputSchema,
      { task: "generateCharacters" },
    );

    expect(parsed.characters[0]?.initialRelationshipScore).toBe(-100);
    expect(parsed.characters[1]?.initialRelationshipScore).toBe(100);
  });

  it("parses the dynamic opening-scene contract", () => {
    const parsed = parseStructuredOutput(
      JSON.stringify({
        story:
          "Bình minh giả ùa qua mái vòm đài quan sát, còn cánh cửa sắt rít lên như một lời cảnh báo.",
        coreStateUpdates: {
          currentArc: "Bình minh giả",
          gameOver: false,
          endingType: null,
        },
        dynamicStatUpdates: {
          focus: {
            delta: 2,
            reason: "Mối nguy buộc nhân vật phải chú ý hơn.",
          },
        },
        newDynamicStats: {},
        relationshipUpdates: {},
        inventoryChanges: [],
        abilityChanges: [],
        flagChanges: [],
        worldMemoryUpdates: [],
        choices: [
          {
            id: "choice_1",
            text: "Talk to the watchman",
            risk: "low",
            strategy: "Open a social path",
            hiddenImpact: "May open a social path.",
          },
          {
            id: "choice_2",
            text: "Search the lantern room",
            risk: "medium",
            strategy: "Look for hidden evidence",
            hiddenImpact: "May reveal a clue.",
          },
          {
            id: "choice_3",
            text: "Flee before the bell rings",
            risk: "high",
            strategy: "Trade position for survival",
            hiddenImpact: "May avoid capture at a cost.",
          },
        ],
      }),
      generateOpeningSceneOutputSchema,
      { task: "generateOpeningScene" },
    );

    expect(parsed.choices).toHaveLength(3);
    expect(parsed.coreStateUpdates.gameOver).toBe(false);
  });
});
