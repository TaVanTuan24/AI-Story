# Prompt Design

## Why prompts are separated

The platform uses multiple AI tasks with very different responsibilities:

- world setup is generative and broad
- character generation is cast design
- scene generation is dramatic writing
- choice generation is constrained option design
- action interpretation is classification
- summarization is compression
- consistency checking is validation
- session title and recap generation are presentation tasks

Trying to handle all of those with one giant prompt creates prompt drift, unstable outputs, and unnecessary token cost. Splitting them into separate prompts gives each task:

- a clear job
- a dedicated JSON contract
- task-specific safety rules
- its own token budget
- its own failure-mode notes

## Anti-drift strategy

Every prompt includes instructions to:

- preserve continuity
- respect world rules
- maintain character consistency
- avoid sudden tone shifts
- avoid repeated scene rhythm and repeated choice phrasing
- avoid generic filler actions

This matters because long-running interactive fiction sessions are especially vulnerable to narrative drift. The prompts are designed to keep the model aligned with the engine-owned context pack rather than chasing novelty at the expense of coherence.

## Why JSON-first prompt design matters

The orchestration layer validates every model response with Zod. Prompt templates therefore include strict schema discipline instructions so the model is reminded to:

- emit JSON only
- include every required field
- avoid extra keys
- keep output compact and structured

The prompts are not trusted on their own. They are only one part of a larger pipeline that also includes parsing, validation, retry logic, and fallbacks.
