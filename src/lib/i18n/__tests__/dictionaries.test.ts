import { describe, expect, it } from "vitest";

import { getDictionary } from "@/lib/i18n/dictionaries";

const mojibakePattern =
  /(?:Ã.|Ä.|Æ.|á»|áº|â€|â€¦|ðŸ|ï¸|Táº|KhÃ|ChÆ|Tiáº|ThÆ)/u;

describe("Vietnamese dictionary", () => {
  it("does not contain common mojibake sequences", () => {
    const strings = collectStrings(getDictionary("vi"));
    const corrupted = strings.filter((value) => mojibakePattern.test(value));

    expect(corrupted).toEqual([]);
  });

  it("keeps key product labels in readable Vietnamese", () => {
    const dictionary = getDictionary("vi");

    expect(dictionary.common.appTagline).toBe("Tiểu thuyết tương tác sống động");
    expect(dictionary.create.title).toBe("Tạo một thế giới có thể chơi");
    expect(dictionary.settings.aiSettings.title).toBe("Cấu hình nhà cung cấp AI");
    expect(dictionary.play.storyLanguageLabel).toBe("Ngôn ngữ truyện");
  });
});

function collectStrings(value: unknown): string[] {
  if (typeof value === "string") {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry) => collectStrings(entry));
  }

  if (value && typeof value === "object") {
    return Object.values(value).flatMap((entry) => collectStrings(entry));
  }

  return [];
}
