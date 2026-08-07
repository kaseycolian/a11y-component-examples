# CLAUDE.md — conventions for this repo

A public, GitHub Pages–hosted reference library of WCAG 2.2 AA accessible UI components in vanilla
HTML/CSS/JS. Visitors browse, interact, and **copy** code into their own app. Not a playground —
code is read-only.

**This file is the contributing contract, and it is the only thing it is.** You are working *on* the
library: adding a component, changing one, or building the site around it. Consuming the library —
copying a component into some other app — is a different contract with its own entry point, `AGENTS.md`,
which is a fraction of the size and written for exactly that. Nothing in this file is needed to consume
the library, and none of it should be paraphrased into `agents/`.

The two contracts share one thing: **where a component's behavior comes from.** That is
`agents/components/<slug>.md` and the component's own files, for both audiences. Neither
`docs/BUILD-STATUS.md` nor this file answers what a component does.

**When resuming build work, read `docs/BUILD-STATUS.md` first** — progress, the roster checklist, the
ordered next steps, and the gotchas already solved. It is a build log and nothing else: never the place
to look up how a component behaves.

**The library-wide copy and structure pass is finished** — all 33 components, and the site's own copy.
Every component page has the same shape, the same voice and the same demo vocabulary.
`docs/rewrite-pass.md` is the record: read its **style rules** before touching any human-facing
string, and its roster row for a component before changing that component's writing.

| Need | File |
| --- | --- |
| What's done, what's next | `docs/BUILD-STATUS.md` |
| The writing style every human-facing string follows | `docs/rewrite-pass.md` |
| The ARIA contract + keyboard map for a **built** component | `agents/components/<slug>.md` — generated from its `meta.json` and asserted against the shipped markup |
| The up-front design decisions behind one, and its CSS gotchas | `docs/component-specs.md` (read one entry, not the file) |
| What a component assumes about the page it lands in | `agents/conventions.md` — the reasoning behind **Non-negotiable conventions** below |
| What to run after a change, and what a failure means | `docs/sync-process.md` |
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
src/site/styles/ Site shell CSS. The header and footer are ports of theme-service's own —
                 see A11Y-WAY-PAGES.md there before restyling either.
scripts/         sync-library (src -> public), check-tokens (linter), new-component (scaffolder),
                 build-agent-surfaces (renders AGENTS.md + agents/ + the skill),
                 install-skill (links the skill into ~/.claude/skills/ so other repos can use it),
                 rehype-scrollable-tables (wraps docs.md tables so pages don't overflow at 320px)
tests/           Site-shell specs (site-header) + the shared a11y gate every component must pass.
AGENTS.md        GENERATED. The agent read path. Edit docs/agents/, run npm run agents.
agents/          GENERATED, committed. The index, the per-component contracts, and the four
                 cross-cutting surfaces (pitfalls, conventions, verify, testing) agents read.
.claude/skills/  GENERATED, committed. The same read path as a Claude Code skill.
docs/agents/     Hand-written sources for the above: preamble.md + four *.src.md.
```

**`AGENTS.md`, everything under `agents/`, and the skill are output, never input.** `npm run
check:agents` re-renders them and fails CI on any difference, so a hand-edit is reverted work. Edit a
file in `docs/agents/` or a `meta.json`, then `npm run agents`. The layer has hard byte budgets and the
generator fails when prose pushes a surface over one — `docs/agent-layer.md` says why.

**Nothing may clear `.claude/`.** The generator rebuilds `agents/` from scratch each run; giving
`.claude/` the same treatment would delete `settings.local.json`, which is machine-specific, gitignored,
and unrecoverable. The skill is written in place, and a file under `.claude/skills/` counts as the
generator's only if it carries the do-not-edit marker — so a skill of your own beside it is safe.

`scripts/install-skill.mjs` is the same rule from the other side. It writes only outside this repo:
the link at `~/.claude/skills/a11y-library` and the config beside it, nothing else under `.claude/`.
It imports `SKILL_NAME`, `SKILL_OUT`, `CONFIG_FILE` and `readBaseUrl` from the generator rather than
restating them, so renaming the skill folder or the config cannot be half-done.

**An accessibility finding has four homes and belongs in exactly one.** A fact about the platform that
makes correct-looking markup wrong → `docs/agents/pitfalls.src.md`. A fact about Playwright or axe that
makes a correct assertion wrong → `testing.src.md`. Something a copied component assumes about the page
it lands in → `conventions.src.md`. Anything about working *on* this repo → the gotchas list in
`docs/BUILD-STATUS.md`. Writing it twice is the drift this layer exists to prevent. Only one overlap is
checked — the CSS shapes shared with **Non-negotiable conventions** below — so the rest is on you.

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

`meta.json` `contract` is the agent-facing ARIA contract — `useWhen`, `root`, `aria`, `keyboard`,
`states`, `failureModes`, `api`, `seeAlso` — and it renders to `agents/components/<slug>.md`. It is
**asserted against the component**, so four of its fields carry an obligation:

- `root` is the selector(s) that *are* this component on its demo page. It cannot be guessed from the
  slug — `checkbox` is `.ac-choice`, `text-input` is `.ac-input`, `fieldset-group` is `.ac-group` —
  and every ARIA check scopes itself to it, so a wrong one checks nothing.
- `aria` is what must be in the markup you copy. An attribute that exists only in a transient state
  (`aria-busy` while pending, `aria-invalid` after a failed validation) goes in `states`, named there:
  `"invalid — aria-invalid=true on the control, set only while the error shows"`.
- a key in `keyboard` must be pressed by `tests/<slug>.spec.mjs`, unless its effect starts `native:`.
- `api` names factories really registered as `global.AC.<name>`; demo-page wiring is left out, and is
  what the `create<Name>Page` suffix is for.

**Edit the component, revisit its contract in the same commit.** The generator never opens
`component.html`, `component.css` or `component.js`, so `check:agents` cannot see any of this —
`tests/shared/agent-surfaces.spec.mjs` is what tells you, and it reads the component both ways.

| You changed | Revisit | What tells you |
| --- | --- | --- |
| a role or `aria-*` in `component.html` | `contract.aria`, or `states` if it is transient | checks 2 and 12 |
| the class on a component element | `contract.root` | check 12 — it fails rather than silently sweeping nothing |
| a key handler in `component.js` | `contract.keyboard` **and** the spec | checks 3 and 13 |
| a factory name | `contract.api` | checks 4 and 14 |
| the `summary` | `contract.useWhen` — the agent-facing version of the same sentence | `check:agents`, which names the component |

The last row is the one no check can really cover: `summary` renders into no agent surface, so nothing
can tell whether the two still agree. What fires is a fingerprint — the failure says *the summary
changed, go reread `useWhen`*, and only a person can decide whether it still holds.

## Non-negotiable conventions

The rules and the shapes to type, with what enforces each. `agents/conventions.md` is the same set
written to whoever is pasting a component *out*, with the reasoning attached — read that one when you
need to decide whether a rule applies somewhere else, or to explain why it exists.

**The three CSS shapes below also appear in `docs/agents/conventions.src.md`, verbatim.** That is a
deliberate duplication — one file is a checklist and the other is an explanation — and
`tests/shared/agent-surfaces.spec.mjs` asserts they still match, treating this file as canonical. Change
a token name, a percentage or a duration here, and change it there in the same commit.

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

**The voice is direct, dry, and definitive.** Say what a thing is and what it does. No metaphor, no
aphorism, no sentence whose subject is a concept ("A spinner is silent"). Never open with a paradox
or a reversal — open with the component. One idea per sentence; prefer a period to an em dash. Name
an attribute when the attribute is the point, and do not name three in a lede. Never apologize for
the library and never hedge about frameworks.

**Demo content is one generic business app**, shared across every component so a reader never
context-switches: people (`Jordan Lee`), `@example.com` addresses, `Order 462` / `Invoice 99`,
actions like `Save changes` and `Delete project`, fields like `Work email` and `Full name`, statuses
like `Shipped` / `Pending` / `Failed`. Prefer `462` and `99` when a number is arbitrary. Fake
credentials look obviously fake but keep a valid shape (`sk_test_` prefix, right length, right
character set) so the example still teaches the format. The full vocabulary table is in
`docs/rewrite-pass.md`.

**Text that renders on a component page is short and scannable.** The demo titles, the `__note`
paragraphs, captions, verdicts and readout labels get one or two plain sentences each — enough to
point at what the example is showing. Everything longer goes in `docs.md` or in a source comment,
where a reader has opted in. Never write "the left one" or "the right-hand readout": the demo grid
stacks its cases at every real width, so name the case instead.

**An example title names what the example contains, not what it argues.** `2 · State shown by color
only`, not `2 · Pressed is not a color`.

**The `summary` in `meta.json` is written to a person, not to a search index.** It renders as the
lede at the top of the component page, on the index card, and as the page description, so it is the
first sentence anyone reads about the component. Two or three sentences, ~50 words, in this order:
what it is, what it is for, the one thing that makes it hard.

```
A filter chip is a button that stays pressed. Use it to switch a filter on and off without
submitting a form. It is not a checkbox, so `aria-pressed` carries the state, and the on state
needs a second cue besides color.
```

Never enumerate the examples or count the failures — the demo notes and the page already do that.

**`docs.md` has one canonical heading order**, and `docs/rewrite-pass.md` is where it is written
down: Before you copy, Required markup, Keyboard, States, Screen reader behavior, up to two
component-specific sections, API, Using it in a framework, Common mistakes, Related. `## Keyboard`
is mandatory even when the native element supplies every key.

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

- **`component.html`** — one banner per example, with a visible `<h4 class="ac-demo__title">` so the
  rendered demo and the HTML tab match by eye.
- **`component.css` / `component.js`** — sectioned by *concern*, since concerns are shared. Every
  section header names which examples need it: `[CORE — all examples]`, `[3, 5, 6]`,
  `[OPTIONAL — delete if your framework validates]`.
- **Each file opens with a copy map**: a few lines saying "want just example 2? take these
  sections." The whole file is the fully-fledged library version; the map is how someone takes less.

**Correct examples and mistakes are two separate sections**, correct first, so a visitor can tell at a
glance which markup to take. Both live in `component.html`:

```html
<div class="ac-demo-section">
  <h3 class="ac-demo-section__title">Correct examples</h3>
  <p class="ac-demo-section__note">One sentence on what this group shows.</p>
  <div class="ac-demo-grid"> … </div>
</div>
<div class="ac-demo-section ac-demo-section--mistakes">
  <h3 class="ac-demo-section__title">Common mistakes</h3>
  …
</div>
```

Examples stay numbered `1..N` **continuously across both sections** so the `EXAMPLE 3 ·` banners in the
CSS and JS still line up. An example that ends with the fix but exists to show the mistake belongs in
*Common mistakes*. The page is `h1` → `h2 Live example` → `h3` section → `h4` example, and axe's
`heading-order` runs on it — never skip a level. Omit the second section only when the component
genuinely has no counter-example.

`ac-demo-*` and `ac-demo__*` are **demo scaffolding, never part of a component** — the grid, the two
section headings, the per-example headings, the legend. They live in `src/site/styles/site.css`, **not**
in any `component.css`, so that everything in a component's own files is real component code. Use the
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

**Every `docs.md` opens with the same `## Before you copy` paragraph.** It says these files are a
working reference rather than a package, that the reader moves the markup into their own templates and
the state into their own code, and that the ARIA, the keyboard behavior and the focus handling are what
has to survive that move. It never says the reader's framework has a better version of this — the
verbatim text is in `docs/rewrite-pass.md`.

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
npm run install:skill  # link the skill into ~/.claude/skills/ (writes nothing in the repo)
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
