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
| Why the agent-facing layer is shaped the way it is | `docs/agent-layer.md` |
| Original design rationale | `C:\Users\kasey\.claude\plans\this-will-be-a-curious-pnueli.md` |

To start a component: `npm run new:component -- <slug> --group <id> --name "Name"`. The templates
already satisfy every convention below, so fill in behavior rather than boilerplate. Copy the shape
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
                 build-agent-surfaces (renders AGENTS.md + agents/), rehype-scrollable-tables
                 (wraps docs.md tables so pages don't overflow at 320px)
tests/           Site-shell specs (site-header) + the shared a11y gate every component must pass.
AGENTS.md        GENERATED. The agent read path. Edit docs/agents/preamble.md, run npm run agents.
agents/          GENERATED, committed. The index and the per-component contracts agents read.
docs/agents/     Hand-written sources for the above.
```

**`AGENTS.md` and everything under `agents/` are output, never input.** `npm run check:agents`
re-renders them and fails CI on any difference, so a hand-edit is reverted work. Edit
`docs/agents/preamble.md` or a `meta.json`, then `npm run agents`. The layer has hard byte budgets and
the generator fails when prose pushes a surface over one — `docs/agent-layer.md` says why.

`public/library/`, `public/theme/`, `public/agents/` and `public/llms.txt` are **generated** by
`scripts/sync-library.mjs` and gitignored. Edit the source, never the copy.

## Component folder shape

```
src/library/components/<slug>/
  component.html   canonical accessible markup (a fragment, not a document)
  component.css    scoped to .ac-<slug>
  component.js     IIFE -> window.AC.create<Name> + auto-init block
  meta.json        slug, name, group, order, summary, tags, apg, wcag, status, files, contract
  docs.md          rendered on the page below the code panel
  tests/<slug>.spec.mjs
```

`meta.json` `group` must be one of the ids in `src/site/lib/groups.mjs` `GROUPS`.

`meta.json` `contract` is the agent-facing ARIA contract — `useWhen`, `aria`, `keyboard`, `states`,
`failureModes`, `api`, `seeAlso` — and it renders to `agents/components/<slug>.md`. It is **asserted
against the component**, so three of its fields carry an obligation:

- `aria` is what must be in the markup you copy. An attribute that exists only in a transient state
  (`aria-busy` while pending, `aria-invalid` after a failed validation) goes in `states`.
- a key in `keyboard` must be pressed by `tests/<slug>.spec.mjs`, unless its effect starts `native:`.
- `api` names factories really registered as `global.AC.<name>`; the demo-page wiring is left out.

Change the roles in `component.html`, a key handler, or a factory name, and revisit the contract in the
same commit — `tests/shared/agent-surfaces.spec.mjs` is what tells you if you didn't.

## Non-negotiable conventions

**CSS — every color is a three-level chain.** `scripts/check-tokens.mjs` fails CI otherwise.

```css
background: var(--ac-surface, var(--bg-panel, #110620));
/*              ^ our token     ^ theme-service   ^ standalone default */
```

Allowed bare: `transparent`, `currentColor`, and CSS system colors (`Canvas`, `Highlight`,
`ButtonBorder`, …) — the last are required inside `@media (forced-colors: active)`.

The linter also checks that the **middle** token is one theme-service actually defines. A misspelled
one does not fail — it silently resolves to the literal and stops following the theme picker, which
is invisible in a dark theme because the literal *is* a dark-theme color. `--bg-elev` (it is
`--bg-elevated`) put tooltip at 1.01:1 in every light theme.

**An accent used as *text* is mixed toward `--text`.** The accents are drawn to be vivid on a dark
page, so on a light theme surface they land at 2.7–4.2:1. The shell has `--accent-{green,blue,
purple}-text` for this; a component writes it inline, because it has to stand alone:

```css
color: color-mix(in srgb, var(--ac-accent-pink, var(--accent-pink, #ff2ec4)) 80%, var(--ac-text, var(--text, #f3ecff)));
```

Mixing toward `--text` always raises contrast against the surface, in either mode, because `--text`
is the one color a theme guarantees contrasts with its own background. Borders and tints keep the
raw accent — they are decoration and have no ratio to clear.

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

## Writing style

**American English.** `color`, `behavior`, `labeled`, `initialize`, `center`, `organization`,
`gray`, `signaled`. The only exceptions are ARIA's own spellings — `aria-labelledby` is spec.

**Never count the components.** No "5 components", no derived totals in prose or on a card. The
roster changes every session and the copy shouldn't need editing when it does. Say what the library
*is*, not how much of it there is.

**The voice is a11y-as-the-main-road.** `a11y` reads like *alley* — the side street accessibility
usually gets pushed down, visited late and in a hurry. This library's position is that it belongs on
the main road and that it can be fun. Make that point where it lands naturally; never twice on a page.

**Demo content is 90s punk, obliquely.** Song and album titles, place names and lyric fragments —
never the band names themselves. Nothing vulgar. Prefer `462` and `99` when a number is arbitrary.
Fake credentials look obviously fake but keep a valid shape (`sk_test_` prefix, right length, right
character set) so the example still teaches the format.

**Text that renders on a component page is short and scannable.** The demo titles, the `__note`
paragraphs, captions, verdicts and readout labels get one or two plain sentences each — enough to
point at what the example is showing. Everything longer goes in `docs.md` or in a source comment,
where a reader has opted in. `loading-button` is the reference. Never write "the left one" or "the
right-hand readout": the demo grid stacks its cases at every real width, so name the case instead.

**The `summary` in `meta.json` is written to a person, not to a search index.** It renders as the
lede at the top of the component page, on the index card, and as the page description, so it is the
first sentence anyone reads about the component. Say what the thing is for and what the hard part
about it is, in the order a person would explain it out loud. Two or three sentences, ~50 words.

Do **not** write it as a declarative string of clauses — `A filter chip that is a toggle button, not
a checkbox — aria-pressed carries the state, and a tick carries it where color cannot. Four live
failures: …` is the old style and reads as keywords bolted together. Write instead: *A chip is a
filter you can switch on and off, and the temptation is to reach for a checkbox. It is a button that
remembers, so `aria-pressed` is what tells a screen reader it is on — and something other than color
has to say the same thing on screen.*

Rules of thumb: lead with the reader's problem, not the ARIA attribute; name at most one attribute,
and only when it *is* the point; never enumerate the examples or count the failures — the demo notes
and the page already do that. Keep it a helpful guide, not an index entry.

**Say it once, in as few words as carry the information.** Comments and docs here are load-bearing:
they explain *why* a non-obvious accessibility decision was made, and that's the bar. Cut restated
context, cut the same point made twice in prose and again in a table, cut adjectives. Never cut the
reason a decision was made, a WCAG SC reference, or a gotcha — those are the product.

## Copyability — the demo has to be dissectable

A visitor arrives wanting *one* of the examples on the page, and has to be able to find the three
pieces that make it work. So all three files carry the **same numbered sections in the same order**:

```
EXAMPLE 3 · Server-rendered error
```

- **`component.html`** — one banner per example, with a visible `<h3 class="ac-demo__title">` so the
  rendered demo and the HTML tab match by eye.
- **`component.css` / `component.js`** — sectioned by *concern*, since concerns are shared. Every
  section header names which examples need it: `[CORE — all examples]`, `[3, 5, 6]`,
  `[OPTIONAL — delete if your framework validates]`.
- **Each file opens with a copy map**: a few lines saying "want just example 2? take these
  sections." The whole file is the fully-fledged library version; the map is how someone takes less.

`ac-demo-*` and `ac-demo__*` are **demo scaffolding, never part of a component** — the grid, the
per-example headings, the legend. They live in `src/site/styles/site.css`, **not** in any
`component.css`, so that everything in a component's own files is real component code. Use the
classes in `component.html` and say in the file header that they are not to be copied.

**An example that is broken on purpose says so in the markup.** The shared a11y gate
(`tests/shared/a11y.spec.mjs`) drives every component, and most pages ship a live failure, so the
failing element carries `data-ac-demo-broken="<check> <check>"` naming the checks it is expected to
fail — any axe rule id, plus `focus-visible` (SC 2.4.7) and `target-size` (SC 2.5.8). The gate does
not skip them, it **asserts they still fail**: an example that quietly stops being broken fails the
build too. Another demo-scaffolding attribute, never copied.

Two traps come with it. A violation *inside* a marked element that is not in its list is still a
failure, so the list stays specific. And a good rule written for the whole file will reach the
broken variant and repair it — `.ac-t-broken-link` has to keep the raw accent while every other
accent in the library is mixed toward `--text`, or typography's example 4 stops being a failure.
The same shape as a `[FORCED]` block reaching a broken variant.

**Every `docs.md` states the framework caveat once**, near the top: your framework probably has a
better idiom for this, but the ARIA attributes and their wiring are the same either way, and this is
enough for a person or an agent to start from. Don't apologize for it beyond that.

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
npm run build          # prebuild syncs library + agents -> public
npm run check:tokens   # the color linter
npm run agents         # render AGENTS.md + agents/ (run after editing any meta.json)
npm run check:agents   # --check: fail if a surface drifted from its source
npm test               # Playwright a11y gate
npm run verify         # both linters, then build, then test
```

## Deliberate deviations (do not "fix" these)

- **`components.css` is not vendored** from theme-service — it styles the same components this
  library rebuilds. Structural tokens it would have provided live in `src/site/styles/site.css`
  and `src/library/tokens/tokens.css` instead.
- **`theme-select.js` is not vendored** — the theme picker is this library's own Dropdown.
- **The project carries no license.** No `LICENSE` file, no `license` field in `package.json`, no
  mention in the footer or README. Removed deliberately — do not add one back.
- **Dropdown uses real DOM focus on options, not `aria-activedescendant`.** Both are APG-legal;
  activedescendant is unreliable on iOS VoiceOver and TalkBack, and mobile AT support is a
  requirement here.
