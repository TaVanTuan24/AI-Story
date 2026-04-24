import { describe, expect, it } from "vitest";

import {
  AI_PROVIDER_CATALOG,
  getRecommendedModelsForTask,
  getXaiStorytellingDefaultModel,
  getXaiSupportDefaultModel,
  isModelSuitableForTask,
  sortModelsForTask,
} from "@/lib/ai/provider-catalog";

describe("provider catalog", () => {
  it("keeps xAI models centralized with stable defaults for storytelling and support", () => {
    expect(getXaiStorytellingDefaultModel()).toMatchObject({
      provider: "xai",
      id: "grok-4.20-reasoning",
      isPrimaryStorytellingDefault: true,
    });

    expect(getXaiSupportDefaultModel()).toMatchObject({
      provider: "xai",
      id: "grok-3-mini",
      isSupportDefault: true,
    });
  });

  it("exposes task suitability directly on model entries", () => {
    const xaiModels = AI_PROVIDER_CATALOG.xai.models;
    const storytellingModel = xaiModels.find((model) => model.id === "grok-4.20-reasoning");
    const supportModel = xaiModels.find((model) => model.id === "grok-3-mini-fast");

    expect(storytellingModel && isModelSuitableForTask(storytellingModel, "next_scene")).toBe(true);
    expect(storytellingModel && isModelSuitableForTask(storytellingModel, "summarization")).toBe(false);
    expect(supportModel && isModelSuitableForTask(supportModel, "summarization")).toBe(true);
  });

  it("returns recommended xAI models for narrative tasks", () => {
    const nextScene = getRecommendedModelsForTask("xai", "next_scene").map((model) => model.id);
    const summary = getRecommendedModelsForTask("xai", "summarization").map((model) => model.id);

    expect(nextScene).toContain("grok-4.20-reasoning");
    expect(summary).toContain("grok-3-mini");
  });

  it("sorts task-suitable xAI models ahead of weaker fits", () => {
    const sorted = sortModelsForTask(AI_PROVIDER_CATALOG.xai.models, "summarization").map(
      (model) => model.id,
    );

    expect(sorted.indexOf("grok-3-mini")).toBeLessThan(sorted.indexOf("grok-4.20-reasoning"));
    expect(sorted.indexOf("grok-3-mini-fast")).toBeLessThan(sorted.indexOf("grok-4"));
  });
});
