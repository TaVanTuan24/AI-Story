# API

## Auth

### `POST /api/auth/register`

Registers a user and returns a bearer token.

Request:

```json
{
  "email": "mira@example.com",
  "displayName": "Mira",
  "password": "very-secure-password"
}
```

Response:

```json
{
  "data": {
    "user": {
      "id": "USER_ID",
      "email": "mira@example.com",
      "displayName": "Mira",
      "isActive": true
    },
    "token": "JWT_TOKEN"
  },
  "meta": {
    "requestId": "req_..."
  }
}
```

### `POST /api/auth/login`

Logs in a user and returns a bearer token.

### `GET /api/me`

Returns the authenticated user and preferences.

Requires:

`Authorization: Bearer <token>`

### `PATCH /api/me/preferences`

Updates user preference fields used for future personalization.

## Story sessions

### `POST /api/story-sessions`

Creates a draft story session record.

### `GET /api/story-sessions`

Lists the authenticated user's sessions.

### `GET /api/story-sessions/:id`

Returns session detail including world, characters, current scene, and canonical state summary when available.

### `POST /api/story-sessions/:id/start`

Starts the session by generating:

- world
- major characters
- title
- opening scene
- opening choices
- initial snapshot, summaries, and turn log

### `POST /api/story-sessions/:id/turn`

Submits a selected choice.

Request:

```json
{
  "choiceId": "investigate-the-most-suspicious-detail-2-1"
}
```

### `POST /api/story-sessions/:id/custom-action`

Submits a free-text player action.

Request:

```json
{
  "customInput": "I inspect the ash and compare it to the station furnace residue."
}
```

### `POST /api/story-sessions/:id/save`

Marks the session as saved/paused and updates `lastPlayedAt`.

### `POST /api/story-sessions/:id/resume`

Marks the session active again and returns current state.

### `GET /api/story-sessions/:id/history`

Returns turn log history for the session.

### `GET /api/story-sessions/:id/recap`

Returns a recap payload generated from recent turns and canonical context.

### `DELETE /api/story-sessions/:id`

Deletes the session and related world/character/snapshot/log/summary records.

## Error shape

```json
{
  "error": "Validation failed.",
  "code": "VALIDATION_ERROR",
  "details": {},
  "meta": {
    "requestId": "req_..."
  }
}
```

## Turn flow

When a turn endpoint succeeds, the backend:

1. validates auth and ownership
2. validates the action payload
3. loads canonical story state
4. applies the action through the narrative engine
5. generates the next scene through AI orchestration
6. persists the updated story state
7. writes snapshot, turn log, and summaries
8. returns the new scene package
