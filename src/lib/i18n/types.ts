export const supportedLanguages = ["en", "vi"] as const;

export type LanguageCode = (typeof supportedLanguages)[number];

export const languageLabels: Record<LanguageCode, string> = {
  en: "English",
  vi: "Tiếng Việt",
};

export function isLanguageCode(value: unknown): value is LanguageCode {
  return typeof value === "string" && supportedLanguages.includes(value as LanguageCode);
}
