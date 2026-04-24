"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import { useToast } from "@/components/providers/toast-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { StatusPill } from "@/components/ui/status-pill";
import {
  api,
  ApiClientError,
  type AIProviderName,
  type AISettings,
  type AITaskName,
} from "@/lib/api/client";
import {
  AI_PROVIDER_CATALOG,
  isModelSuitableForTask,
  sortModelsForTask,
  type AIModelCatalogEntry,
} from "@/lib/ai/provider-catalog";
import { cn } from "@/lib/utils/cn";

type SettingsTab = "general" | "providers" | "routing" | "language";
type Translate = (key: string, fallback?: string) => string;
type TaskGroupName = "storytelling" | "support";
type TaskBadgeName = "primary" | "background" | "performance";
type TaskSignalName = "storytelling" | "system" | "reasoning" | "fast" | "cost";

type ProviderDraft = {
  provider: AIProviderName;
  isEnabled: boolean;
  hasSavedKey: boolean;
  apiKey: string;
  replaceApiKey: boolean;
  clearApiKey: boolean;
  baseUrl: string;
  defaultModel: string;
  reasoningEffort: "low" | "medium" | "high";
};

type TaskAssignment = {
  provider: AIProviderName | "";
  model: string;
};

type TaskPresentation = {
  icon: string;
  group: TaskGroupName;
  badges: TaskBadgeName[];
  signals: TaskSignalName[];
};

const fallbackProviderCatalog = Object.fromEntries(
  Object.entries(AI_PROVIDER_CATALOG).map(([provider, metadata]) => [
    provider,
    {
      ...metadata,
      models: metadata.models.map((modelOption) => ({ ...modelOption })),
    },
  ]),
) as AISettings["providerCatalog"];

const TASK_PRESENTATION: Record<AITaskName, TaskPresentation> = {
  world_generation: {
    icon: "🎭",
    group: "storytelling",
    badges: ["primary"],
    signals: ["storytelling", "reasoning"],
  },
  character_generation: {
    icon: "🎭",
    group: "storytelling",
    badges: ["primary"],
    signals: ["storytelling"],
  },
  opening_scene: {
    icon: "🎭",
    group: "storytelling",
    badges: ["primary"],
    signals: ["storytelling"],
  },
  next_scene: {
    icon: "🎭",
    group: "storytelling",
    badges: ["primary", "performance"],
    signals: ["storytelling"],
  },
  choice_generation: {
    icon: "⚡",
    group: "storytelling",
    badges: ["background", "performance"],
    signals: ["fast"],
  },
  custom_action_interpretation: {
    icon: "🧠",
    group: "support",
    badges: ["performance"],
    signals: ["reasoning", "system"],
  },
  summarization: {
    icon: "💰",
    group: "support",
    badges: ["background"],
    signals: ["fast", "cost", "system"],
  },
  consistency_check: {
    icon: "🧠",
    group: "support",
    badges: ["background", "performance"],
    signals: ["reasoning", "system"],
  },
  session_title: {
    icon: "⚙️",
    group: "support",
    badges: ["background"],
    signals: ["cost", "system"],
  },
  recap: {
    icon: "⚙️",
    group: "support",
    badges: ["background"],
    signals: ["system"],
  },
};

export function AISettingsForm() {
  const { token } = useAuth();
  const { t } = useI18n();
  const { push } = useToast();
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const [settings, setSettings] = useState<AISettings | null>(null);
  const [providers, setProviders] = useState<ProviderDraft[]>([]);
  const [defaultProvider, setDefaultProvider] = useState<AIProviderName | "">(
    "",
  );
  const [taskOverrides, setTaskOverrides] = useState<
    Partial<Record<AITaskName, TaskAssignment>>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [providerErrors, setProviderErrors] = useState<
    Partial<Record<AIProviderName, string>>
  >({});
  const [taskErrors, setTaskErrors] = useState<
    Partial<Record<AITaskName, string>>
  >({});
  const [defaultProviderError, setDefaultProviderError] = useState<
    string | null
  >(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  const tabs = getSettingsTabs(t);

  useEffect(() => {
    if (!token) {
      return;
    }

    api
      .getAISettings(token)
      .then((result) => {
        setSettings(result);
        hydrateDraft(result);
      })
      .catch((error) => {
        const message =
          error instanceof ApiClientError
            ? error.message
            : t("settings.aiSettings.genericRequestFailed");
        setSaveError(message);
        push({
          title: t("settings.aiSettings.loadFailedTitle"),
          description: message,
          tone: "error",
        });
      })
      .finally(() => setIsLoading(false));
  }, [push, t, token]);

  function hydrateDraft(result: AISettings) {
    setDefaultProvider(result.defaultProvider ?? "");
    setProviders(
      result.providers.map((provider) => ({
        provider: provider.provider,
        isEnabled: provider.isEnabled,
        hasSavedKey: provider.hasApiKey,
        apiKey: "",
        replaceApiKey: false,
        clearApiKey: false,
        baseUrl: provider.baseUrl ?? "",
        defaultModel: provider.defaultModel ?? "",
        reasoningEffort: provider.reasoningEffort ?? "medium",
      })),
    );
    setTaskOverrides(
      Object.fromEntries(
        (
          Object.entries(result.taskOverrides) as Array<
            [AITaskName, { provider: AIProviderName; model?: string }]
          >
        ).map(([task, assignment]) => [
          task,
          {
            provider: assignment.provider,
            model: assignment.model ?? "",
          },
        ]),
      ) as Partial<Record<AITaskName, TaskAssignment>>,
    );
    setLastSavedAt(result.updatedAt);
    setProviderErrors({});
    setTaskErrors({});
    setDefaultProviderError(null);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setProviderErrors({});
    setTaskErrors({});
    setDefaultProviderError(null);

    try {
      const updated = await api.updateAISettings(token, {
        defaultProvider: defaultProvider || null,
        providers: providers.map((provider) => ({
          provider: provider.provider,
          isEnabled: provider.isEnabled,
          newApiKey: provider.apiKey || undefined,
          replaceApiKey: provider.replaceApiKey || undefined,
          clearApiKey: provider.clearApiKey || undefined,
          baseUrl: provider.baseUrl || null,
          defaultModel: provider.defaultModel || null,
          reasoningEffort: provider.reasoningEffort || null,
        })),
        taskOverrides: Object.fromEntries(
          Object.entries(taskOverrides).map(([task, assignment]) => [
            task,
            assignment?.provider
              ? {
                  provider: assignment.provider,
                  model: assignment.model || undefined,
                }
              : null,
          ]),
        ),
      });
      setSettings(updated);
      hydrateDraft(updated);
      push({
        title: t("settings.aiSettings.saveSuccessTitle"),
        description: t("settings.aiSettings.saveSuccessDescription"),
        tone: "success",
      });
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : t("settings.aiSettings.genericRequestFailed");
      setSaveError(message);
      if (error instanceof ApiClientError) {
        const fieldErrors = parseAISettingsFieldErrors(error.details);
        setProviderErrors(fieldErrors.providers);
        setTaskErrors(fieldErrors.tasks);
        setDefaultProviderError(fieldErrors.defaultProvider);
      }
      push({
        title: t("settings.aiSettings.saveFailedTitle"),
        description: message,
        tone: "error",
      });
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <Card className="animate-shimmer h-[34rem]">
        <div />
      </Card>
    );
  }

  if (!settings) {
    return (
      <EmptyState
        eyebrow={t("settings.aiSettings.eyebrow")}
        title={t("settings.aiSettings.loadEmptyTitle")}
        description={saveError ?? t("settings.aiSettings.loadEmptyDescription")}
      />
    );
  }

  const configuredProviders = providers.filter((provider) =>
    providerIsConfigured(provider),
  ).length;
  const selectedDefault = defaultProvider
    ? providers.find((provider) => provider.provider === defaultProvider)
    : null;
  const defaultModel = selectedDefault?.defaultModel || "";

  return (
    <Card className="overflow-hidden p-0">
      <form onSubmit={onSubmit}>
        <div className="border-b border-[color:var(--border)] p-6 sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="eyebrow-label text-xs font-semibold uppercase">
                {t("settings.aiSettings.eyebrow")}
              </p>
              <h2 className="mt-4 text-3xl leading-tight font-semibold text-balance">
                {t("settings.aiSettings.title")}
              </h2>
              <p className="text-ui-muted mt-3 max-w-3xl text-sm leading-7">
                {t("settings.aiSettings.description")}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Badge>
                {configuredProviders} {t("settings.aiSettings.configuredCount")}
              </Badge>
              <StatusPill
                tone={saveError ? "error" : isSaving ? "saving" : "saved"}
                label={
                  saveError
                    ? t("settings.aiSettings.statusNeedsAttention")
                    : isSaving
                      ? t("settings.aiSettings.statusSaving")
                      : t("settings.aiSettings.statusSaved")
                }
              />
            </div>
          </div>

          <div className="mt-7 grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
            <InfoPanel
              title={t("settings.aiSettings.explainerTitle")}
              body={t("settings.aiSettings.explainerBody")}
              bullets={[
                t("settings.aiSettings.explainerCreative"),
                t("settings.aiSettings.explainerFrequent"),
                t("settings.aiSettings.explainerCritical"),
              ]}
            />
            <InfoPanel
              title={t("settings.aiSettings.choosingTitle")}
              bullets={[
                t("settings.aiSettings.choosingQuality"),
                t("settings.aiSettings.choosingFast"),
                t("settings.aiSettings.choosingBest"),
                t("settings.aiSettings.choosingCheaper"),
              ]}
            />
          </div>

          <nav className="mt-7 grid gap-3 md:grid-cols-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "rounded-[1.25rem] border px-4 py-4 text-left transition duration-200 focus-visible:ring-4 focus-visible:ring-[color:var(--focus-ring)]",
                  activeTab === tab.id
                    ? "border-[color:var(--accent)] bg-[color:var(--surface-selected)] shadow-[var(--shadow-soft)] ring-2 ring-[color:var(--accent-soft)]"
                    : "border-[color:var(--border)] bg-[color:var(--surface-soft)] hover:bg-[color:var(--surface-selected)]",
                )}
              >
                <span className="block text-sm font-semibold text-[color:var(--text-primary)]">
                  {tab.label}
                </span>
                <span className="text-ui-faint mt-1 block text-xs leading-5">
                  {tab.description}
                </span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6 sm:p-8">
          {activeTab === "general" ? (
            <GeneralSettings
              defaultProvider={defaultProvider}
              defaultModel={defaultModel}
              providers={providers}
              providerCatalog={settings.providerCatalog}
              lastSavedAt={lastSavedAt}
              fallbackStrategy={settings.fallbackStrategy}
              defaultProviderError={defaultProviderError}
              onDefaultProviderChange={setDefaultProvider}
              onDefaultModelChange={(model) => {
                if (!defaultProvider) {
                  return;
                }
                updateProvider(defaultProvider, { defaultModel: model });
              }}
            />
          ) : null}

          {activeTab === "providers" ? (
            <ProviderSettings
              settings={settings}
              providers={providers}
              providerCatalog={settings.providerCatalog}
              providerErrors={providerErrors}
              onProviderChange={updateProvider}
            />
          ) : null}

          {activeTab === "routing" ? (
            <ModelRoutingSettings
              settings={settings}
              providers={providers}
              providerCatalog={settings.providerCatalog}
              taskOverrides={taskOverrides}
              defaultProvider={defaultProvider}
              taskErrors={taskErrors}
              onTaskChange={(task, assignment) =>
                setTaskOverrides((current) => ({
                  ...current,
                  [task]: assignment,
                }))
              }
            />
          ) : null}

          {activeTab === "language" ? <LanguageSettings /> : null}
        </div>

        <div className="sticky bottom-0 border-t border-[color:var(--border)] bg-[color:var(--surface)]/92 px-6 py-4 backdrop-blur-xl sm:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-ui-muted text-sm leading-6">
              {saveError ?? t("settings.aiSettings.encryptedNotice")}
            </p>
            <Button type="submit" disabled={isSaving}>
              {isSaving
                ? t("settings.aiSettings.savingButton")
                : t("settings.aiSettings.saveButton")}
            </Button>
          </div>
        </div>
      </form>
    </Card>
  );

  function updateProvider(
    providerName: AIProviderName,
    update: Partial<ProviderDraft>,
  ) {
    setProviders((current) =>
      current.map((provider) =>
        provider.provider === providerName
          ? { ...provider, ...update }
          : provider,
      ),
    );
  }
}

function GeneralSettings({
  defaultProvider,
  defaultModel,
  providers,
  providerCatalog,
  lastSavedAt,
  fallbackStrategy,
  defaultProviderError,
  onDefaultProviderChange,
  onDefaultModelChange,
}: {
  defaultProvider: AIProviderName | "";
  defaultModel: string;
  providers: ProviderDraft[];
  providerCatalog: AISettings["providerCatalog"];
  lastSavedAt: string | null;
  fallbackStrategy: string;
  defaultProviderError: string | null;
  onDefaultProviderChange: (provider: AIProviderName | "") => void;
  onDefaultModelChange: (model: string) => void;
}) {
  const { t } = useI18n();
  const configuredProviders = providers.filter((provider) =>
    providerIsConfigured(provider),
  );
  const selectedProvider = defaultProvider
    ? providers.find((provider) => provider.provider === defaultProvider)
    : null;
  const defaultProviderConfigured = selectedProvider
    ? providerIsConfigured(selectedProvider)
    : false;
  const selectedDefaultModel =
    defaultProvider && defaultModel
      ? findCatalogModelEntry(providerCatalog, defaultProvider, defaultModel)
      : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <section className="space-y-5">
        <SectionHeader
          eyebrow={t("settings.aiSettings.general.eyebrow")}
          title={t("settings.aiSettings.general.title")}
          description={t("settings.aiSettings.general.description")}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <SettingField
            label={t("settings.aiSettings.general.defaultProvider")}
            helper={defaultProviderError ?? undefined}
            tone={defaultProviderError ? "error" : "default"}
          >
            <select
              className="control-select"
              value={defaultProvider}
              onChange={(event) =>
                onDefaultProviderChange(
                  event.target.value as AIProviderName | "",
                )
              }
            >
              <option value="">
                {t("settings.aiSettings.general.defaultProviderPlaceholder")}
              </option>
              {providers.map((provider) => (
                <option
                  key={provider.provider}
                  value={provider.provider}
                  disabled={!providerIsConfigured(provider)}
                >
                  {providerLabel(provider.provider, providerCatalog)}
                  {providerIsConfigured(provider)
                    ? ""
                    : ` - ${t("settings.aiSettings.general.providerNeedsKey")}`}
                </option>
              ))}
            </select>
          </SettingField>

          <SettingField label={t("settings.aiSettings.general.defaultModel")}>
            <ModelSelect
              provider={defaultProvider || null}
              providerCatalog={providerCatalog}
              value={defaultModel}
              disabled={!defaultProvider || !defaultProviderConfigured}
              placeholder={
                !defaultProvider
                  ? t("settings.aiSettings.general.chooseProviderFirst")
                  : t("settings.aiSettings.general.chooseModel")
              }
              onChange={onDefaultModelChange}
            />
          </SettingField>
        </div>

        {selectedDefaultModel ? (
          <ModelDetails model={selectedDefaultModel} />
        ) : null}

        {configuredProviders.length === 0 ? (
          <div className="surface-empty rounded-[1.35rem] p-5 text-sm leading-7">
            {t("settings.aiSettings.general.noProviders")}
          </div>
        ) : (
          <div className="surface-panel rounded-[1.35rem] p-5">
            <p className="text-sm font-semibold">
              {t("settings.aiSettings.general.configuredProviders")}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {configuredProviders.map((provider) => (
                <Badge key={provider.provider}>
                  {providerLabel(provider.provider, providerCatalog)}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </section>

      <aside className="surface-panel rounded-[1.6rem] p-5 shadow-[var(--shadow-soft)]">
        <p className="text-ui-faint text-sm font-semibold tracking-[0.22em] uppercase">
          {t("settings.aiSettings.general.fallbackOrder")}
        </p>
        <ol className="text-ui-muted mt-4 space-y-3 text-sm leading-6">
          {fallbackStrategy.split(" -> ").map((step, index) => (
            <li key={step} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[color:var(--border)] bg-[color:var(--surface-selected)] text-xs font-semibold text-[color:var(--text-secondary)]">
                {index + 1}
              </span>
              <span>{sentenceCase(step)}</span>
            </li>
          ))}
        </ol>
        <p className="text-ui-faint mt-5 text-xs leading-5">
          {t("settings.aiSettings.general.lastSaved")}:{" "}
          {lastSavedAt
            ? new Date(lastSavedAt).toLocaleString()
            : t("settings.aiSettings.general.notSavedYet")}
        </p>
      </aside>
    </div>
  );
}

function ProviderSettings({
  settings,
  providers,
  providerCatalog,
  providerErrors,
  onProviderChange,
}: {
  settings: AISettings;
  providers: ProviderDraft[];
  providerCatalog: AISettings["providerCatalog"];
  providerErrors: Partial<Record<AIProviderName, string>>;
  onProviderChange: (
    provider: AIProviderName,
    update: Partial<ProviderDraft>,
  ) => void;
}) {
  const { t } = useI18n();

  return (
    <section className="space-y-5">
      <SectionHeader
        eyebrow={t("settings.aiSettings.providers.eyebrow")}
        title={t("settings.aiSettings.providers.title")}
        description={t("settings.aiSettings.providers.description")}
      />

      <div className="grid gap-5 xl:grid-cols-2">
        {providers.map((provider) => {
          const saved = settings.providers.find(
            (entry) => entry.provider === provider.provider,
          );
          const configured = providerIsConfigured(provider);
          return (
            <ProviderCard
              key={provider.provider}
              provider={provider}
              saved={saved}
              configured={configured}
              providerCatalog={providerCatalog}
              error={providerErrors[provider.provider]}
              onChange={(update) => onProviderChange(provider.provider, update)}
            />
          );
        })}
      </div>
    </section>
  );
}

function ProviderCard({
  provider,
  saved,
  configured,
  providerCatalog,
  error,
  onChange,
}: {
  provider: ProviderDraft;
  saved: AISettings["providers"][number] | undefined;
  configured: boolean;
  providerCatalog: AISettings["providerCatalog"];
  error?: string;
  onChange: (update: Partial<ProviderDraft>) => void;
}) {
  const { t } = useI18n();
  const [confirmingClear, setConfirmingClear] = useState(false);
  const keyStatus = getProviderKeyStatus(provider);
  const selectedDefaultModel = provider.defaultModel
    ? findCatalogModelEntry(
        providerCatalog,
        provider.provider,
        provider.defaultModel,
      )
    : null;

  return (
    <div className="surface-panel rounded-[1.7rem] p-5 shadow-[var(--shadow-soft)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-semibold">
              {providerLabel(provider.provider, providerCatalog)}
            </h3>
            <StatusPill
              tone={
                keyStatus === "configured"
                  ? "saved"
                  : keyStatus === "pending"
                    ? "saving"
                    : "error"
              }
              label={
                keyStatus === "configured"
                  ? t("settings.aiSettings.providers.configured")
                  : keyStatus === "pending"
                    ? t("settings.aiSettings.providers.newKeyPending")
                    : t("settings.aiSettings.providers.notConfigured")
              }
            />
            {!provider.isEnabled ? (
              <Badge>{t("settings.aiSettings.providers.disabled")}</Badge>
            ) : null}
          </div>
          <p className="text-ui-muted mt-2 text-sm leading-6">
            {providerCatalog[provider.provider]?.description ??
              fallbackProviderCatalog[provider.provider].description}
          </p>
        </div>
        <Toggle
          checked={provider.isEnabled}
          label={t("settings.aiSettings.providers.enabled")}
          onChange={(isEnabled) => onChange({ isEnabled })}
        />
      </div>

      <div className="mt-5 grid gap-4">
        <SettingField
          label={t("settings.aiSettings.providers.apiKey")}
          helper={buildProviderKeyHelper(t, provider, saved)}
          tone={error ? "error" : "default"}
        >
          <div className="space-y-3">
            {saved?.hasApiKey && !provider.clearApiKey ? (
              <div className="surface-note rounded-[1rem] px-4 py-3 text-xs leading-5">
                {t("settings.aiSettings.providers.apiKeySavedPrefix")}{" "}
                {saved.apiKeyMasked}
              </div>
            ) : null}
            <Input
              type="password"
              value={provider.apiKey}
              onChange={(event) =>
                onChange({
                  apiKey: event.target.value,
                  replaceApiKey: Boolean(event.target.value.trim()),
                  clearApiKey: false,
                })
              }
              placeholder={
                saved?.hasApiKey
                  ? t("settings.aiSettings.providers.keepSavedKey")
                  : t("settings.aiSettings.providers.apiKeyPlaceholder")
              }
            />
            {saved?.hasApiKey ? (
              <div className="flex flex-wrap items-center gap-2">
                {!provider.clearApiKey ? (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setConfirmingClear((current) => !current)}
                  >
                    {t("settings.aiSettings.providers.clearSavedKeyAction")}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      onChange({ clearApiKey: false });
                      setConfirmingClear(false);
                    }}
                  >
                    {t("settings.aiSettings.providers.cancelClear")}
                  </Button>
                )}
              </div>
            ) : null}
            {confirmingClear && saved?.hasApiKey && !provider.clearApiKey ? (
              <div className="surface-panel-strong rounded-[1rem] p-4 text-sm text-[color:var(--text-muted)]">
                <p className="font-semibold text-[color:var(--text-secondary)]">
                  {t("settings.aiSettings.providers.confirmClearTitle")}
                </p>
                <p className="mt-1 text-xs leading-5">
                  {t("settings.aiSettings.providers.confirmClearDescription")}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      onChange({
                        clearApiKey: true,
                        apiKey: "",
                        replaceApiKey: false,
                      });
                      setConfirmingClear(false);
                    }}
                  >
                    {t("settings.aiSettings.providers.confirmClear")}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setConfirmingClear(false)}
                  >
                    {t("settings.aiSettings.providers.cancelClear")}
                  </Button>
                </div>
              </div>
            ) : null}
            {error ? (
              <p className="text-xs leading-5 text-[color:var(--danger)]">
                {t("settings.aiSettings.providers.fieldErrorPrefix")}: {error}
              </p>
            ) : null}
          </div>
        </SettingField>

        <div className="grid gap-4 sm:grid-cols-3">
          <SettingField
            label={t("settings.aiSettings.providers.defaultModel")}
            helper={
              configured
                ? t("settings.aiSettings.providers.defaultModelHelpConfigured")
                : t("settings.aiSettings.providers.defaultModelHelpNeedsKey")
            }
          >
            <ModelSelect
              provider={provider.provider}
              providerCatalog={providerCatalog}
              value={provider.defaultModel}
              disabled={!configured}
              onChange={(defaultModel) => onChange({ defaultModel })}
            />
          </SettingField>
          <SettingField
            label={t(
              "settings.aiSettings.providers.reasoningEffort",
              "Reasoning effort",
            )}
            helper={t(
              "settings.aiSettings.providers.reasoningEffortHelp",
              "Used by OpenAI-compatible providers that support reasoning effort.",
            )}
          >
            <select
              className="control-select"
              value={provider.reasoningEffort}
              onChange={(event) =>
                onChange({
                  reasoningEffort: event.target.value as ProviderDraft["reasoningEffort"],
                })
              }
            >
              <option value="low">
                {t("settings.aiSettings.reasoning.low", "Low")}
              </option>
              <option value="medium">
                {t("settings.aiSettings.reasoning.medium", "Medium")}
              </option>
              <option value="high">
                {t("settings.aiSettings.reasoning.high", "High")}
              </option>
            </select>
          </SettingField>
          <SettingField
            label={t("settings.aiSettings.providers.baseUrl")}
            helper={t("settings.aiSettings.providers.baseUrlHelp")}
          >
            <Input
              value={provider.baseUrl}
              onChange={(event) => onChange({ baseUrl: event.target.value })}
              placeholder={t("settings.aiSettings.providers.optional")}
            />
          </SettingField>
        </div>

        {selectedDefaultModel ? (
          <ModelDetails model={selectedDefaultModel} />
        ) : null}

        {provider.apiKey.trim() ? (
          <p className="text-ui-subtle text-xs leading-5">
            {t("settings.aiSettings.providers.replaceKeyNotice")}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function ModelRoutingSettings({
  settings,
  providers,
  providerCatalog,
  taskOverrides,
  defaultProvider,
  taskErrors,
  onTaskChange,
}: {
  settings: AISettings;
  providers: ProviderDraft[];
  providerCatalog: AISettings["providerCatalog"];
  taskOverrides: Partial<Record<AITaskName, TaskAssignment>>;
  defaultProvider: AIProviderName | "";
  taskErrors: Partial<Record<AITaskName, string>>;
  onTaskChange: (task: AITaskName, assignment: TaskAssignment) => void;
}) {
  const { t } = useI18n();
  const storytellingTasks = settings.supportedTasks.filter(
    (task) => TASK_PRESENTATION[task].group === "storytelling",
  );
  const supportTasks = settings.supportedTasks.filter(
    (task) => TASK_PRESENTATION[task].group === "support",
  );

  return (
    <section className="space-y-6">
      <SectionHeader
        eyebrow={t("settings.aiSettings.routing.eyebrow")}
        title={t("settings.aiSettings.routing.title")}
        description={t("settings.aiSettings.routing.description")}
      />

      {providers.every((provider) => !providerIsConfigured(provider)) ? (
        <div className="surface-empty rounded-[1.35rem] p-5 text-sm leading-7">
          {t("settings.aiSettings.routing.noProviders")}
        </div>
      ) : null}

      <TaskGroup
        title={t("settings.aiSettings.routing.storytellingTitle")}
        description={t("settings.aiSettings.routing.storytellingDescription")}
        tasks={storytellingTasks}
        providers={providers}
        providerCatalog={providerCatalog}
        taskOverrides={taskOverrides}
        defaultProvider={defaultProvider}
        taskErrors={taskErrors}
        onTaskChange={onTaskChange}
      />

      <TaskGroup
        title={t("settings.aiSettings.routing.supportTitle")}
        description={t("settings.aiSettings.routing.supportDescription")}
        tasks={supportTasks}
        providers={providers}
        providerCatalog={providerCatalog}
        taskOverrides={taskOverrides}
        defaultProvider={defaultProvider}
        taskErrors={taskErrors}
        onTaskChange={onTaskChange}
      />

      <p className="surface-note rounded-[1rem] px-4 py-3 text-xs leading-5">
        {t("settings.aiSettings.unassignedTaskFallback")}
      </p>
    </section>
  );
}

function TaskGroup({
  title,
  description,
  tasks,
  providers,
  providerCatalog,
  taskOverrides,
  defaultProvider,
  taskErrors,
  onTaskChange,
}: {
  title: string;
  description: string;
  tasks: AITaskName[];
  providers: ProviderDraft[];
  providerCatalog: AISettings["providerCatalog"];
  taskOverrides: Partial<Record<AITaskName, TaskAssignment>>;
  defaultProvider: AIProviderName | "";
  taskErrors: Partial<Record<AITaskName, string>>;
  onTaskChange: (task: AITaskName, assignment: TaskAssignment) => void;
}) {
  const { t } = useI18n();

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-[color:var(--text-primary)]">
            {title}
          </h3>
          <p className="text-ui-muted mt-1 text-sm leading-6">{description}</p>
        </div>
        <Badge>
          {tasks.length} {t("settings.aiSettings.routing.tasksCount")}
        </Badge>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        {tasks.map((task) => {
          const assignment = taskOverrides[task];
          const selectedProvider = assignment?.provider
            ? providers.find(
                (provider) => provider.provider === assignment.provider,
              )
            : null;
          const fallbackProvider = defaultProvider
            ? providers.find(
                (provider) => provider.provider === defaultProvider,
              )
            : null;
          const hasExplicitProvider = Boolean(assignment?.provider);
          const canChooseModel = selectedProvider
            ? providerIsConfigured(selectedProvider)
            : false;
          const copy = getTaskCopy(t, task);
          const presentation = TASK_PRESENTATION[task];
          const selectedModelProvider =
            assignment?.provider ||
            (hasExplicitProvider ? null : defaultProvider || null);
          const selectedModelId =
            assignment?.model ||
            (hasExplicitProvider
              ? (selectedProvider?.defaultModel ?? "")
              : (fallbackProvider?.defaultModel ?? ""));
          const suitableModels =
            selectedModelProvider && providerCatalog[selectedModelProvider]
              ? sortModelsForTask(
                  providerCatalog[selectedModelProvider].models,
                  task,
                ).filter((modelOption) =>
                  isModelSuitableForTask(modelOption, task),
                )
              : [];
          const selectedModel =
            selectedModelProvider && selectedModelId
              ? findCatalogModelEntry(
                  providerCatalog,
                  selectedModelProvider,
                  selectedModelId,
                )
              : null;
          const highlightedModels = suitableModels.slice(0, 3);

          return (
            <div
              key={task}
              className="surface-panel rounded-[1.45rem] p-5 shadow-[var(--shadow-soft)]"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-selected)] text-2xl">
                  <span aria-hidden="true">{presentation.icon}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-semibold text-[color:var(--text-primary)]">
                      {copy.title}
                    </p>
                    <Badge>
                      {presentation.group === "storytelling"
                        ? t(
                            "settings.aiSettings.routing.groupStorytelling",
                            "Storytelling",
                          )
                        : t(
                            "settings.aiSettings.routing.groupSupport",
                            "Support",
                          )}
                    </Badge>
                    {presentation.badges.map((badge) => (
                      <Badge key={badge}>
                        {t(
                          `settings.aiSettings.routing.badges.${badge}`,
                          sentenceCase(badge),
                        )}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-ui-muted mt-2 text-sm leading-6">
                    {copy.description}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {presentation.signals.map((signal) => (
                      <SignalBadge key={signal} signal={signal} />
                    ))}
                  </div>
                </div>
              </div>

              <div className="surface-note mt-4 space-y-3 rounded-[1.15rem] p-4">
                <p className="text-ui-faint text-xs font-semibold tracking-[0.18em] uppercase">
                  {t("settings.aiSettings.routing.recommended")}
                </p>
                <p className="text-sm font-medium text-[color:var(--text-secondary)]">
                  {copy.recommended}
                </p>
                <p className="text-ui-subtle text-xs leading-5">
                  {t("settings.aiSettings.routing.tipLabel")}: {copy.tip}
                </p>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <SettingField label={t("settings.aiSettings.routing.provider")}>
                  <select
                    className="control-select"
                    value={assignment?.provider ?? ""}
                    onChange={(event) =>
                      onTaskChange(task, {
                        provider: event.target.value as AIProviderName | "",
                        model: "",
                      })
                    }
                  >
                    <option value="">
                      {t("settings.aiSettings.routing.fallbackToDefault")}
                    </option>
                    {providers.map((provider) => (
                      <option
                        key={provider.provider}
                        value={provider.provider}
                        disabled={!providerIsConfigured(provider)}
                      >
                        {providerLabel(provider.provider, providerCatalog)}
                        {providerIsConfigured(provider)
                          ? ""
                          : ` - ${t("settings.aiSettings.general.providerNeedsKey")}`}
                      </option>
                    ))}
                  </select>
                </SettingField>
                <SettingField
                  label={t("settings.aiSettings.routing.model")}
                  helper={taskErrors[task]}
                  tone={taskErrors[task] ? "error" : "default"}
                >
                  <ModelSelect
                    provider={assignment?.provider || null}
                    providerCatalog={providerCatalog}
                    task={task}
                    value={assignment?.model ?? ""}
                    disabled={!hasExplicitProvider || !canChooseModel}
                    placeholder={
                      hasExplicitProvider
                        ? t("settings.aiSettings.routing.useProviderDefault")
                        : t("settings.aiSettings.routing.usesFallbackModel")
                    }
                    onChange={(model) =>
                      onTaskChange(task, {
                        provider: assignment?.provider ?? "",
                        model,
                      })
                    }
                  />
                </SettingField>
              </div>

              {highlightedModels.length > 0 ? (
                <p className="text-ui-faint mt-3 text-xs leading-5">
                  {t("settings.aiSettings.routing.bestMatchesLabel")}:{" "}
                  {highlightedModels
                    .map((modelOption) => modelOption.displayName)
                    .join(", ")}
                </p>
              ) : null}

              {selectedModel ? <ModelDetails model={selectedModel} /> : null}

              <p className="surface-note mt-4 rounded-[1rem] px-4 py-3 text-xs leading-5">
                {assignment?.provider
                  ? interpolate(
                      t("settings.aiSettings.routing.explicitAssignment"),
                      {
                        task: copy.title,
                        provider: providerLabel(
                          assignment.provider,
                          providerCatalog,
                        ),
                        modelSuffix: assignment.model
                          ? interpolate(
                              t(
                                "settings.aiSettings.routing.explicitAssignmentWithModel",
                              ),
                              {
                                model: assignment.model,
                              },
                            )
                          : t(
                              "settings.aiSettings.routing.explicitAssignmentDefaultModel",
                            ),
                      },
                    )
                  : interpolate(
                      t("settings.aiSettings.routing.fallbackAssignment"),
                      {
                        provider: defaultProvider
                          ? providerLabel(defaultProvider, providerCatalog)
                          : t(
                              "settings.aiSettings.routing.fallbackProviderServerDefault",
                            ),
                      },
                    )}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LanguageSettings() {
  const { t } = useI18n();

  return (
    <section className="space-y-5">
      <SectionHeader
        eyebrow={t("settings.aiSettings.language.eyebrow")}
        title={t("settings.aiSettings.language.title")}
        description={t("settings.aiSettings.language.description")}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <SettingField
          label={t("settings.interfaceLanguage")}
          helper={t("settings.interfaceLanguageHelp")}
        >
          <select className="control-select" disabled>
            <option>
              {t("settings.aiSettings.language.profilePreferencesPlaceholder")}
            </option>
          </select>
        </SettingField>
        <SettingField
          label={t("settings.storyOutputLanguage")}
          helper={t("settings.storyOutputLanguageHelp")}
        >
          <select className="control-select" disabled>
            <option>
              {t("settings.aiSettings.language.profilePreferencesPlaceholder")}
            </option>
          </select>
        </SettingField>
      </div>
      <div className="surface-empty rounded-[1.35rem] p-5 text-sm leading-7">
        {t("settings.aiSettings.language.helper")}
      </div>
    </section>
  );
}

function InfoPanel({
  title,
  body,
  bullets,
}: {
  title: string;
  body?: string;
  bullets: string[];
}) {
  return (
    <div className="surface-panel rounded-[1.35rem] p-5 shadow-[var(--shadow-soft)]">
      <h3 className="text-base font-semibold text-[color:var(--text-primary)]">
        {title}
      </h3>
      {body ? (
        <p className="text-ui-muted mt-2 text-sm leading-6">{body}</p>
      ) : null}
      <ul className="text-ui-muted mt-3 space-y-2 text-sm leading-6">
        {bullets.map((bullet) => (
          <li key={bullet} className="flex gap-2">
            <span className="mt-1 text-[color:var(--accent)]">•</span>
            <span>{bullet}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SignalBadge({ signal }: { signal: TaskSignalName }) {
  const { t } = useI18n();
  const iconMap: Record<TaskSignalName, string> = {
    storytelling: "🎭",
    system: "⚙️",
    reasoning: "🧠",
    fast: "⚡",
    cost: "💰",
  };

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[color:var(--border)] bg-[color:var(--surface-selected)] px-2.5 py-1 text-xs font-medium text-[color:var(--text-muted)]">
      <span aria-hidden="true">{iconMap[signal]}</span>
      <span>
        {t(
          `settings.aiSettings.routing.signals.${signal}`,
          sentenceCase(signal),
        )}
      </span>
    </span>
  );
}

function ModelDetails({ model }: { model: AIModelCatalogEntry }) {
  const { t } = useI18n();

  return (
    <div className="surface-note mt-3 rounded-[1rem] px-4 py-3 text-xs leading-5">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-semibold text-[color:var(--text-secondary)]">
          {model.displayName}
        </p>
        <Badge>
          {t(
            `settings.aiSettings.models.status.${model.status}`,
            sentenceCase(model.status),
          )}
        </Badge>
      </div>
      <p className="mt-1">{model.notes}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Badge>{model.id}</Badge>
        <Badge>
          {t(
            `settings.aiSettings.models.group.${model.group}`,
            sentenceCase(model.group),
          )}
        </Badge>
        <Badge>
          {t(
            `settings.aiSettings.models.latency.${model.latency}`,
            sentenceCase(model.latency),
          )}
        </Badge>
        <Badge>
          {t(
            `settings.aiSettings.models.costTier.${model.costTier}`,
            sentenceCase(model.costTier),
          )}
        </Badge>
      </div>
    </div>
  );
}

function ModelSelect({
  provider,
  providerCatalog = fallbackProviderCatalog,
  task,
  value,
  disabled,
  placeholder,
  onChange,
}: {
  provider: AIProviderName | null;
  providerCatalog?: AISettings["providerCatalog"];
  task?: AITaskName;
  value: string;
  disabled?: boolean;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  const { t } = useI18n();
  const options = provider ? (providerCatalog[provider]?.models ?? []) : [];
  const customValue =
    value && !options.some((modelOption) => modelOption.id === value)
      ? value
      : "";
  const groupedOptions = groupModelsByCategory(
    sortModelsForTask(options, task),
  );

  return (
    <select
      className="control-select"
      value={customValue ? "__custom" : value}
      disabled={disabled}
      onChange={(event) =>
        onChange(event.target.value === "__custom" ? value : event.target.value)
      }
    >
      <option value="">
        {placeholder ?? t("settings.aiSettings.general.chooseModel")}
      </option>
      {groupedOptions.map(([group, modelOptions]) => (
        <optgroup
          key={group}
          label={t(
            `settings.aiSettings.models.group.${group}`,
            sentenceCase(group),
          )}
        >
          {modelOptions.map((modelOption) => (
            <option key={modelOption.id} value={modelOption.id}>
              {formatModelOptionLabel(t, modelOption, task)}
            </option>
          ))}
        </optgroup>
      ))}
      {customValue ? <option value="__custom">{customValue}</option> : null}
    </select>
  );
}

function Toggle({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 text-sm font-semibold text-[color:var(--text-secondary)]">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-7 w-12 rounded-full border transition",
          checked
            ? "border-[color:var(--accent)] bg-[color:var(--accent)]"
            : "border-[color:var(--border)] bg-[color:var(--surface-disabled)]",
        )}
      >
        <span
          className={cn(
            "absolute top-1 h-5 w-5 rounded-full bg-white shadow transition",
            checked ? "left-6" : "left-1",
          )}
        />
      </button>
      {label}
    </label>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <p className="eyebrow-label text-xs font-semibold uppercase">{eyebrow}</p>
      <h3 className="mt-3 text-2xl font-semibold text-[color:var(--text-primary)]">
        {title}
      </h3>
      <p className="text-ui-muted mt-2 max-w-3xl text-sm leading-7">
        {description}
      </p>
    </div>
  );
}

function SettingField({
  label,
  helper,
  tone = "default",
  children,
}: {
  label: string;
  helper?: string;
  tone?: "default" | "error";
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-[color:var(--text-secondary)]">
        {label}
      </span>
      {children}
      {helper ? (
        <span
          className={cn(
            "mt-2 block text-xs leading-5",
            tone === "error"
              ? "text-[color:var(--danger-strong)]"
              : "text-[color:var(--text-faint)]",
          )}
        >
          {helper}
        </span>
      ) : null}
    </label>
  );
}

function getSettingsTabs(
  t: Translate,
): Array<{ id: SettingsTab; label: string; description: string }> {
  return [
    {
      id: "general",
      label: t("settings.aiSettings.tabs.general.label", "General"),
      description: t(
        "settings.aiSettings.tabs.general.description",
        "Choose the default provider, default model, and fallback order.",
      ),
    },
    {
      id: "providers",
      label: t("settings.aiSettings.tabs.providers.label", "Providers"),
      description: t(
        "settings.aiSettings.tabs.providers.description",
        "Manage saved keys, base URLs, and provider-level default models.",
      ),
    },
    {
      id: "routing",
      label: t("settings.aiSettings.tabs.routing.label", "Task Routing"),
      description: t(
        "settings.aiSettings.tabs.routing.description",
        "Assign providers and models to each story task.",
      ),
    },
    {
      id: "language",
      label: t("settings.aiSettings.tabs.language.label", "Languages"),
      description: t(
        "settings.aiSettings.tabs.language.description",
        "Review interface and story output language preferences.",
      ),
    },
  ];
}

function getTaskCopy(t: Translate, task: AITaskName) {
  const baseKey = `settings.aiSettings.routing.tasks.${task}`;
  const fallbackTitle = sentenceCase(task);
  return {
    title: t(`${baseKey}.title`, fallbackTitle),
    description: t(`${baseKey}.description`, fallbackTitle),
    recommended: t(`${baseKey}.recommended`, fallbackTitle),
    tip: t(`${baseKey}.tip`, fallbackTitle),
  };
}

function interpolate(template: string, replacements: Record<string, string>) {
  return Object.entries(replacements).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, value),
    template,
  );
}

function providerIsConfigured(provider: ProviderDraft) {
  return (
    provider.isEnabled &&
    !provider.clearApiKey &&
    Boolean(provider.apiKey.trim() || provider.hasSavedKey)
  );
}

function getProviderKeyStatus(provider: ProviderDraft) {
  if (provider.apiKey.trim()) {
    return "pending" as const;
  }

  if (provider.hasSavedKey && !provider.clearApiKey) {
    return "configured" as const;
  }

  return "missing" as const;
}

function buildProviderKeyHelper(
  t: Translate,
  provider: ProviderDraft,
  saved: AISettings["providers"][number] | undefined,
) {
  if (provider.clearApiKey) {
    return t("settings.aiSettings.providers.keyClearedPending");
  }

  if (provider.apiKey.trim()) {
    return t("settings.aiSettings.providers.keyPendingSave");
  }

  if (saved?.hasApiKey) {
    return [
      t("settings.aiSettings.providers.keyHelpKeep"),
      t("settings.aiSettings.providers.keyHelpReplace"),
      t("settings.aiSettings.providers.keyHelpRemove"),
    ].join(" ");
  }

  return t("settings.aiSettings.providers.apiKeyHelp");
}

function parseAISettingsFieldErrors(details: unknown): {
  providers: Partial<Record<AIProviderName, string>>;
  tasks: Partial<Record<AITaskName, string>>;
  defaultProvider: string | null;
} {
  const providers: Partial<Record<AIProviderName, string>> = {};
  const tasks: Partial<Record<AITaskName, string>> = {};
  let defaultProvider: string | null = null;

  if (!details || typeof details !== "object") {
    return { providers, tasks, defaultProvider };
  }

  const fieldErrors = (details as Record<string, unknown>).fieldErrors;
  if (!fieldErrors || typeof fieldErrors !== "object") {
    return { providers, tasks, defaultProvider };
  }

  const fieldMap = fieldErrors as Record<string, unknown>;
  if (typeof fieldMap.defaultProvider === "string") {
    defaultProvider = fieldMap.defaultProvider;
  }

  if (fieldMap.providers && typeof fieldMap.providers === "object") {
    for (const [provider, message] of Object.entries(
      fieldMap.providers as Record<string, unknown>,
    )) {
      if (typeof message === "string") {
        providers[provider as AIProviderName] = message;
      }
    }
  }

  if (fieldMap.taskOverrides && typeof fieldMap.taskOverrides === "object") {
    for (const [task, message] of Object.entries(
      fieldMap.taskOverrides as Record<string, unknown>,
    )) {
      if (typeof message === "string") {
        tasks[task as AITaskName] = message;
      }
    }
  }

  return { providers, tasks, defaultProvider };
}

function groupModelsByCategory(models: AIModelCatalogEntry[]) {
  const groups = new Map<string, AIModelCatalogEntry[]>();

  for (const modelOption of models) {
    const group = modelOption.group;
    const existing = groups.get(group);
    if (existing) {
      existing.push(modelOption);
    } else {
      groups.set(group, [modelOption]);
    }
  }

  return Array.from(groups.entries());
}

function findCatalogModelEntry(
  providerCatalog: AISettings["providerCatalog"],
  provider: AIProviderName,
  modelId: string,
) {
  return (
    providerCatalog[provider]?.models.find(
      (modelOption) => modelOption.id === modelId,
    ) ?? null
  );
}

function formatModelOptionLabel(
  t: Translate,
  modelOption: AIModelCatalogEntry,
  task?: AITaskName,
) {
  const markers = [
    modelOption.status === "recommended"
      ? t("settings.aiSettings.models.optionMarkers.recommended", "Recommended")
      : null,
    task && isModelSuitableForTask(modelOption, task)
      ? t("settings.aiSettings.models.optionMarkers.goodFit", "Good fit")
      : null,
  ].filter(Boolean);

  return `${modelOption.displayName} (${modelOption.id})${markers.length ? ` - ${markers.join(", ")}` : ""}`;
}

function providerLabel(
  provider: AIProviderName,
  catalog: AISettings["providerCatalog"],
) {
  return catalog[provider]?.label ?? fallbackProviderCatalog[provider].label;
}

function sentenceCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1).replaceAll("_", " ");
}
