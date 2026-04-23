import fs from "node:fs";
import path from "node:path";

export const demoSeeds = JSON.parse(
  fs.readFileSync(
    path.resolve(process.cwd(), "src/features/story/demo-seeds.json"),
    "utf8",
  ),
);

export async function loadDotEnv() {
  const envPath = path.resolve(process.cwd(), ".env");

  if (!fs.existsSync(envPath)) {
    return;
  }

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const [key, ...rawValue] = trimmed.split("=");
    if (!process.env[key]) {
      process.env[key] = rawValue.join("=").replace(/^["']|["']$/g, "");
    }
  }
}

export function extractSearchKeywords(premise) {
  return Array.from(
    new Set(
      premise
        .toLowerCase()
        .split(/[^a-z0-9]+/i)
        .filter((word) => word.length >= 4)
        .slice(0, 12),
    ),
  );
}
