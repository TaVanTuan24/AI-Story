# Architecture

## Layers

### 1. UI layer

- Location: `src/app`, `src/components`
- Responsibility: render the web experience, route users, and present story state returned by the API

### 2. API routes / controllers

- Location: `src/app/api`, `src/server/api/controllers`
- Responsibility: accept HTTP requests, validate payloads, call services, and map results into API responses

### 3. Services

- Location: `src/server/services`
- Responsibility: coordinate use cases such as story creation, continuation, autosave, and future analytics hooks

### 4. AI orchestration layer

- Location: `src/server/ai`
- Responsibility: select the configured provider, enforce structured output expectations, and isolate provider SDK details

### 5. Narrative engine

- Location: `src/server/narrative`
- Responsibility: own canonical story state transitions, validate actions, and decide how generated content becomes durable story state

### 6. Persistence layer

- Location: `src/server/persistence`, `src/lib/db`
- Responsibility: connect to MongoDB, define Mongoose models, and expose repositories for durable storage

## Request flow

1. The UI calls a route handler such as `POST /api/stories`.
2. The controller validates the payload with Zod.
3. The service runs the use case.
4. The narrative engine requests a structured turn from the AI orchestrator.
5. The AI provider returns strict JSON that matches the expected story schema.
6. The narrative engine applies continuity rules and produces the next canonical story state.
7. The repository persists the state in MongoDB.
8. The presenter shapes the response sent back to the UI.

## Why the narrative engine is the source of truth

The AI model suggests the next scene, summary, memory, and choice set, but the engine decides whether that output is valid and how it changes durable state. This keeps continuity logic, branching rules, autosave behavior, and future analytics independent from any single model provider.

## Scaffolded extension points

- Add auth and per-user story ownership inside the service and persistence layers.
- Add branch snapshots and turn events for timeline history.
- Add prompt libraries, guardrails, moderation, and token accounting inside `src/server/ai`.
- Add analytics/event streaming without leaking persistence concerns into UI code.
