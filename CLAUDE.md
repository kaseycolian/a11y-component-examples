# CLAUDE.md — conventions for this repo

A public, GitHub Pages–hosted reference library of WCAG 2.2 AA accessible UI components in vanilla
HTML/CSS/JS. Visitors browse, interact, and **copy** code into their own app. Not a playground —
code is read-only.

**When resuming, read `docs/BUILD-STATUS.md` first** — progress, the roster checklist, the ordered
next steps, and the gotchas already solved.

| Need | File |
| --- | --- |
| What's done, what's next | `docs/BUILD-STATUS.md` |
| The ARIA contract + keyboard map for a specific component | `docs/component-specs.md` (read one entry, not the file) |
| Original design rationale | `C:\Users\kasey\.claude\plans\this-will-be-a-curious-pnueli.md` |

To start a component: `npm run new:component -- <slug> --group <id> --name "Name"`. The templates
already satisfy every convention below, so fill in behaviour rather than boilerplate. Copy the shape
of `dropdown` (thorough) or `disclosure` (small) rather than inventing a new one.

## The three rules everything follows

1. **What you see is what you copy.** The live demo and the code panel load the *same physical
   files*. Never introduce a transform between them.
2. **A paste into a bare app must just work.** No required extra files, no unstyled result.
3. **Adding a component is adding a folder.** Nav, index, routes, and tests all derive from
   `meta.json`. If something needs hand-wiring, that's a bug in the architecture.

## Layout

```
src/library/     THE PRODUCT. Zero Astro. Pure vanilla. Never imports from src/site/.
src/site/        Astro shell (srcDir points here). Never contains component code.
src/site/theme/  Vendored theme-service files. See THEME-SERVICE.md before touching.
scripts/         sync-library (src -> public), check-tokens (linter), new-component (scaffolder),
                 rehype-scrollable-tables (wraps docs.md tables so pages don't overflow at 320px)
tests/           Site-shell specs (site-header) + the shared a11y gate every component must pass.
```

`public/library/` and `public/theme/` are **generated** by `scripts/sync-library.mjs` and
gitignored. Edit the source, never the copy.

## Component folder shape

```
src/library/components/<slug>/
  component.html   canonical accessible markup (a fragment, not a document)
  component.css    scoped to .ac-<slug>
  component.js     IIFE -> window.AC.create<Name> + auto-init block
  meta.json        slug, name, group, order, summary, tags, apg, wcag, status, files
  docs.md          rendered on the page below the code panel
  tests/<slug>.spec.mjs
```

`meta.json` `group` must be one of the ids in `src/site/lib/registry.mjs` `GROUPS`.

## Non-negotiable conventions

**CSS — every color is a three-level chain.** `scripts/check-tokens.mjs` fails CI otherwise.

```css
background: var(--ac-surface, var(--bg-panel, #110620));
/*              ^ our token     ^ theme-service   ^ standalone default */
```

Allowed bare: `transparent`, `currentColor`, and CSS system colors (`Canvas`, `Highlight`,
`ButtonBorder`, …) — the last are required inside `@media (forced-colors: active)`.

**Motion is gated, never hardcoded.**

```css
transition: color calc(var(--ac-motion, var(--motion, 1)) * var(--ac-dur, var(--dur, 150ms))) ease;
```

`--motion` resolves to 0 under `[data-motion="off"]` **or** `prefers-reduced-motion`, media query
last. The page toggle can only *add* the restriction — that's correct, don't "fix" it.

**Every component ships a `@media (forced-colors: active)` block.** Windows High Contrast drops
`color-mix`, glows, and tinted fills, so state cues vanish without it.

**JS is a plain IIFE, no `export`** — a straight paste into a `<script>` tag must work.
Every factory: idempotent, returns `destroy()`, mints its own ids, has no dependencies.
Components are **fully self-contained** — deliberately not DRY. A copy-paste library is better
served by each file standing alone.

**Naming:** classes `ac-<name>__<part>`, hooks `data-ac-<name>`, tokens `--ac-*`, globals
`window.AC.*`. The `ac-` prefix avoids collision with theme-service's `.btn` / `.input` / `.drop`.

**Targets** ≥24×24px (SC 2.5.8), 44px preferred. **Anything with an `id`** gets
`scroll-margin-top` clearing the sticky header (SC 2.4.11) — handled globally in `site.css`.

## Environment gotchas

- **Node is not on the inherited PATH.** Prefix PowerShell calls:
  `$env:Path = "C:\nvm4w\nodejs;$env:Path"` — nvm4w, Node 26.5.0, npm 11.17.
- **npm 11 gates install scripts.** `allowScripts` in `package.json` already approves esbuild and
  sharp; re-approve with `npm approve-scripts <pkg>` if a new one appears.
- **Git is 2.24** — no `git init -b`, no interactive flags.
- Bash tool has a stale `ng` alias that prints a warning before every command; harmless.

## Commands

```sh
npm run dev            # localhost:4321/a11y-component-examples/
npm run build          # prebuild syncs library -> public
npm run check:tokens   # the color linter
npm test               # Playwright a11y gate
npm run verify         # all three
```

## Deliberate deviations (do not "fix" these)

- **`components.css` is not vendored** from theme-service — it styles the same components this
  library rebuilds. Structural tokens it would have provided live in `src/site/styles/site.css`
  and `src/library/tokens/tokens.css` instead.
- **`theme-select.js` is not vendored** — the theme picker is this library's own Dropdown.
- **The project carries no licence.** No `LICENSE` file, no `license` field in `package.json`, no
  mention in the footer or README. Removed deliberately — do not add one back.
- **Dropdown uses real DOM focus on options, not `aria-activedescendant`.** Both are APG-legal;
  activedescendant is unreliable on iOS VoiceOver and TalkBack, and mobile AT support is a
  requirement here.
