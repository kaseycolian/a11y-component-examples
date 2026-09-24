# Theme Service

This app's theming comes from the shared **theme-service** — currently on version `1.4.2`.
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
| `theme.css` | Color tokens for every theme in the index, heading accents (`--accent-h1`…`--accent-h4`) and backdrop choice (`--fx-backdrop-*`) included. Generated build output upstream — never hand-edit. |
| `effects.css` | Glow / backdrop (grid, or NEO's rain) / scrollbar recipes and the `--motion` gate. Upstream's copy is CRLF; it is vendored as LF, per `.gitattributes`. |
| `themes.index.json` | Theme registry. The theme picker is generated from this at build time. |
| `theme-init.js` | Pre-paint bootstrap: applies the saved (or `?theme=` / `?motion=`) choice before first paint so there is no flash. Loaded from `<head>` as an external script. |

## Vendored brand assets

`The A11Y Way` is one brand across two apps, so the header lockup and the tab icon are shared with
the theme-service rather than redrawn here. These four are copied **verbatim** from that repo's
`a11y-way-pages/assets/` folder (`assets/` until the brand moved there in 1.3.0) and live in
`public/brand/`, not here — they are served to the browser, and
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
  the sticky site header alongside a motion toggle. Lists every theme in `themes.index.json`, one
  group per family, plus **Auto** in a "System" group. Both labels are composed in
  `src/site/lib/themes.mjs` from the index's `name` / `group` / `description`: a row shows the short
  one ("Dark · No Background") and the trigger the full one. How the Custom Select gets the full name
  without upstream's `data-dropdown-full-label` is deviation 19 in `src/site/styles/A11Y-WAY-PAGES.md`.
- **Background effect:** none on the shell. `.fx-grid` is not on the page, the header or the footer.
  The `effects` component's demo panels are the only `.fx-grid` elements, because the backdrop is that
  page's subject, so NEO's rain shows only there. The header's Reduce motion switch stops it.
- **Heading accents:** read, through `--heading-1` to `--heading-3` in `site.css`. This site's scale
  runs pink, blue, green and theme-service's runs pink, green, blue, so h2 takes a theme's
  `--accent-h3` and h3 its `--accent-h2`. A theme with no headings of its own sets those to the same
  plain accents, so only NEO looks different: its h1 to h3 are green.
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
   defined by the vendored files. `skill/library/tokens/tokens.css` defines those same names with the
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
- `2026-09-24` — Updated to `v1.4.2`, from `v0.3.0`. The source's build output was regenerated
  first, because it still carried a `1.4.1` stamp; nothing else in it moved. Re-vendored `theme.css`,
  `effects.css`, `themes.index.json` and `theme-init.js`.
  - **NEO**, a new family: `neo-dark`, `neo-light` and a No Background variant of each, so 20
    themes. The picker reads them from the index, so they appeared with no code change.
  - `theme.css`: no existing value changed. Every theme gained `--accent-h1`…`--accent-h4` and
    `--fx-backdrop-*`.
  - `effects.css`: the `--glow-strength` fallback moved under `:where()`, so the light themes get
    their own 0.35 glow. It had been pinned to 1. `.fx-grid::before` draws NEO's rain from the
    backdrop tokens and stops under `data-motion="off"` or `prefers-reduced-motion`.
  - `themes.index.json`: a theme's name is three parts (upstream 1.2.0), and `label` changed value.
    `themes.mjs` appended the mode to `label`, which would have said it twice, so it now composes
    the name from the parts.
  - Headings read the theme's heading accents (see "Heading accents" above). NEO's came out in its
    steel grey and are green now; every other theme is unchanged.
  - NEO failed two contrast checks no other theme did, both in components. `effects` example 5
    labeled its swatches on 42% of the purple slot, which NEO makes pale mint on dark and near-black
    on light; the labels sit on the panel color now. `badge` digits went from 80% to 70% toward
    `--text`, because NEO's light green reached only 4.47:1 on its own 18% tint.
  - Brand assets re-copied from `a11y-way-pages/assets/`: three byte-identical, and
    `brand-mark-theme.js` differed only in a comment.

  Verified: `check:encoding`, `check:tokens`, `check:readouts`, `check:agents`, and the full
  Chromium suite on a fresh build, where every per-theme contrast sweep now includes NEO dark and
  light. 1356 of 1357 passed; the failure was the badge above, and its tests and the byte check
  re-ran green after the fix.
