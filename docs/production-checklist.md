# Production Checklist

## Before Deploy

- Set `NODE_ENV=production`.
- Set a strong `AUTH_SECRET`.
- Set `AUTH_COOKIE_SECURE=true`.
- Configure the selected AI provider key in env vars only.
- Remove any `NEXT_PUBLIC_*` secret env vars.
- Set `APP_URL` to the deployed canonical origin.
- Review `AI_REQUEST_TIMEOUT_MS`, retry values, and generation rate limits for your traffic profile.
- Confirm MongoDB credentials and network access are production-ready.

## Build And Release

- Run `npm run typecheck`.
- Run `npm run test`.
- Run `npm run build`.
- Verify `next.config.ts` standalone output matches your deployment target.
- Check the health endpoint after deploy: `/api/health`.

## Security Review

- Verify auth cookies are `HttpOnly` and `Secure`.
- Verify login, register, and story generation endpoints are rate-limited.
- Verify protected pages redirect unauthenticated users.
- Verify session ownership checks reject cross-account access.
- Verify logs do not contain API keys, passwords, cookies, or tokens.

## Runtime Verification

- Confirm database connectivity from the deployed runtime.
- Confirm the configured AI provider can answer requests inside timeout limits.
- Confirm generation failures surface friendly retryable messages.
- Confirm request IDs appear in API responses and logs.
- Confirm moderation blocks unsafe custom inputs as expected.

## Monitoring

- Watch 401, 403, 422, 429, and 5xx rates.
- Watch AI timeout and retry volume.
- Watch health endpoint status for DB degradation.
- Alert on repeated `GENERATION_UNAVAILABLE` or `AI_PROVIDER_NOT_CONFIGURED` errors.

## Future Hardening

- Move rate limiting and concurrency tracking to Redis.
- Add CSP and stricter security headers.
- Add server-side session revocation or token rotation.
- Add audit logging for account-sensitive actions.
