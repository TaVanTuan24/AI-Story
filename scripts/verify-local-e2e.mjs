import fs from "node:fs";
import path from "node:path";
import mongoose from "mongoose";

const envFile = readEnvFile(path.resolve(process.cwd(), ".env"));
const baseUrl =
  process.env.APP_URL ??
  envFile.APP_URL ??
  "http://127.0.0.1:3000";
const mongoUri =
  process.env.MONGODB_URI ??
  envFile.MONGODB_URI ??
  readIfExists(path.resolve(process.cwd(), ".tmp-mongo-uri.txt")) ??
  "mongodb://127.0.0.1:27017/ai-story";
const appLogPaths = [
  path.resolve(process.cwd(), ".tmp-app.out.log"),
  path.resolve(process.cwd(), ".next/dev/logs/next-development.log"),
];

async function main() {
  const email = `local-e2e-${Date.now()}@example.com`;
  const password = "VerySecurePassword1";
  const displayName = "Local E2E";

  const register = await api("/api/auth/register", {
    method: "POST",
    body: { email, password, displayName },
  });
  const token = register.data.token;

  await api("/api/me/preferences", {
    method: "PATCH",
    token,
    body: {
      interfaceLanguage: "en",
      storyOutputLanguage: "en",
      preferredTones: ["cinematic"],
    },
  });

  const prefsVi = await api("/api/me/preferences", {
    method: "PATCH",
    token,
    body: {
      interfaceLanguage: "vi",
      storyOutputLanguage: "vi",
      preferredTones: ["cinematic"],
    },
  });

  const aiSettingsSaved = await api("/api/me/ai-settings", {
    method: "PATCH",
    token,
    body: {
      defaultProvider: "openai",
      providers: [
        {
          provider: "openai",
          isEnabled: true,
          newApiKey: "sk-local-openai-test-1234",
          defaultModel: "gpt-5.4",
        },
        {
          provider: "xai",
          isEnabled: true,
          newApiKey: "xai-local-test-9876",
          defaultModel: "grok-4",
        },
      ],
      taskOverrides: {
        next_scene: { provider: "openai", model: "gpt-5.4" },
        summarization: { provider: "xai", model: "grok-3-mini" },
        consistency_check: { provider: "xai", model: "grok-4" },
      },
    },
  });

  const encryptedCheck = await readEncryptedSettings(register.data.user.id);

  const settingsPage = await fetch(`${baseUrl}/profile`);
  const createPage = await fetch(`${baseUrl}/story-sessions/new`);

  const routedSession = await api("/api/story-sessions", {
    method: "POST",
    token,
    body: {
      titleHint: "Routed Session",
      premise: "Mot buc thu duoc gui toi nguoi thua ke cua mot quan doc da chet.",
      genre: "mystery",
      tone: "cang thang",
      enginePreset: "mystery",
      difficulty: "standard",
      lengthPreference: "short",
      deterministic: true,
      seed: "route-check",
    },
  });

  const routedStart = await fetch(
    `${baseUrl}/api/story-sessions/${routedSession.data.id}/start`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  const routedStartBody = await routedStart.json();
  const routeLogSource = readFirstExisting(appLogPaths) ?? "";
  const routeLogCheck =
    routeLogSource.includes(
      '"task":"world_generation","provider":"openai","model":"gpt-5.4","source":"default_provider"',
    ) ||
    routeLogSource.includes(
      '\\"task\\":\\"world_generation\\",\\"provider\\":\\"openai\\",\\"model\\":\\"gpt-5.4\\",\\"source\\":\\"default_provider\\"',
    );

  await api("/api/me/ai-settings", {
    method: "PATCH",
    token,
    body: {
      defaultProvider: null,
      providers: [
        { provider: "openai", isEnabled: false, clearApiKey: true, defaultModel: null },
        { provider: "xai", isEnabled: false, clearApiKey: true, defaultModel: null },
      ],
      taskOverrides: {
        next_scene: null,
        summarization: null,
        consistency_check: null,
      },
    },
  });

  const liveSession = await api("/api/story-sessions", {
    method: "POST",
    token,
    body: {
      titleHint: "Phien Tieng Viet",
      premise: "Mot la thu ky la xuat hien giua dem mua va goi ten nguoi da mat.",
      genre: "mystery",
      tone: "am u va cang thang",
      enginePreset: "mystery",
      difficulty: "standard",
      lengthPreference: "short",
      deterministic: true,
      seed: "vi-check",
    },
  });

  const liveStart = await api(`/api/story-sessions/${liveSession.data.id}/start`, {
    method: "POST",
    token,
  });

  const liveGet = await api(`/api/story-sessions/${liveSession.data.id}`, {
    token,
  });

  const result = {
    baseUrl,
    checks: {
      profilePageOk: settingsPage.status === 200,
      createSessionPageOk: createPage.status === 200,
      preferencesPersistedVi:
        prefsVi.data.interfaceLanguage === "vi" &&
        prefsVi.data.storyOutputLanguage === "vi",
      aiSettingsSaved:
        aiSettingsSaved.data.defaultProvider === "openai" &&
        aiSettingsSaved.data.taskOverrides.next_scene?.provider === "openai" &&
        aiSettingsSaved.data.taskOverrides.summarization?.provider === "xai",
      apiKeysEncryptedAtRest:
        Boolean(encryptedCheck?.providers?.length) &&
        encryptedCheck.providers.every(
          (provider) =>
            !String(provider.encryptedApiKey ?? "").includes("local-openai-test") &&
            !String(provider.encryptedApiKey ?? "").includes("local-test-9876") &&
            String(provider.encryptedApiKey ?? "").startsWith("v1:"),
        ),
      routeSelectionObservedInLogs: Boolean(routeLogCheck),
      routedStartFailsWithoutRealKeys: routedStart.status === 503,
      routedStartErrorCode: routedStartBody.code ?? null,
      storyLanguagePersisted:
        liveSession.data.storyOutputLanguage === "vi" &&
        liveGet.data.storyOutputLanguage === "vi",
      generatedStoryReturnedInVietnameseMode:
        liveStart.data?.storyOutputLanguage === "vi" &&
        /Mo dau|Nhan vat|Cau chuyen|Tinh huong|Luot/i.test(
          liveStart.data?.currentScene?.body ?? "",
        ),
      liveStartStatus: liveStart.status ?? null,
      liveStartErrorCode: liveStart.code ?? null,
    },
  };

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

async function api(endpoint, options = {}) {
  const response = await fetch(`${baseUrl}${endpoint}`, {
    method: options.method ?? "GET",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const payload = await response.json();
  if (!response.ok) {
    return payload;
  }
  return payload;
}

async function readEncryptedSettings(userId) {
  const settingsSchema = new mongoose.Schema(
    {
      userId: mongoose.Schema.Types.ObjectId,
      providers: [
        new mongoose.Schema(
          {
            provider: String,
            encryptedApiKey: String,
            isEnabled: Boolean,
          },
          { _id: false },
        ),
      ],
    },
    { strict: false, collection: "useraisettings" },
  );

  const Settings =
    mongoose.models.LocalVerifyUserAISettings ??
    mongoose.model("LocalVerifyUserAISettings", settingsSchema);

  await mongoose.connect(mongoUri, { dbName: "ai-story" });
  try {
    return await Settings.findOne({ userId }).lean();
  } finally {
    await mongoose.disconnect();
  }
}

function readIfExists(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : null;
}

function readFirstExisting(filePaths) {
  for (const filePath of filePaths) {
    const content = readIfExists(filePath);
    if (content) {
      return content;
    }
  }

  return null;
}

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  return Object.fromEntries(
    fs
      .readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const [key, ...rest] = line.split("=");
        return [key, rest.join("=")];
      }),
  );
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exit(1);
});
