# Frontend UX

## Experience goals

The frontend is designed to make long-running AI fiction feel premium rather than disposable.

Key UX principles:

- the player should always know which session they are inside
- reading should feel focused and atmospheric
- action submission should feel safe and legible
- session management should make resuming frictionless
- state and recap tools should support long-term play without overwhelming the reader

## Page breakdown

- Landing page: frames the product and funnels users toward account creation or resume flow
- Login/Register: high-clarity auth entry points with minimal friction
- Dashboard: a session library with filters, search, and quick resume
- Create session: a structured, guided form for tone, genre, preset, and session preferences
- Story play page: the primary reading and decision-making surface
- Profile/preferences: lets the player tune future session behavior

## Story play page decisions

The play page uses a two-column layout on desktop:

- left column for the reading experience
- right column for session context, stats, characters, and recap notes

This keeps the story text dominant while still making persistent state visible.

Important interaction choices:

- choice buttons are large and stacked for fast scanning
- custom action input lives directly below the choice stack so it feels like an equal action path
- autosave and generation state are always visible via a status pill
- recap and history open in focused side panels rather than leaving the page
- error recovery keeps the failed action in memory so the player can retry quickly

## Dashboard decisions

The dashboard is built around session cards because resume flow matters more than raw table density.

Each card surfaces:

- title
- current summary or premise
- genre, tone, and preset badges
- turn number
- last played time
- direct continue action

This makes it easy to return to an old session even after many days.

## Mobile behavior

The UI is desktop-first but remains usable on mobile by:

- collapsing multi-column layouts into stacked sections
- keeping choice buttons full-width
- using overlays for history and recap instead of fixed sidebars
- keeping forms in single-column layouts on smaller screens
