import { ZodError, type z } from "zod";

export class MalformedJsonError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MalformedJsonError";
  }
}

export function parseStructuredOutput<T>(
  rawText: string,
  schema: z.ZodType<T>,
): T {
  const parsedJson = parseJsonWithRepair(rawText);
  return schema.parse(parsedJson);
}

export function safeParseStructuredOutput<T>(
  rawText: string,
  schema: z.ZodType<T>,
): { success: true; data: T } | { success: false; error: Error } {
  try {
    return { success: true, data: parseStructuredOutput(rawText, schema) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error("Unknown parse error."),
    };
  }
}

function parseJsonWithRepair(rawText: string) {
  const trimmed = rawText.trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    const extracted = extractLikelyJson(trimmed);

    if (!extracted) {
      throw new MalformedJsonError("Model response did not contain valid JSON.");
    }

    try {
      return JSON.parse(extracted);
    } catch {
      throw new MalformedJsonError("Unable to repair malformed JSON response.");
    }
  }
}

function extractLikelyJson(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  const objectStart = text.indexOf("{");
  const objectEnd = text.lastIndexOf("}");
  if (objectStart >= 0 && objectEnd > objectStart) {
    return text.slice(objectStart, objectEnd + 1);
  }

  const arrayStart = text.indexOf("[");
  const arrayEnd = text.lastIndexOf("]");
  if (arrayStart >= 0 && arrayEnd > arrayStart) {
    return text.slice(arrayStart, arrayEnd + 1);
  }

  return null;
}

export function isValidationError(error: unknown) {
  return error instanceof ZodError;
}
