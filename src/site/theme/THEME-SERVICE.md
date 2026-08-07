# Theme Service

This app's theming comes from the shared **theme-service** — currently on version `0.3.0`.
The files in this folder are vendored copies of the source of truth; do not hand-edit generated
token files, and do not hardcode colors — consume the theme tokens (`var(--…)`).

## For agents working in this repo

This repo **already uses the theme-service** (see History below). Use the **theme-service skill**
(or its `AGENTS.md`) for any theme work here — don't improvise, and don't re-apply from scratch.

- Update to latest: "Update this repo to the latest theme-service version."
- Add/change themes: see the theme-service repo's `CREATING-THEMES.md`.

Rules: keep WCAG AA 2.2 · default theme is Rink Classic · never use inline scripts (the theme
bootstrap is the external `theme-init.js`).

## Vendored files

| File | Purpose |
|------|---------|
| `theme.css` | Color tokens for all 16 themes. Generated build output upstream — never hand-edit. |
| `effects.css` | Glow / grid / scrollbar recipes and the `--motion` gate. |
| `themes.index.json` | Theme registry. The theme picker is generated from this at build time. |
| `theme-init.js` | Pre-paint bootstrap: applies the saved (or `?theme=` / `?motion=`) choice before first paint so there is no flash. Loaded from `<head>` as an external script. |

## Vendored brand assets

`The A11Y Way` is one brand across two apps, so the header lockup and the tab icon are shared with
the theme-service rather than redrawn here. These four are copied **verbatim** from that repo's
`assets/` folder and live in `public/brand/`, not here — they are served to the browser, and
`public/` is the only place Astro serves static files from. They are committed: `.gitignore` and
`scripts/sync-library.mjs` both name the generated `public/` subfolders individually, and
`public/brand/` is not one of them.

| File | Purpose |
|------|---------|
| `favicon.svg` | The alley-and-arch tile. Paints from `--a11y-theme-*` with brand-color fallbacks, so it stands alone as a static icon. |
| `favicon-theme.js` | Progressive enhancement: reads the live tokens off `<html>`, inlines them onto the SVG, and swaps in a `data:` URI. Re-runs on `data-theme` change. |
| `brand-mark.svg` | The arch alone, lifted out of the tile so it reads at 26px beside the wordmark. Paints from `--accent-pink` / `--accent-green`. |
| `brand-mark-theme.js` | The same trick for `img.brand-mark` in the header, which is an isolated document the page's custom properties never reach. |

Re-copy all four on a theme-service update; they are not generated from `theme.css` and the update
script will not know about them. Nothing else about them is repo-specific.

The header and footer that *use* these assets are a separate contract with a separate skill
(`a11y-way-pages`). Their record — what was ported, what was deliberately changed, what a re-sync
must not revert — is `src/site/styles/A11Y-WAY-PAGES.md`.

## Applied configuration (current decisions on record)

- **Component styling:** `full-restyle` — this repo *is* a component library. Its components are
  built from scratch against the theme tokens and reproduce the visual language of the
  theme-service's `discovery/draft-3/index.html` gallery.
- **Fonts:** replaced with the theme fonts (`--font-ui` / `--font-mono`).
- **Selector:** custom — built from this library's own Custom Select component (dogfooding), placed in
  the sticky site header alongside a motion toggle. Lists all 16 themes grouped Dark / Light, plus
  an "Auto (system)" option.
- **Existing themes:** none (greenfield).

### Deliberate deviations from the standard apply

Two files the skill normally vendors are **intentionally not** vendored. Both are recorded here so
a future update session does not "fix" their absence:

1. **`components.css` is not vendored.** It styles `.btn` / `.input` / `.drop` / `.tab` — the same
   components this library rebuilds accessibly. Vendoring it would create two competing sources of
   truth for every component and collide on class names. Our components consume the *tokens*
   directly instead.

   Consequence: the structural tokens that live in `components.css` (`--font-ui`, `--font-mono`,
   `--radius`, `--radius-sm`, `--radius-pill`, `--dur`, `--press-y`, `--press-s`) are **not**
   defined by the vendored files. `src/library/tokens/tokens.css` defines those same names with the
   same semantics, so a repo that later adds `components.css` stays compatible.

2. **`theme-select.js` is not vendored.** The theme picker is the library's own Custom Select component,
   which supports a swatch per option — a better showcase than a bare `<select>`, and it keeps the
   site built from the components it documents. Since the Custom Select became authored markup there is no
   `<select>` behind it at all: `SiteHeader.astro` writes the trigger, the panel and every option, and
   the header script talks to it through `ac:dropdown:change` and `setValue()`. `theme-init.js` (the
   anti-flash bootstrap) *is* vendored and used as shipped.

### Motion behavior worth knowing

Per `effects.css`, `--motion` resolves to `0` under `[data-motion="off"]` **or**
`prefers-reduced-motion: reduce`, and the media query is last in the cascade. So the site's motion
toggle can only *add* the restriction — it cannot re-enable animation for a visitor whose OS asks
for reduced motion. That is correct behavior and is documented for visitors on the Reduced Motion
page rather than worked around.

## History

<!-- Append one entry per apply/update. Most recent last. Never edit past entries. -->

- `2026-07-27` — Applied theme-service `v0.3.0` to a greenfield repo. Vendored `theme.css`,
  `effects.css`, `themes.index.json`, and `theme-init.js` into `src/site/theme/`. Deliberately
  skipped `components.css` and `theme-select.js` (see "Deliberate deviations" above). Theme picker
  and motion toggle placed in the sticky site header, built from this library's own Custom Select and
  Switch components.
- `2026-07-30` — Redesigned the site header to match the theme-service's own
  (`assets/site-header.css`), so the two apps read as one brand. Vendored the four brand assets
  above into `public/brand/`; no change to the theme files themselves.
