const controlCharPattern = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export function sanitizeUnknownInput(value: unknown): unknown {
  if (typeof value === "string") {
    return sanitizeText(value);
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeUnknownInput);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entryValue]) => [key, sanitizeUnknownInput(entryValue)]),
    );
  }

  return value;
}

export function sanitizeText(value: string) {
  return value
    .normalize("NFKC")
    .replace(/\r\n/g, "\n")
    .replace(controlCharPattern, "")
    .trim();
}
