import { describe, expect, it } from "vitest";
import { z } from "zod";

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
    const parsed = parseStructuredOutput(
      '```json\n{"ok":true,"value":"fixed"}\n```',
      schema,
    );
    expect(parsed.value).toBe("fixed");
  });

  it("fails gracefully when no JSON exists", () => {
    const result = safeParseStructuredOutput("not json at all", schema);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeInstanceOf(MalformedJsonError);
    }
  });
});
