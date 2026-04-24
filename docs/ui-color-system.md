# UI Color System

This app uses a warm beige and brown palette, but readability now takes precedence over ultra-soft contrast.

## Core Tokens

The main design tokens live in [src/app/globals.css](/d:/NodeJs/AI%20Story/src/app/globals.css).

- `--background`, `--background-soft`
- `--surface`, `--surface-soft`, `--surface-strong`, `--surface-elevated`, `--surface-selected`, `--surface-disabled`
- `--text-primary`, `--text-secondary`, `--text-muted`, `--text-subtle`, `--text-faint`, `--text-disabled`
- `--accent`, `--accent-strong`, `--accent-pressed`, `--accent-soft`
- `--success-*`, `--warning-*`, `--info-*`, `--danger-*`
- `--focus-ring`

## Shared Utility Classes

Use these shared classes before adding one-off opacity colors:

- `eyebrow-label`
- `text-ui-secondary`
- `text-ui-muted`
- `text-ui-subtle`
- `text-ui-faint`
- `surface-panel`
- `surface-panel-strong`
- `surface-note`
- `surface-empty`
- `status-success`
- `status-warning`
- `status-info`
- `status-danger`

## Component Rules

- Primary actions should use the shared `Button` component.
- Inputs, textareas, and selects should use the shared `Input`, `Textarea`, or `control-select` styles.
- Active and selected states must keep clear text contrast. Do not pair muted text with selected backgrounds.
- Error, warning, and success states should use both color and structure. Do not rely on color alone.
- Keyboard focus must remain visible. Prefer the shared `focus-visible` token-based ring.

## Accessibility Baseline

- Aim for WCAG AA contrast for body text and small labels where practical.
- Avoid `text-black/45` style opacity classes on beige surfaces.
- If you need secondary copy, prefer `text-ui-muted` or `text-ui-subtle`.
- If you need metadata or eyebrow copy, prefer `text-ui-faint` or `eyebrow-label`.

## Review Checklist

Before shipping UI updates:

- Check default, hover, active, selected, disabled, and focus-visible states.
- Check buttons on both light and dark surfaces.
- Check helper text, badges, and tiny uppercase labels.
- Check English and Vietnamese text lengths on the same component.
