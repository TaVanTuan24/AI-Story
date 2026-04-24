# Theme System

This app supports light mode and dark mode through a token-based theme system with a fantasy-inspired dark variant.

## Overview

Theme behavior is split into three layers:

1. Theme preference
   Stored as `light`, `dark`, or `system`.
2. Resolved theme
   The actual active theme, either `light` or `dark`.
3. Design tokens
   CSS custom properties that components consume instead of hardcoded colors.

Main files:

- `src/components/providers/theme-provider.tsx`
- `src/app/layout.tsx`
- `src/app/globals.css`
- `src/features/profile/preferences-form.tsx`

## Preference Storage

Logged-in users:

- theme preference is stored in `UserPreference.themePreference`
- API route: `PATCH /api/me/preferences`

Anonymous users:

- theme preference is stored in local storage under `ai-story.theme-preference`

If the preference is `system`, the app follows `prefers-color-scheme`.

## Hydration Safety

To avoid a flash of the wrong theme and hydration mismatch:

- `src/app/layout.tsx` injects a tiny inline script
- the script reads local storage and system preference before hydration
- it sets `document.documentElement.dataset.theme`

The client `ThemeProvider` then keeps the DOM theme synchronized after the app mounts.

## Theme Tokens

Core tokens live in `src/app/globals.css`.

Base surfaces:

- `--background`
- `--background-soft`
- `--background-elevated`
- `--surface`
- `--surface-soft`
- `--surface-strong`
- `--surface-elevated`
- `--surface-selected`
- `--surface-disabled`

Text:

- `--text-primary`
- `--text-secondary`
- `--text-muted`
- `--text-subtle`
- `--text-faint`
- `--text-disabled`

Borders and focus:

- `--border`
- `--border-strong`
- `--focus-ring`
- `--focus-ring-strong`

Actions and status:

- `--button-primary-bg`
- `--button-primary-hover`
- `--button-primary-active`
- `--button-primary-text`
- `--button-secondary-bg`
- `--button-secondary-hover`
- `--button-secondary-active`
- `--button-secondary-text`
- `--button-ghost-text`
- `--button-ghost-hover`
- `--button-ghost-active`
- `--accent`
- `--accent-strong`
- `--accent-soft`
- `--danger`
- `--success`
- `--warning`
- `--selected-state`
- `--disabled-state`

Shadows and effects:

- `--shadow-soft`
- `--shadow-card`
- `--shadow-elevated`
- `--magical-mist`
- `--magical-star`
- `--magical-rune`

## Dark Fantasy Effects

The dark theme uses a restrained fantasy style:

- deep navy and violet backgrounds
- subtle gradient auras
- faint star-field dots
- soft rune-like circular markings
- elevated card glow on selected feature surfaces

Reusable pieces:

- `MagicalBackground`
- `FantasyGlowCard`
- CSS classes:
  - `magical-stage`
  - `magical-stage__mist`
  - `magical-stage__stars`
  - `magical-stage__runes`
  - `fantasy-glow-card`
  - `themed-prose-panel`
  - `themed-brand-badge`
  - `themed-error-panel`
  - `themed-modal-surface`

Use fantasy effects selectively:

- landing page
- dashboard
- create-session page
- story-play page

Avoid overusing them in dense form-heavy screens such as settings panels.

## Accessibility Rules

- Keep WCAG AA contrast as the baseline for body text and controls.
- Never rely on color alone for state.
- Preserve visible `focus-visible` outlines in both themes.
- Ensure selected buttons keep strong contrast against their background.
- Support `prefers-reduced-motion` by disabling decorative animation classes.
- Keep Vietnamese and English text readable at the same weights and sizes.

## Adding New Colors Safely

When adding new visual states:

1. Add a semantic token, not a one-off hardcoded color.
2. Define it for both light and dark themes.
3. Reuse the token in components.
4. Verify hover, active, disabled, selected, and focus states in both themes.
5. Check English and Vietnamese copy for readability.

Good:

- `--toast-success-bg`
- `--panel-emphasis-border`

Avoid:

- `bg-[#25194a]` inside a page component
- direct text opacity choices that are only readable in one mode

## Recommended Workflow

1. Add or update a semantic token in `globals.css`.
2. Reuse the token in a shared component if multiple screens need it.
3. Apply page-level fantasy effects only after the base token contrast looks correct.
4. Run:
   - `npm run lint`
   - `npm run typecheck`
   - `npm test`
