# Prompt Library

This directory contains the production prompt templates for the AI orchestration layer.

## Design rules

- One prompt file per task
- Strong system instructions
- JSON-only output requirements
- Shared anti-drift instructions
- Explicit output schema metadata
- Token-budget and failure-mode notes kept close to each prompt

## Prompt files

- `world-generator.ts`
- `character-generator.ts`
- `opening-scene-generator.ts`
- `choice-generator.ts`
- `custom-action-interpreter.ts`
- `next-scene-generator.ts`
- `turn-summarizer.ts`
- `consistency-checker.ts`
- `session-title-generator.ts`
- `recap-generator.ts`

## Why separate files

These prompts have different jobs, token budgets, and failure modes. Keeping them separate makes prompt iteration safer, easier to test, and easier to version per task without causing hidden regressions in unrelated workflows.
