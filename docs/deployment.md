# Deployment

## Overview

The app is deployable as a standard Next.js application with server routes, MongoDB, and server-side AI provider access. Secrets must remain in environment variables and never in client bundles.

## Vercel-Friendly Frontend Notes

- The frontend and API routes can be deployed together on Vercel.
- `next.config.ts` already disables `X-Powered-By`, sets security headers, and uses `output: "standalone"`.
- Protected page redirects are handled in `middleware.ts`.
- Cookie auth works well on a single origin deployment where the frontend and API share the same domain.

Recommended Vercel env vars:

```env
NODE_ENV=production
APP_URL=https://your-domain.example
MONGODB_URI=...
AUTH_SECRET=...
AUTH_COOKIE_SECURE=true
AUTH_COOKIE_NAME=ai-story.session
AUTH_COOKIE_SAME_SITE=lax
AI_PROVIDER=openai
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-5.4-mini
```

## Backend / Runtime Notes

- MongoDB should be reachable from the runtime with TLS and least-privilege credentials.
- AI provider keys stay server-side only.
- Health checks are exposed at `/api/health`.
- The current rate limiter and generation concurrency guard are in-memory. In horizontally scaled deployments, replace them with a shared store such as Redis.

## Cookies And Auth

- Use HTTPS in production.
- Keep `AUTH_COOKIE_SECURE=true`.
- Keep cookies same-origin when possible.
- The browser client now relies on the secure auth cookie instead of persisting the bearer token in local storage.

## Deployment Steps

1. Configure production env vars.
2. Deploy the app.
3. Open `/api/health` and verify `status: ok`.
4. Register a user, log in, create a session, start a story, and play one turn.
5. Verify logs include request IDs and no secrets.

## Scaling Guidance

- Replace in-memory rate limiting with Redis.
- Replace in-memory moderation cooldowns with a shared store.
- Add centralized log ingestion.
- Add alerting on health degradation and AI timeout spikes.
