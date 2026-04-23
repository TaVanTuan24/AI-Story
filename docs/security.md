# Security

## Implemented Measures

### Authentication

- Passwords are hashed with `bcrypt` and configurable rounds via `PASSWORD_BCRYPT_ROUNDS`.
- Optional password pepper support is available through `PASSWORD_PEPPER`.
- JWTs are signed server-side only and validated with issuer and audience checks.
- Login and registration now set an `HttpOnly` auth cookie.
- API auth accepts the secure cookie and still supports bearer tokens for compatibility.
- Inactive accounts are blocked from authenticated access.

### Route Protection

- Backend ownership checks are enforced in repositories and services using user-scoped queries.
- Frontend protected pages are gated by `middleware.ts` and by client-side `RequireAuth`.
- API request IDs are attached to responses with `x-request-id`.

### Input Handling

- JSON input is sanitized before schema validation.
- Control characters are stripped and text is normalized with Unicode NFKC.
- Auth, session creation, preferences, and custom action payloads are trimmed and validated.
- Unsafe angle-bracket markup is rejected in user-authored text fields.

### Abuse Prevention

- Global rate limiting is enforced in the centralized route runner.
- Auth endpoints use a stricter rate limit.
- Story generation endpoints use dedicated generation-rate limits.
- Concurrent generation is limited per actor to prevent request floods.
- Unsafe custom actions go through a basic moderation pipeline.
- Repeated unsafe custom actions trigger a temporary cooldown.

### AI/API Safety

- Secrets stay in environment variables only.
- Startup validation rejects leaked `NEXT_PUBLIC_*` secret vars.
- AI provider misconfiguration returns a safe server-side error.
- AI calls use timeout protection and retry with backoff and jitter.
- Sensitive headers and secret-like keys are redacted from logs.

### Logging And Errors

- Server logs are structured JSON.
- Errors are centrally mapped in the HTTP handler.
- Request logs include request ID, method, path, status, duration, IP, and user agent.
- Unexpected errors are hidden from client responses in production-safe form.

## Operational Notes

- `AUTH_COOKIE_SECURE=true` should be enabled in production.
- `AUTH_COOKIE_SAME_SITE=lax` is a safe default for this app. Use `strict` if your flow does not need cross-site entry.
- Avoid sending bearer tokens from browsers when cookie auth is enabled.
- Health checks are cached briefly to avoid turning monitoring into extra DB load.

## Remaining Security Considerations

- Rate limiting is currently in-memory and instance-local. Use Redis or another shared store for multi-instance deployments.
- Moderation is intentionally basic. Higher-risk deployments should add model-based or third-party moderation.
- Session revocation is cookie-based but not backed by a server-side session blacklist.
- CSP is not yet enforced; adding a strict Content Security Policy is a good next step.
