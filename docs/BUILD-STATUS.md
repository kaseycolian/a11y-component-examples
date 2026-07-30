# Build status

**Resume point.** `CLAUDE.md` (auto-loaded) has the conventions. This file has progress and the
ordered next steps. `component-specs.md` has the pre-decided ARIA contract for every remaining
component — read the one entry you need, not the whole file.

Read in this order and nothing else is needed to start: **START HERE** for the next component,
**The road to done** for the route and what depends on what, **The loop** for how to build one.
**Gotchas already solved** is worth a skim before debugging anything.

**Keep this file current.** Tick the roster row as each component lands, or the next session
re-does work.

Last updated: 2026-07-30 (**the agent layer is complete — all eight phases**, see item 5; suite is
**1164/1164** in Chromium. Playwright **firefox is installed but has never been run**, webkit is not
installed; the `summary` voice changed on 2026-07-28, see item 0a)

---

## START HERE — every component group except `compositions` is complete, and the gate is in. Do batch F next.

The shared a11y gate is `tests/shared/a11y.spec.mjs`: ten checks against all 33 components, 330
tests, and `.github/workflows/ci.yml` runs it. It went in before batch F for the reason recorded
below — its value is catching a regression across everything already built — and that paid off
immediately. **It found nine real defects, including two that made whole pages unreadable in half
the shipped themes.** The list is in "What the gate found" below and every one is fixed.

Read that list before touching CSS. Three of its findings are now conventions in `CLAUDE.md`:
the middle link of a token chain has to be a token that exists, an accent used as *text* is mixed
80% toward `--text`, and an example that is broken on purpose says so in the markup with
`data-ac-demo-broken`.

**Read the `summary` rule in `CLAUDE.md` under Writing style before writing any `meta.json`.** It
changed on 2026-07-28: the lede is prose written to a person, two or three sentences, leading with
the reader's problem rather than the ARIA attribute, and **never enumerating or counting the
examples**. `status-text` onward is written to it; everything earlier is the sweep in item 0a. The
same session tightened the on-page copy rule (item 0b).

**Done, and it is not a component.** The **agent-facing layer** — `docs/agent-layer.md` is the record and
item 5 below tracks it. Read that file before touching `AGENTS.md`, `agents/`, `.claude/`, or
`scripts/build-agent-surfaces.mjs`; the short version is that agents get a four-tier read path with hard
token budgets, every surface is rendered from one manifest so they cannot drift, and the human pages are
not touched. **All eight phases are done** — all four tiers ship, every component has a `contract` block,
the cross-cutting surfaces (`agents/{pitfalls,conventions,verify,testing}.md`) are written, a generated
Claude Code skill at `.claude/skills/a11y-library/SKILL.md` is the third Tier 0 door, `CLAUDE.md` and
`README.md` say which audience they serve, `npm run check:agents` fails if any surface drifts from its
source, and `tests/shared/agent-surfaces.spec.mjs` fails if a contract lies about the markup **or is
silent about it** — phase 7 added the reverse direction, so ARIA, a key handler or a factory added to a
component fails until its contract catches up. Nothing under `agents/`, `AGENTS.md` or `.claude/skills/`
is hand-editable; edit a file in `docs/agents/` or a `meta.json`, then run `npm run agents`.

**If you edit a component, its contract is part of the edit.** `CLAUDE.md` > **Component folder shape**
has the table of which change obliges which field. Batch F is the next work.

**This file is a build log and only that.** It is where progress, the roster checklist, the ordered next
steps and the repo-local gotchas live. It is never where a component's behavior is looked up — that is
`agents/components/<slug>.md` and the component's own files, for contributors as much as for agents.
Every agent-facing surface names this file exactly once, in the rule forbidding it.

### The steps, in order

**Step 1 — batch F**, `app-page-to-markdown`. It composes the others and every piece it needs now
exists. Its scrollable preview is `prose-surface` plus `effects`' `fx-scroll` and its `[PATCH]` ring —
build it out of those rather than from scratch. The gate now covers each new component the moment its
folder exists, so a batch F page that ships an accent as text, or a target under 24px, is red before
it is reviewed.

**Then** item 3 (docs) and item 4 (deploy), plus the two copy sweeps 0a and 0b, which can land any
time and pair naturally with each other.

Two standing caveats for every step above. The header is two rows tall, so a demo that scrolls an
anchor into view clears `--header-h`, not 4.5rem. And a component page that ships a live failure
has to mark it — an unmarked one fails the gate, and a marked one that stops failing does too.

### What the gate found

Nine defects, all fixed in the same session. The first two are the reason to run a sweep at all:
every test in the library was green and both had been there since the shell was written.

1. **The copy panel shipped a hardcoded dark syntax theme** — `<Code>` from `astro:components` does
   **not** inherit `markdown.shikiConfig`, so while `docs.md` fences got the dual-theme custom
   properties `site.css` was written for, the panel emitted `github-dark` as inline
   `style="color:#…"` on every token. Inline styles beat the stylesheet, so the rules selecting
   `--shiki-light` had never once applied. In the five light themes the code sat at **1.2:1** — the
   thing the whole library exists to show, unreadable. Both consumers now share
   `src/site/lib/code-theme.mjs`, and the pair is `github-*-high-contrast` because plain
   `github-dark`'s comment color is 3.84:1 on the darkest code surface.
2. **`--bg-elev` is not a token** — it is `--bg-elevated`. `tooltip` had been resolving to its
   standalone literal `#1b0c30` in every theme, which is invisible in a dark one and is dark text on
   a dark fill in a light one: **1.01:1**. `--accent` (it is `--accent-blue`) did the same in
   `data-table`, `jump-nav`, `prose-surface` and `tabs`, which quietly ignored the theme picker
   entirely. `scripts/check-tokens.mjs` now fails on a middle token nothing defines, with
   `--dur-slow` and `--backdrop` allow-listed because theme-service genuinely ships neither.
3. **An accent used as text fails SC 1.4.3 in the light themes** — 40 distinct selectors across the
   shell and 20 components. The accents are drawn to be vivid on a dark page; on a light surface
   they land at 2.7–4.2:1, and on a tint *of themselves* (a badge, a selected tab, the current
   sidebar link) worse. Measured across all ten themes and four accents: raw fails 7 of 40
   combinations, 80% toward `--text` fails none at a 12% tint, and the sidebar's 14–16% tint needs
   65%. The shell's `--accent-*-text` are 60%; components write the mix inline.
4. **`code { background: color-mix(--text 10%) }` with no color of its own** — the tint pulls the
   surface toward the text color, so muted text inside a `<code>` came out at **2.28:1 in every
   theme**. Inline code is content and now takes the full `--text`.
5. **`<ol role="log">` is not allowed** — ARIA in HTML permits no live-region role on a list
   element. `live-region`'s example 5 now puts `role="log"` on a wrapping `<div>`, which also gave
   the scroller the `tabindex="0"` it needed once it had lines in it.
6. **Two navigation landmarks named "On this page"** — `jump-nav`'s example 1 and example 5's
   *named* case collided, on the page whose fifth example is about exactly that. Example 5 is
   "Album sections" now.
7. **Twelve `docs.md` comparison tables had an empty corner `<th>`.** Each got a word.
8. **A bare 16px link alone in a paragraph gets no inline exception** to SC 2.5.8 — there is no
   surrounding sentence constraining it. `tabs`' panel links are padded to the floor.
9. **`h3` is 17.6px bold, which is not large text** — 18.66px is the threshold, so it needs the full
   4.5:1 where `h1` and `h2` clear 3:1 and keep the raw accent.

And one the gate caused rather than found, which is worth more than any of them: **the codemod that
fixed finding 3 repaired `typography`'s deliberately broken link**, whose entire example is a link
told apart from its sentence by color alone at 1.27:1. `typography`'s own spec caught it. That is
the argument for `data-ac-demo-broken` asserting rather than skipping, and it is the same shape as a
`[FORCED]` block reaching a broken variant.

---

## The road to done

The unticked rows in the roster below, plus four infrastructure items. Every remaining component has a spec entry
in `component-specs.md` — `disclosure` is the only slug in the repo without one, and backfilling it is
part of item 1 below. **Read the entry, do not redesign it.**

Build in this order. The order is the dependency graph, not a preference.

| Batch | Slugs | Why here |
| --- | --- | --- |
| ~~**A**~~ | ~~`effects`~~ | **Done.** Closed `foundations` |
| ~~**B**~~ | ~~`button` → `icon-button` → `loading-button` → `chip-toggle`~~ | **Done.** Closed `buttons-actions` |
| ~~**C**~~ | ~~`notice` → `status-text` → `badge` → `result-panel`~~ | **Done.** Closed `feedback-status` |
| ~~**D**~~ | ~~`tabs` → `jump-nav`~~ | **Done.** Closed `navigation` |
| ~~**E**~~ | ~~`data-table` → `prose-surface`~~ | **Done.** Closed `data-display` |
| **F** | `app-page-to-markdown` | **last.** It composes the others and cannot be built before them |

Cross-batch notes that will otherwise be rediscovered:

- **`.ac-btn` now lives in `button` and the local copies stay.** `.ac-motion__btn` in
  `motion-preferences`, the addon buttons in `input-group`, `modal`, `drawer` and `tooltip`, and the
  `[BTN]` sections of `icon-button`, `loading-button` and `chip-toggle` are deliberate duplicates —
  components are not DRY here. A change to `.ac-btn` is a change in all **eight**.
- **The `feedback-status` four split one argument and none of them re-opens it.** `notice` owns
  SC 1.4.1's glyph-versus-word and static-versus-announced; `status-text` owns what both become at
  one-word scale (no prefix, no container, no focus); `badge` owns the *number* needing a subject,
  and the fact that a live region is not part of an ancestor's name; `result-panel` owns the
  arrangement — the panel announces and nothing inside it does. Anything later that shows a
  computed value points at `result-panel` rather than re-deriving it.
- **`.ac-result__btn` is a fifth copy of `input-group`'s addon button**, alongside the copies in
  `modal`, `drawer` and `tooltip`. Deliberate; a change to that button is a change in all five.
- **`tabs` owns the keyboard-map trade and the `aria-current` handoff.** Roving tabindex versus one
  stop per control is argued from both sides — `chip-toggle`'s example 5 keeps its stops,
  `tabs` gives them up — and `aria-selected` versus `aria-current` (and `page` versus `location`) is
  its example 5. `jump-nav` and anything later with a strip of controls points at it rather than
  re-deriving either. `src/site/components/CodePanel.astro` still has its own older copy of the
  pattern and is a candidate for the item 1 retrofit.
- **`jump-nav` owns everything about following a fragment.** Where focus goes when the target cannot
  take it, `scroll-margin-top` against a sticky header (SC 2.4.11), and `IntersectionObserver`
  against a scroll handler. Anything later that moves someone within a page — `prose-surface`, both
  batch F apps — points at it rather than re-deriving any of the three.
- **`data-table` owns the named scroll region.** `.ac-table-scroll` is `tabindex="0"` +
  `role="region"` + `aria-labelledby` pointing at the caption's id, so the name is written once and
  the region and the table agree. `prose-surface` and `app-page-to-markdown`'s preview are the same
  three attributes; point at it rather than re-deriving them. It also owns the argument against the
  responsive card restyle, and the fact that a `<caption>` is not only the name.
- **`prose-surface` owns styling markup you did not write.** Element selectors inside a container,
  the heading-cascade guard that makes them survive a host page, `<pre>` as a scroller inside a
  scroller, the `<figure>`/`<blockquote>`/`<figcaption>` split, and the argument that a region with
  nothing to scroll is a stop and a landmark that do nothing. `app-page-to-markdown`'s preview is
  this component plus `fx-scroll`; point at it rather than rebuilding it.
- **Batch F composes with `effects`** — `app-page-to-markdown` is specified around `fx-bar-top`,
  `fx-scroll` and `fx-bar-bottom`, which are now documented and patched. Its scrollable preview is
  the `fx-scroll` case: `tabindex="0"` + `role="region"` + a name, and the focus ring from
  `effects`' `[PATCH]`.

Then the four items under **Remaining non-component work**, in this order:

1. **`disclosure` retrofit + spec backfill** — any time, and best as a session warm-up rather than
   squeezed onto the end of one. It is the only component off-convention. The gate already covers it
   (it selects `.demo`, the shell's wrapper, not `.ac-demo-grid`), so the retrofit is about the
   copyability conventions only.
2. ~~**The shared a11y gate (item 2).**~~ **Done, 2026-07-29.** Landed before batch F, and the bet
   paid — see "What the gate found".
3. **Docs (item 3)** — now unblocked, and `wcag-mapping.md` has something real to be generated
   against: the gate names an SC in almost every check.
4. **Final verification and deploy (item 4)** — last. Two known blockers are already written up below:
   WebKit is not installed, so `npm run verify` fails at the test step until
   `npx playwright install webkit` (Firefox was installed on 2026-07-29 but has never been run, so
   budget for real cross-engine failures rather than none); and GitHub Pages **Source** must be set to
   **GitHub Actions** by hand or a green deploy publishes nothing.

**Close every session by updating this file** — tick the roster row with what was found (not just
that it passed), replace the START HERE block with the next component and its pre-decided
constraints, and add anything that cost more than ten minutes to the gotchas list. A session that
does not do this makes the next one redo its work. Then:

```sh
npm run check:tokens && npm run build && npx playwright test --project=chromium
```

---

## The loop for building one component

Designed so a session can do one component without reading anything else:

```sh
npm run new:component -- <slug> --group <group-id> --name "Display Name"
```

1. Read that component's entry in `docs/component-specs.md`. The pattern, ARIA, keyboard map and
   gotcha are already decided — implement, do not redesign.
2. Fill in the scaffolded `component.html` / `.css` / `.js`. The templates already satisfy the token
   chain, the motion gate, the forced-colors block and the IIFE + `destroy()` shape.
3. Fill in `meta.json` (summary, tags, apg, wcag) and set `status` to `stable`. **The `summary` has
   its own voice rule** in `CLAUDE.md` under Writing style — prose to a human, no enumerating the
   examples. `status-text` is the reference; the scaffolded TODO string is not.
4. Write `docs.md` and the spec. Assert the ARIA contract and keyboard map, not just that it renders.
5. `npm run check:tokens && npm run build`
6. `npx playwright test --project=chromium <slug>`
7. Tick the roster row below.

The **definition of done** is the checklist at the bottom of `component-specs.md`.

**Reference implementations.** Every component below except `disclosure` follows the current
copyability and writing-style conventions in `CLAUDE.md` — numbered example sections across all files,
a copy map in each header, the framework caveat in `docs.md`. Copy the shape of `field` for a form
component, `tooltip` for a hard-behavior one, `skip-link` or `typography` for a **CSS-only** one.

`dropdown` is still the best reference for *hard behavior* (popover positioning, roving focus,
type-ahead, 14 tests) and `disclosure` for a minimal factory — but both predate the conventions, so
take their logic and not their layout. See item 1 under remaining work.

---

## Infrastructure — done and verified

- **Scaffold** — `package.json`, Astro 5, `.gitignore`, `README.md`, `CLAUDE.md`. Git history was
  squashed to a single root commit on `main` at the user's request, and the project carries **no
  license** — do not reintroduce one, in `package.json`, the footer, or the README.
- **Pages pipeline** — `.github/workflows/deploy.yml`. `astro.config.mjs`:
  `site: https://kaseycolian.github.io`, `base: /a11y-component-examples`, `srcDir: ./src/site`,
  `trailingSlash: always`.
- **Theme** — `src/site/theme/` has theme-service v0.3.0 (`theme.css`, `effects.css`,
  `themes.index.json`, `theme-init.js`) + `THEME-SERVICE.md`. **16 themes**, not 10 — the index
  includes "(No Background)" variants.
- **Tokens** — `src/library/tokens/tokens.css` (optional layer; components work without it).
- **Scripts** — `sync-library.mjs`, `check-tokens.mjs`, `new-component.mjs`. All three verified working.
- **Site shell** — `BaseLayout` (with `head` + `end` slots), `SiteHeader`, `CodePanel`,
  `ComponentNav`, `registry.mjs`, `themes.mjs`, `content.config.ts`, `site.css`, home, index, `[slug]`.
- **Header** — brand, a **components picker**, then the settings. The picker is the library's own
  Dropdown over a `<select>` grouped exactly like the sidebar, with the current page preselected; it
  navigates on `change`, which is safe because the Dropdown commits only on click or Enter and the
  described hint says so in advance (SC 3.2.2). A `Go` button, hidden by default, appears at `load` if
  the Dropdown never enhanced the select — a bare native select fires `change` on every arrow key.
  Prominence is set with `--ac-*` tokens on the wrapper (accent border, wider trigger) rather than by
  reaching into the component's internals. **Two rows at every width**: settings top-right, then the
  picker beneath them — right-aligned above 760px, full-width below. The picker is *after* the
  settings in the DOM as well as on screen, so Tab never runs back up the page (SC 2.4.3).
- **Header theme picker** — is the library's own Dropdown, loaded site-wide from
  `public/library/components/dropdown/` by `BaseLayout`. The shell is a *consumer* of the library, so
  a regression in the dropdown breaks the site, not just a test. Covered by
  `tests/site-header.spec.mjs`.
- **Home hero** — two columns from 68rem up, prose left at its own measure, a real `Field` markup
  excerpt right (`tabindex="0"` + `role="group"`, because it scrolls sideways). No component counts
  anywhere: see the **Writing style** rules in `CLAUDE.md` — never count, and demo content is 90s punk
  song/album references with `462` and `99` as the arbitrary numbers.
- **Sidebar (`ComponentNav`)** — the column from 901px up, `display: none` below it. Stacked, the
  full roster sat between the header and the page the visitor asked for; the header picker is the
  same list, grouped the same way, and it is already on screen. Nothing else navigates, so any change
  that hides the picker on mobile has to bring the sidebar back.
- **`--header-h` is measured, not guessed.** It drives `scroll-margin-top` on every `[id]`
  (SC 2.4.11), so it must be ≥ the header's real height at *every* width, and a two-row header's
  height depends on what wrapped. Three values — 9.75rem, 8.5rem below 760px, 9.25rem below 340px
  where the brand wraps to two lines. `tests/site-header.spec.mjs` asserts the token covers the real
  height at five widths; that test is the guard, not the comment.
- **Markdown tables** — `scripts/rehype-scrollable-tables.mjs` wraps every `docs.md` table in a
  focusable `.table-scroll` region. Without it every component page overflowed sideways at 320px.
- **Playwright** — `playwright.config.mjs`, three browser projects, `webServer` runs
  `npm run build && npm run preview`. **Chromium and Firefox are installed; WebKit is not**, so
  `npm run verify` still *fails* at the test step with "Executable doesn't exist" for every WebKit
  test. Chromium is **1046/1046** in about 5 minutes — 716 component specs plus the 330 of the
  shared gate. Firefox was installed on 2026-07-29 and **has not been run yet** — expect real
  failures rather than none, since every spec was written against Chromium. Run
  `npx playwright install webkit` to finish the set.
- **CI** — `.github/workflows/ci.yml` on push to `main`, on every pull request, and by hand.
  `check:tokens` first because it is cheap and needs no browser, then the Chromium suite, then the
  HTML report as an artifact for 14 days. Separate from `deploy.yml`, which is unchanged.

---

## Component roster — 33 / 35

### foundations
- [x] `skip-link` — done, **CSS-only** (`--no-js`), 16/16 tests in Chromium. Five examples: the baseline,
  two destinations revealed together on `:focus-within` (no landmark around them — a `<nav>` adds a
  region for two links nobody reaches by landmark), an **always-visible** modifier, a mid-page link that
  skips a *block* rather than jumping to main (SC 2.4.1 is about blocks), and example 5 which is
  **broken on purpose, live**: a `display: none` link that can never be focused, and a target with no
  `tabindex="-1"` that scrolls without moving focus. Deliberately `:focus`, not `:focus-visible` — a
  programmatic focus may not match the latter, and a focused-but-invisible skip link is a silent
  failure. The focus ring on the target is **kept**: it is the only confirmation a sighted keyboard user
  gets that the jump landed, and this is the exact spot `outline: none` gets added. Gotcha found:
  `box-sizing: border-box` cannot shrink a box below its own borders, so a 2px border made the "1px"
  clipped link 4px — the border moved into the three revealed states instead. The shell's own
  `.skip-link` in `site.css` predates this and is still hand-rolled; making `BaseLayout` a consumer of
  `.ac-skip-link` the way the header consumes Dropdown is an open, unforced option.
- [x] `visually-hidden` — done, **CSS-only** (`--no-js`), 17/17 tests in Chromium. **Canonical home for the
  clipping technique**; `skip-link`, `switch`, `textarea` and `tooltip` each keep a local copy on purpose,
  so a change here is a change in all five. Organized around the fact that *hiding is not one thing*:
  example 4 is four identical icon-only buttons whose labels are hidden four different ways, and three of
  them have **no accessible name at all**. Two findings from building it: `visibility: hidden` removes the
  element from the accessibility tree but **keeps its layout box**, so that button is visibly wider than
  the others — the only one of these failures you can see with no tooling; and `aria-label` is a different
  tool rather than a shorter spelling (needs a role that supports naming, replaces the whole name per
  SC 2.5.3, and is invisible to translation tools and find-in-page). `--focusable` uses `:focus-within`
  because the focusable thing is usually *inside* the wrapper — unlike `skip-link`, which needs plain
  `:focus`. The shell's own unprefixed `.visually-hidden` in `site.css` predates this and is untouched;
  making `BaseLayout` consume `.ac-visually-hidden` is the same open option as with `skip-link`.
  **Test gotcha:** `innerText` *includes* clipped text — it only drops `display:none` and
  `visibility:hidden`. Assert geometry for "off screen" and `toHaveAccessibleName` for "still announced".
- [x] `focus-ring` — done, **CSS-only** (`--no-js`), 22/22 tests in Chromium. A docs component whose
  deliverable is the argument, so every claim on it is live and Tab-able rather than described.
  `.ac-focus-ring` is the ring every other component already ships, extracted: `3px solid` on
  `:focus-visible` at `2px` offset, no transition. Modifiers are **complete on their own** — one class
  on the element, not base plus modifier. `--always` (`:focus`, the skip-link case), `--flush` (offset
  0), `--inset` (offset `-3px`, for an `overflow: hidden` ancestor — example 2 has the clipped ring
  live beside it), `--two-tone`. Example 4 is broken on purpose and live: `outline: none` alone
  (SC 2.4.7), `outline: none` plus a background tint (SC 1.4.1 — the one that gets written by someone
  *trying*), and the honest `box-shadow` replacement. Example 5 is **SC 2.4.11**, and it is the reason
  the demo says Shift+Tab: scrolling *forward* aligns an element's bottom edge, so a sticky bar only
  eats the focused element when you move **backwards** and the browser lines its top edge up with the
  scrollport's. Three findings: `border-radius: inherit` on a focus rule is wrong (it inherits the
  *parent's* radius; an outline already follows the element's own); the two-tone ring's tones are the
  theme's own `--text` and `--bg`, because that is the one pair a theme already guarantees contrasts;
  and the two `--ac-focus-inner` / `--ac-focus-outer` tokens this added to `tokens.css` are the only
  edit outside the component folder.
- [x] `live-region` — done. 26/26 tests in Chromium. The **only component with no
  `create<Name>(root)`**: its product is a message, not an element, so it exports `AC.speak(el, text)`
  (clear, wait two frames, write) and `AC.createAnnouncer({ root, clearMs })` →
  `{ announce(text, { assertive }), element, assertiveElement, destroy() }`, idempotent per root, both
  regions minted at construction and cleared after 7s. Describes rather than replaces the four
  `role="status"` regions `switch`, `input-group`, `textarea` and `tooltip` already own. The regions
  are drawn **visible** on this page instead of clipped, so the text can be watched landing in the
  actual element — `.ac-lr-clipped` is the real recipe and is a local copy of `visually-hidden`'s.
  Example 3 is broken on purpose and live: injected already populated, `display: none`, and
  cleared-then-set in the same tick, each with a mirror printing what it left in the DOM, because
  *the DOM being correct* is the whole reason this bug survives review. Example 5 pairs the repeat
  problem (same string twice announces nothing) with `role="log"`, which is append-only and carries no
  `aria-atomic`. Two findings: **two** `requestAnimationFrame`s are needed, not one, because rAF runs
  before paint and a single one can still batch the clear and the write into one reported state; and
  `textContent = <same string>` **does** fire a MutationObserver (old text node out, new one in), so
  the thing a test can assert is that the region is *observed empty* in between, never a mutation
  count.
- [x] `typography` — done, **CSS-only** (`--no-js`), 21/21 tests in Chromium. Eight classes that carry
  no semantics at all, which is the entire argument: example 2 is an `<h4 class="ac-t-h2">` and a
  `<div class="ac-t-h2">` rendered pixel-identical, with the heading list printed underneath holding
  one entry. That printed list is hand-written and the spec asserts it against the real accessibility
  tree, so it cannot drift. Three failures are live rather than described — `opacity: 0.45` for muted
  text, a link identified by color alone, and a fixed `height` on a box of text with a checkbox that
  applies the four SC 1.4.12 values. Numbers are quoted rather than claims: `--ac-text-muted` is
  9.5:1, the opacity line is 4.1:1 dark and 3.0:1 light from a declaration naming no color, and the
  link accent is 13:1 against the background but **1.27:1 against the body text one word away**, which
  is the number SC 1.4.1 actually asks about — a pass in the light theme at 3.08:1 and a fail here.
  Four findings: `.ac-t-h4` is body size and told apart by weight, so the scale is non-increasing
  rather than strictly descending; a fixed-height box cannot both fit unspaced and clip spaced unless
  its **width** is pinned too, so example 5's boxes are `width: 15rem` and its columns are sized to
  hold them; the spacing toggle is CSS-only via `:has()`; and the one that mattered — **a host app's
  own `h1`–`h6` rules cascade into every property the class does not set**, so `.ac-t-h2` on an `<h4>`
  rendered uppercase with a glow and on a `<div>` did not, silently destroying example 2. The class
  now declares `letter-spacing`, `text-transform` and `text-shadow` for that reason, and the spec
  compares all three.
- [x] `motion-preferences` — done. 25/25 tests in Chromium. The gate the whole library already reads,
  finally demonstrated: three CSS rules on `.ac-motion-scope` (`<html>` in a real app; the demo grid
  here, so the page toggle does not fight the site header's), a switch that writes `data-motion="off"`
  and removes it again, and a **readout naming all three signals** — the OS, the attribute, and the
  resolved `--ac-motion` — with a `role="status"` sentence that states the verdict. Example 5 is
  broken on purpose and live: `[data-motion="on"] { --ac-motion: 1 }` after the media query, so a
  reader who asked their OS for reduced motion watches a button overrule it while the readout says so.
  Findings: **there are only two states, and the second cost of a third one is not the override** —
  `on` and *absent* both mean "not reducing", so the toggle cannot describe the page, unchecks itself,
  and the reader's earlier answer is unrecoverable; **two knobs, two right answers**, gate the
  *duration* to remove decoration and the *distance inside the keyframe* to keep a cross-fade, because
  the preference is about vestibular triggers and opacity is not one; **JS must read the token, not
  `matchMedia`**, which is blind to the page toggle (`matchMedia` is still needed for its `change`
  event, since the OS setting can change while the page is open); and SC 2.2.2 is an obligation
  *independent* of the preference, which is why example 1's record has the toggle as its pause
  mechanism and example 3's ticker has its own button. That button changes its label and carries no
  `aria-pressed` — doing both announces the change twice and the two can disagree. **Test gotcha:**
  Playwright honors `aria-disabled` in actionability, so clicking the locked switch needs
  `{ force: true }`; the `preventDefault` is what the assertion is really about.
- [x] `effects` — done, **CSS-only** (`--no-js`), 16/16 tests in Chromium. **The one page whose subject
  is not a component this library owns.** `fx-grid`, `fx-bar-top`, `fx-bar-bottom`, `fx-scroll` and
  `fx-pulse` ship in the vendored `src/site/theme/effects.css` and nothing here reimplements them, so
  `component.css` is a `[PATCH]` — a `:focus-visible` ring for `.fx-scroll`, which `effects.css` has
  none of, plus a forced-colors block it also lacks — and then `[BROKEN]`, `[MOCK]`, `[FORCED]`.
  Example 2 is the cleanest live failure in the library so far: **both panels carry `fx-grid`**, so
  their `::before` comes from the same rule and the spec asserts the two computed pseudo-element
  styles are identical; the broken one adds `isolation: auto` and its backdrop paints behind its own
  opaque panel, invisible in every theme at every width, with nothing invalid for a tool to report.
  Example 3 is the gradient-contrast point with numbers: `fx-bar-top` is 16.79:1 at its ends and
  11.35:1 at the 55% stop, `fx-bar-bottom` 10:1, and the over-tinted copy is **2.18:1** in the middle
  while still reading 16.79:1 at two corners nobody puts text in — and it **passes in the light theme
  at 6.27:1**, so the header's theme picker flips the verdict live. Three findings: **Chromium 151
  gives any scrollable box a tab stop with no `tabindex`**, with no role, no name and a 1px near-black
  UA outline — which is what example 4 and the `[PATCH]` are about, and `tabindex="0"` +
  `role="region"` + a name is still the answer because Safari does not do it at all; **forced colors
  drops gradient `background-image`s and every `box-shadow`**, so four of the five effects delete
  themselves and example 2's two panels become identical, which is correct and is the reason
  decoration may never be the only carrier of anything; and **`effects.css` ships two motion gates
  with different reach** — `[data-motion="off"] { --motion: 0 }` matches the element carrying the
  attribute and is inherited from there, `[data-motion="off"] .fx-pulse` is a descendant combinator
  and needs an ancestor, so example 5's left box resolves `--motion` to `0` and keeps animating. Gate
  on the token and the question never comes up.

**`foundations` is complete.**

### buttons-actions
- [x] `button` — done. 22/22 tests in Chromium. **Canonical home for `.ac-btn`**; `.ac-motion__btn` and
  the addon buttons in `input-group`, `modal`, `drawer` and `tooltip` are deliberate local copies, so a
  change here is a change in five places. **The modifier surface `icon-button`, `loading-button` and
  `chip-toggle` all extend:** weight (`--solid` / `--outline` / `--ghost`), accent (`--pink` / `--green`
  / `--blue` / `--purple`), size (`--sm`, and nothing below it). The two axes are independent, so the
  accent is a **local custom property** — `--ac-btn-accent` / `--ac-btn-on-accent`, set by four one-line
  rules and read by the three weight rules. Twelve combinations out of seven rules, and one property to
  override for a brand color. Example 1 is the specimen; examples 2–5 are each half wrong on purpose and
  live: the bare `<button>` that submits the form, `disabled` beside `aria-disabled`, a `<div>` carrying
  the same classes as a real button, and a target under the 24px floor with the readout measuring all
  three. Four findings. **`event.submitter` is *not* null on implicit submission** — Enter in a text
  field runs through the form's *default button*, the first submit button in DOM order, and the browser
  nominates it as the submitter although nobody pressed it; on example 2's form that is the bare one,
  which makes the demo stronger than the version that was written first. **The `aria-disabled` guard
  belongs on a container, in the capture phase** — bound on the button itself it runs in the target
  phase beside every other handler and only wins if it was registered first; on an ancestor in capture
  it always runs first and `stopImmediatePropagation` ends the event, and one listener also covers
  buttons added later. `preventDefault` gets the keyboard for free, since a native button fires a
  *click* for Enter and Space. **Under `forced-colors` the three weights collapse** into `ButtonFace`
  inside a `ButtonBorder`, and ghost — no fill, no border of its own — stops reading as a control at
  all, which is the whole reason its `@media` block is not optional. **A hard-`disabled` button
  dispatches no click at all**, so there is nothing to report from and nothing to explain with; that is
  the argument for `aria-disabled` in one sentence.
- [x] `icon-button` — done. 16/16 tests in Chromium. **Canonical home for `.ac-btn-icon`**, which is
  four rules on top of a local copy of `button`'s base: `gap: 0`, `padding: 0`, a
  `--ac-btn-icon-glyph` size, and an inline `<svg>` stroked with `currentColor`. Organized around one
  sentence — a text button gets its name for free from the word on it and its *width* for free from
  the same word, and an icon button has neither. Example 3 is four identical-looking buttons whose
  names come from four different places, with a **live readout naming the source**: `resolveName()`
  walks `aria-labelledby` → `aria-label` → own text minus `aria-hidden` subtrees → `title`, and two of
  the four resolve to nothing. The second is the surprising one — `aria-label` sits on the wrapping
  `<span>` and is discarded, and nothing has to special-case it, because the resolver asks the button.
  Example 4 is **SC 2.5.3** made operable: two captioned buttons and a mock voice-control lookup that
  matches typed text against the accessible name, so "click Share" finds nothing while "click Queue"
  finds one. Example 2 is the `aria-label`-versus-clipped-text table, live: all three announce the
  same and only two contain the words, and `--labeled` is the third one with a class added — the
  payoff being that text can be un-clipped at a breakpoint and an attribute cannot. Three findings.
  **`box-sizing: border-box` counts the border into the target**, so the shrink-wrapped failure at a
  20px glyph came out at exactly 24×24 — on the floor, not under it — until its `border-width` went
  to 0; any SC 2.5.8 demo built by removing `min-width` has to remove the border too. **`.ac-btn--sm`
  and `.ac-btn-icon` are both one class deep**, so which `padding` wins is decided by source order
  and nothing else — `[BTN]` is declared before `[ICON]` for that reason, and it is the file's one
  ordering constraint. **An inline SVG on `currentColor` is the only icon that survives forced
  colors**: it becomes `ButtonText` with the label and `HighlightText` on hover with no rule of its
  own, while an `<img>` keeps the color it was drawn in on a background the system just replaced and
  a `background-image` is dropped outright.
- [x] `loading-button` — done. 16/16 tests in Chromium. **The first component whose subject is a
  state rather than a control.** The one decision: the spinner is selected by `[aria-busy="true"]`,
  so the attribute a screen reader reads is the same one that draws it and there is no way to show a
  spinner without setting it. `setBusy()` is twenty lines — `aria-busy`, `aria-disabled`, and a
  clear-then-write into a pre-existing empty `role="status"` (lifted from `live-region`) — and it has
  no branch that touches the name. Examples 2 to 5 are each half wrong and live: a spinner driven by
  a private `data-` attribute whose three readouts never move; `disabled` while pending, printing
  `document.activeElement` right after the press; a button that renames itself and ends with three
  names; and a pulsing dot whose only pending cue is the animation. Four findings. **Forced colors
  hands `transparent` back *opaque*** — the ring's gap is a `border-top-color: transparent`, and
  under `forced-colors: active` Chromium returns `rgb(0, 0, 0)` for it, so the ring closes into a
  full circle and stops reading as turning; the gap has to be repainted in the button's own system
  background (`ButtonFace`, `Highlight` on hover), and that is the whole `[FORCED]` block's reason
  for existing. **`visibility: hidden` is the right way to hide the spinner**, because it keeps the
  layout box — the button is the same width busy and idle and does not move out from under the
  pointer that pressed it; the kept box is `visually-hidden`'s bug and this component's fix.
  **`aria-busy` is announced inconsistently**, which is the argument for the region being
  non-optional rather than an argument against the attribute. **No dimming for the busy state** —
  the usual faded look is `opacity` over a color nobody chose, and `typography` already argues
  against exactly that; the spinner is the visible cue and `aria-disabled` is about behavior. The
  demo grid stacks its two cases at every real width, so **"left"/"right" in demo copy is wrong** —
  name the cases instead.
- [x] `chip-toggle` — done. 21/21 tests in Chromium. **Canonical home for `.ac-chip`**, which is a
  pill radius, a lighter weight and one state rule on top of a local copy of `button`'s base. The
  pressed look is selected by `[aria-pressed="true"]` — the same attribute a screen reader reads, so
  there is no way to draw a chip down without saying so, which is `loading-button`'s `aria-busy`
  trick a second time. Pressed differs by **three** things: the fill, the border and a tick that
  appears; `[aria-checked="true"]` rides along in the same selectors so a `role="switch"` chip is
  one look with two spellings, never two looks. Example 4 is the three-way comparison made
  operable — a toggle button, a real checkbox and a switch, identical on screen, with a
  "What would submit?" button printing the `FormData`: only the checkbox is in it. Example 5 is the
  tab-stop tradeoff, five stops beside APG's toolbar and its one, with the stops counted live and
  arrows/Home/End wired; presented as a tradeoff rather than an upgrade, because a toolbar's
  keyboard map has to be discovered. Four findings. **CSS generated content is folded into the
  accessible name**, so the obvious non-color cue — `content: "✓"` — renames the control every time
  it goes down ("Matinee" → "✓ Matinee", browser-confirmed); the tick is therefore `content: ""`
  with a checkmark drawn from two borders, which contributes nothing to the name and, being
  `currentColor`, survives forced colors on its own. That means the well-meaning fix for SC 1.4.1
  walks straight into SC 2.5.3, and it is why examples 2 and 3 are next to each other. **A computed
  color read straight after the state flips is the transition, not either state** — the fill and the
  border are gated on `--ac-motion` at 150ms, so the demo's own readout reported "fill" where the
  truth was "fill, border, tick"; `cuesOf()` sets `transition: none`, reads, and restores. **A
  broken example inside a file that has a `[FORCED]` block has to opt out of it**, or the good rule
  fixes the failure it was there to show — the fill-only chip needs its own `ButtonFace` line to
  reproduce what a chip with no forced-colors block does for free. And the tick has to be rendered
  in both states at `visibility: hidden`, or the row reflows on every press and moves the next chip
  out from under the pointer heading for it.

**`buttons-actions` is complete.**

### forms-inputs
- [x] `field` — complete. 26/26 tests pass in Chromium. **Canonical home for `.ac-field*`**; the
  dropdown keeps its own copy on purpose, so a change here means a change there too. Also carries
  provisional `.ac-input` / `.ac-textarea` / `.ac-group` / `.ac-choice` for the demo — `text-input`,
  `textarea` and `fieldset-group` own the canonical versions of those when they land.
- [x] `text-input` — complete, **CSS-only** (`--no-js`), 19/19 tests in Chromium. Canonical home for
  `.ac-input`. Centered on the attributes rather than the styling: `autocomplete` tokens (SC 1.3.5),
  `type` vs `inputmode`, and `readonly` vs `disabled`.
- [x] `input-group` — done. 20/20 tests in Chromium. Search + submit, password reveal, copy to
  clipboard, text affixes, invalid. The addon is a flex sibling, never an overlay (an overlay covers
  the value at 200% zoom and eats clicks). Reveal changes the button's **name** and sets no
  `aria-pressed`; copy announces through a pre-existing empty `role="status"` and never renames the
  button. Gotcha found: changing an input's `type` resets its selection **asynchronously**, after the
  field has lost focus — snapshot the caret on `blur` and restore both synchronously and in a
  `requestAnimationFrame`.
- [x] `textarea` — done. 22/22 tests in Chromium. Built around the three things that *remove*
  accessibility from a native textarea: `resize: none`, `maxlength`, and a counter wired straight to a
  live region. The counter is three separate things — the limit in the described hint, a visible
  `aria-hidden` count per keystroke, and an off-screen `role="status"` that speaks only on a 1s pause
  and only from 90% of the limit (cleared below it, so crossing back is a change). No `maxlength`:
  over-typing is allowed and reported. Autogrow collapses the height before reading `scrollHeight`
  (otherwise it can only ever grow) and a `ResizeObserver` makes a hand-dragged height final.
- [x] `native-select` — done, **CSS-only** (`--no-js`), 17/17 tests in Chromium. The recommendation
  component: prefer this over the custom Dropdown unless you need styled rows, because on a phone it
  opens the OS picker. Caret is two `currentColor` gradients, so no image and no second rule for the
  disabled state — and under `forced-colors` it sets `appearance: auto` and lets the UA draw its own,
  since `background-image` is dropped there. `option`/`optgroup` get their own colors (Windows inherits
  the control's into the popup). `multiple` is left native with the keyboard table spelled out.
- [x] `radio-group` — done, **CSS-only** (`--no-js`), 18/18 tests in Chromium. Canonical home for
  `.ac-choice`. The shared `name` is the component: one tab stop, arrows that move *and* select. No
  `role="radiogroup"`. The error id is repeated on **every** radio's `aria-describedby`, because a
  fieldset's own description is read inconsistently and never again once focus is on the third option.
  Nothing pre-checked. Two fieldset quirks documented: `min-width: 0` (default `min-inline-size` is
  `min-content`, which overflows at 320px) and the inner `<div>` wrapper. Gotcha found: `input.disabled`
  is `false` for inputs inside a disabled fieldset — the IDL property reflects only the control's own
  attribute, so test and style on `:disabled`.
- [x] `checkbox` — done. 22/22 tests in Chromium. Four of five examples need no JS; the script exists
  only because **`indeterminate` is a property with no attribute**, so a mixed parent cannot be server
  rendered or set in CSS (though `:indeterminate` styles it once set). No hand-written
  `aria-checked="mixed"` on a native input. `indeterminate` survives a change to `checked`, so it is
  cleared explicitly. Documents the keyboard difference from radios — a checkbox set is one tab stop
  *per box* and has no arrow keys.
- [x] `switch` — done. 23/23 tests in Chromium. A labeled native checkbox is the default, with
  `role="switch"` as example 3: older JAWS announces the role inconsistently, and the browser keeps
  every checkbox behavior either way (never hand-write `aria-checked` alongside it). State is carried by
  the **thumb's position as well as the track fill** — the fill alone is the usual SC 1.4.1 failure here.
  The thumb moves by `transform`, so it is laid out once and cannot land a half-pixel off in one state.
  Confirmation goes to a pre-existing, clipped `role="status"`, never to the label: renaming the control
  someone just operated tells them a different control is under their finger. Example 4 promotes the
  header's Reduce motion pattern — `aria-disabled` is an announcement, so `component.js` prevents the
  click, which covers Space too. Gotcha found: **Playwright treats `aria-disabled="true"` as
  unactionable**, so `toBeEnabled()` fails and the click needs `{ force: true }`; assert `el.disabled`
  directly instead.
- [x] `fieldset-group` — done. 25/25 tests in Chromium. **Canonical home for `.ac-group*`**; radio-group,
  checkbox and switch each keep a copy, so a change here is a change in all four. Built around the
  three things people don't know: the two quirks that make teams abandon the element (`min-width: 0`,
  because a fieldset's default `min-inline-size: min-content` is the usual cause of sideways scroll at
  320px; and the inner `__body` div, because a `<legend>` cannot be a flex item and older Safari won't
  make a fieldset a flex container); `role="group"` + `aria-labelledby` when the name has to be a real
  **heading**, since a legend never lands in the heading list; and that "pick at least one" has no HTML
  (`required` on a checkbox means *that* box), so `data-ac-min` validates on `change` — never before the
  group is touched — writing the error id onto **every** control's `aria-describedby`. Example 5 pairs
  the two locks: `disabled` on a fieldset cascades (and `input.disabled` still reads `false`, so style
  and test on `:disabled`), `aria-disabled` cascades to **nothing** and needs per-control marking plus
  the click guard. Gotcha found: `getByRole('group', { name: 'Rider' })` also matches "Technical
  rider" — role-name matching is substring, so `exact: true` where one name contains another.

### overlays-disclosure
- [x] `disclosure` — works, but **predates the copyability + style conventions — retrofit (item 1)**.
  Also still has **no spec** — backfill one.
- [x] `dropdown` — complete and retrofitted. 17/17 tests in Chromium. **The bottom sheet was removed:**
  it anchors to its trigger at every viewport width, flips above when there is no room below, and
  sizes rows by `@media (pointer: coarse)` rather than a width breakpoint. The sheet behavior moved to
  `drawer`.
- [x] `drawer` — done. 18/18 tests in Chromium. Carved out of `dropdown`, where it was a second
  personality with a second keyboard story. Same behavior at every viewport width. Modal and non-modal
  are separate behaviors driven by one flag: modal gets `role="dialog"` + `aria-modal` + backdrop +
  scroll lock + trap, non-modal gets `role="region"` and none of them. Three real bugs the tests
  caught: the backdrop sat under the sticky header's `z-index` (raised to 900, documented as needing to
  clear your app's chrome); the body lacked `min-height: 0`, so long content overflowed the panel and
  was clipped; and a side drawer inherited the UA's `[popover] { height: fit-content }`, so it never
  spanned its edge.
- [x] `modal` — done. 30/30 tests in Chromium. Native **`<dialog>` + `showModal()`**, which is most of the
  pattern for free: top layer (beats the sticky header without a `z-index`), `::backdrop`, inertness,
  Tab kept inside, Esc, focus back to the opener. `docs.md` is organized around the **four things it
  does not do** — focus placement (it picks the first focusable, usually the close button; we focus the
  dialog itself for text, the first field for a form, the *safe* button for a confirmation), the scroll
  lock, reporting the outcome, and a visible close button. **No `role="dialog"` and no `aria-modal`** —
  implied, and `aria-modal` on a native dialog has made VoiceOver skip the content; `role="alertdialog"`
  (example 3) is the one legitimate override and drags `aria-describedby` with it. The trigger has **no
  `aria-expanded`**, deliberately unlike `drawer`: focus moves inside, so there is no state to report
  from outside. Three findings worth keeping: the `close` event is **queued, not synchronous**, so
  `destroy()` on an open dialog tore down its own listener before the unlock ran (the page stayed locked
  — fixed by unlocking inside `destroy`); a live region outside an open modal is **inert and cannot
  announce**, so the outcome is stashed on the submitter and written after the close; and Chrome parks
  on `<body>` once per Tab cycle before wrapping back in, which the test now asserts honestly rather
  than pretending. `data-ac-backdrop-close` is opt-in and checks both `pointerdown` and `click` targets,
  or a text-selection drag ending on the backdrop dismisses the dialog.
- [x] `tooltip` — done. 25/25 tests in Chromium. Organized entirely around **SC 1.4.13**, which needs
  three things at once: dismissible (Esc, and the dismissal is *remembered* until the pointer leaves or
  focus moves, or it reappears instantly under an unmoved pointer), hoverable (closing is delayed
  ~180ms and the bubble's own `pointerenter` cancels the pending close — `pointer-events: none` on a
  bubble is the usual failure), persistent (nothing times out). Opens on `focus` only when
  `:focus-visible` matches, so a mouse click does not fire a tooltip at the person who clicked; `touch`
  `pointerType` is filtered out, or a tap leaves a bubble stuck open with no `pointerleave` coming.
  **`aria-describedby` is never toggled** — a directly referenced element is folded into the description
  even while hidden, so the text is announced on focus before anything appears; the test asserts that.
  Ships a **toggletip** (example 4) as the touch-reachable alternative: click-opened, announced by
  inserting text into a pre-existing `role="status"`, and deliberately no `aria-expanded` and no
  `aria-describedby` — it is a message, not a region the button controls. Example 2 is the one case where
  the bubble is the **name** (`aria-labelledby`, on an icon-only trigger); example 3 keeps a native
  `title` on the page as the comparison; example 5 is the SC 3.3.2 point — the requirement is visible
  text and the tooltip only adds the reason, with both ids in one `aria-describedby`. Bubble is
  `position: fixed` with JS coordinates so an `overflow: hidden` ancestor cannot clip it, flipping above
  only when there is room, clamping to the viewport, and re-aiming the arrow after the clamp. Two CSS
  gotchas worth keeping: any author `display` on `.ac-tooltip` would beat the UA's
  `[hidden] { display: none }` and pin the bubble open, so the guard is declared explicitly; and
  `display: contents` on the toggletip's live region would drop it from the accessibility tree.

**`overlays-disclosure` is complete** apart from the `disclosure` retrofit in item 1.

### navigation
- [x] `tabs` — done. 29/29 tests in Chromium. **The subject is the tab order**, and every readout on
  the page is measured by asking the browser rather than by matching a selector: `[FOCUS]` focuses an
  element and reads `document.activeElement` back, so a stop the page reports is a stop the Tab key
  really gives. The spec then proves the same walks with real Tab presses, so the page's own method
  is checked against the browser rather than against itself. Example 2 is three strips printing every
  stop in order — 5 with no roving tabindex, 4 with panels faded out (two of them invisible), 3 for
  the specimen; example 3 arrows across an automatic and a manual strip and counts panels opened,
  2 against 1, with the focused-versus-selected pair that only manual can make disagree; example 4 is
  three panels one attribute apart with the next stop after the selected tab named; example 5 is a row
  of links wearing `role="tab"` beside a `<nav>`, where the failure is an `aria-controls` naming a
  panel nobody built. Two decisions worth keeping: **the factory never sets the panel's `tabindex`**
  — it is in the markup, so the keyboard map is the same before the script loads and after, which is
  also what makes example 4's failures possible — and the library adds it **unconditionally** rather
  than following the APG's "only if the panel has no focusable content", because that condition is
  about the content and the content is the part that changes. Four findings. **A rename that misses
  one line can leave a silent always-false**: `panels[i].hidden = !on` survived a rename of `on` to
  `isOn` and resolved to the file's own `on()` listener helper, so `!on` was `false` forever, every
  panel stayed visible, and nothing threw — see the gotchas list for how it was caught. **A wrapped
  tab strip must not have a full-width rail**: the `border-bottom` on the tablist belongs to the last
  row, so at 320px the first row hangs over nothing; the selected cue moved onto each tab as a 3px
  `border-bottom`, declared at full width in both states so the row cannot reflow. **A `[hidden]`
  element's accessible name is `""`** — correct, and it fails the assertion that proves the markup is
  right. And **`test.use({ forcedColors })` is still ignored**; `page.emulateMedia` in a `beforeEach`,
  as everywhere else.
- [x] `jump-nav` — done. 20/20 tests in Chromium. **The subject is the other end of the link.** The
  links are ordinary links and the component's own JS is one `IntersectionObserver`; everything that
  can go wrong is on the target, which is why the contract is `tabindex="-1"` plus
  `scroll-margin-top` and the factory sets **neither** — the tabindex is in the markup so the
  keyboard behaves the same before the script loads and after, which is `tabs`' call about its panel
  made a second time, and it is what makes example 2's failure possible. Defers to `tabs` for
  `aria-selected`-versus-`aria-current` and `page`-versus-`location`. Example 2 is three documents
  one attribute apart with the landing printed under each; example 3 measures the overlap between the
  heading and a bar stuck above it (35px against a 3px clearance); example 4 counts scroll events
  against section changes on one document; example 5 prints the landmark menu two navs produce named
  and unnamed. Four findings. **An unfocusable fragment target does not leave focus on the link** —
  the headline, see the gotchas list; it makes example 2 much stronger than the version it was
  designed as. **A settle-poll that starts in the same frame as the scroll request reports the state
  before the scroll** — also in the gotchas list, and it is what "the readout never updated" looked
  like. **The demo's scrollport is a box, so the site's global `[id] { scroll-margin-top }` had to be
  beaten at (0,2,0)** — the shell rule is aimed at the page header and would otherwise push every
  heading most of the way out of a 13rem box; the spec asserts the resolved value is under 20px so
  the collision cannot come back silently. And the failing box in example 3 carries **two** single-
  class modifiers setting the same custom property, so `--under` lost to `--sticky` on source order
  alone — `icon-button`'s ordering finding arriving through a custom property instead of `padding`.
  The target's ring is `:focus`, not `:focus-visible`, for `skip-link`'s reason, and it carries a
  doubled class for `focus-ring`'s.

**`navigation` is complete.**

### feedback-status
- [x] `notice` — done. 23/23 tests in Chromium. **Canonical home for the SC 1.4.1 glyph argument and
  for static-versus-announced**; `status-text` and `result-panel` point here rather than re-arguing
  either. The tone is **one custom property** — `.ac-notice` reads `--ac-notice-accent` in four
  places (edge, icon, prefix, tint) and the four modifiers set nothing else, so a fifth tone is one
  rule. The tones are the theme's own accents, so there is **no red**, which is survivable exactly
  because the word carries the tone. Example 3 is the component's real subject: the same success
  notice added three ways, with a mock screen reader watching only the live regions that existed
  when it ran — the specimen announces, the notice that arrives *carrying* `role="status"` is
  silent, and the DOM afterwards is identical, which is why that bug survives review. Example 4's
  `role="alert"` is server rendered and populated, and the log records it firing before the visitor
  did anything. Four findings. **An empty live region is 0px tall, so Playwright calls it hidden** —
  see `docs/agents/testing.src.md`; that is the correct state for a screen reader and
  `toBeVisible()` cannot express it. **Under forced colors all four tones collapse into one** — every accent becomes
  `CanvasText` and the `color-mix` tint is dropped — and the `[FORCED]` block deliberately does
  *not* put the difference back, because nothing can; that is the prefix-word argument in one
  screenshot. **A polite region populated at page load is not announced**, so a server-rendered
  `role="status"` is harmless and merely pointless — only `alert` fires, which is why example 4's
  load-time scan looks for alerts alone. And **the mock AT reports silence by watching the log, not
  by asserting it**: the button handler checks four frames later whether anything reached the list,
  so the "nothing was announced" line is derived from the same observer as the successful one.
- [x] `status-text` — done. 22/22 tests in Chromium. **The subject is scale**, and it defers to
  `notice` for the SC 1.4.1 glyph argument and static-versus-announced rather than re-arguing
  either. What it owns is what those answers become when the component is one word wide: no room
  for an `Error:` prefix, no container to hang a region on, and **no focus**, which is what rules
  out every hover-based way of showing the reason. Example 3 is that point made three times over —
  `title`, a CSS `:hover` bubble, and `.ac-status__detail` clipped inside the label — and the
  readout prints what each one is read out as. The one API decision: `setStatus(el, tone, word)`
  takes both together and there is **no way to set the tone alone**, so the color and the text
  cannot drift. Four findings. **The `title` is not merely quiet, it is absent** — a `title` on an
  element that already has text is not in the accessible name at all, so the "at least it's
  somewhere" defense is wrong on its own terms. **A pseudo-element that is not rendered is not in
  the accessibility tree**, which is what makes the hover bubble a genuine failure and is the check
  the page's `generated()` had to add: `content` is declared and readable from
  `getComputedStyle(el, '::after')` while `visibility: hidden` keeps it out of the name. **The name
  walk has to distinguish *clipped* from *hidden***, and that one distinction is the whole of
  example 5 — `display: none` on the word at a breakpoint drops it from the tree, `--compact` clips
  it, and the two are **the same width on screen**, which is why the wrong one looks reasonable.
  And **only rows that actually changed are rewritten** in example 4, or the "one region" list
  still produces four mutations; the log counts 3 announcements against 1 and that count is the
  demo.
- [x] `badge` — done. 29/29 tests in Chromium. **The subject is the number**, and it defers to
  `notice` for SC 1.4.1 and to `status-text` for scale. The contract is two halves that are both
  always present: `.ac-badge__num` is `aria-hidden` and may be abbreviated or empty, and
  `.ac-badge__name` is clipped real text — `3 unread messages` — which is the badge as far as the
  accessibility tree is concerned. `setBadge(el, count, { subject, max })` writes both in one call
  and there is **no way to write one without the other**, because this is the one component where
  the thing on screen is routinely an abbreviation of the thing being said. Four findings. **A live
  region is not part of an ancestor's accessible name** — the headline, see the gotchas list; it
  makes example 5 much stronger than the "it interrupts" version it was designed as. **Clipped text
  beats `aria-label` for a fourth reason that is the badge's own**: text composes into the name of a
  control the badge is nested inside and an attribute does not, which is the whole of example 3 —
  a badge positioned *over* a button rather than inside it is a separate node joined to it by
  nothing but CSS, and the two are pixel-identical. **The failure that actually ships is the
  double-announce**: someone adds the clipped subject and never hides the digits, so `3` is read
  twice and it sounds like a stutter rather than a bug. And **`.ac-badge[hidden]` needs its own
  `display: none`** — see the gotchas list. Example 4 is the badges with no number to read (`99+`,
  a bare dot, a named dot, a zero) and it is where the abbreviation rule lives: shorten the drawing,
  never the words.
- [x] `result-panel` — done. 29/29 tests in Chromium. **The subject is composing**, and it is the
  first page where three of these components meet. Each of `notice`, `status-text` and `badge`
  documents when it should carry a live role and each answer is right alone; follow all three inside
  one panel and one button press produces four announcements. So the panel overrules them — one
  `role="status"` at the bottom and every part above it inert — and `setResult` writes the value, the
  verdict, the count and the notice in one call while handing exactly one sentence to the region.
  Example 3 is that panel beside the loud one, with a mock screen reader counting 4 against 1.
  Four findings. **`<output>` has an implicit `role="status"`** — the element that sounds most
  correct for a computed value reads the whole value out on every change, and it is the fourth voice
  in example 3 that nobody wrote; see the gotchas list for why `el.role` cannot detect it.
  **`overflow-wrap: break-word` does not shrink a box's min-content width**, so it wraps the text,
  *looks* like the fix, and leaves the panel unable to reflow to 320px — example 2 measures 479px
  against the specimen's 32px and the two are pixel-identical on screen. **A soft-disabled copy
  button announces nothing on the press**: the reason belongs on the button as `aria-describedby`,
  read on arrival, and a region reports what changed — refusing to act is not a change, so
  announcing it says the same sentence twice. And **`overflow: hidden` buys a Chromium tab stop
  where `overflow: clip` does not**, which is what example 2's clamp uses. The copy button is
  `input-group`'s, lifted unchanged; example 4 makes its two rules fail live (a button that renames
  itself, a tick that is the only cue).

**`feedback-status` is complete.**

### data-display
- [x] `data-table` — done, **CSS-only** (`--no-js`), 21/21 tests in Chromium. **Canonical home for
  `.ac-table*` and for `.ac-table-scroll`**, which is `tabindex="0"` + `role="region"` +
  `aria-labelledby` pointing at the caption's id — so the name is written once and the region and the
  table agree. The component has no behavior, so every readout on the page is **hand-written and
  asserted against the real accessibility tree by the spec**, `typography`'s arrangement rather than
  `jump-nav`'s. Example 2 is the stacked-card restyle beside the table it came from; example 3 is the
  same two columns as plain cells, as column headers, and as both, with each label's role printed;
  example 4 is one wide table in a bare `overflow-x` wrapper and in a named one; example 5 names a
  table four ways and two of them are not names. Five findings, and the first two changed what the
  page says. **`display: block` no longer drops the table role** — Chromium 151 still reports
  `table`, `row`, `rowheader` and `cell` for the restyled table, so the reason everyone gives for not
  doing it is out of date; the reasons that survive are that the cells of a row stop sharing a top
  edge (measured, `[145, 177, 210]` against `[58, 58, 58]`), and that **`td::before { content:
  attr(data-label) }` is folded into the cell's accessible name** — the cell becomes `Left: 37` while
  still associated with the `Left` columnheader, which is clipped rather than hidden and therefore
  still in the tree, so the column is announced twice. That is `chip-toggle`'s generated-content trap
  arriving through a table. **A base rule written `.ac-table th, .ac-table td` is (0,1,1) and
  outranks every single-class modifier on a cell**, so `.ac-table__num` and `.ac-table__head` were
  silent no-ops until the tests caught them — every modifier is now written `.ac-table .thing`. And
  two things about the caption: **a table with no caption, no `<th>` and no borders is demoted to
  `LayoutTable`** by Chromium and is not exposed as a table at all — a `<caption>` alone promotes it
  and `aria-label` does not — and **a `<caption>` inside a `display: block` table keeps
  `display: table-caption`** and shrink-wraps to one word per line.
- [x] `prose-surface` — done, **CSS-only** (`--no-js`), 31/31 tests in Chromium. **The container for
  markup you did not write**, so everything inside it is selected by element and the readouts are
  hand-written and asserted against the tree, `data-table`'s arrangement. Lifts the scroll-region
  contract from `data-table` rather than re-arguing it, and names the surface from **its own first
  heading** — the caption trick with the label inside the region instead of at the top of it.
  Example 2 is one long code line in three surfaces; example 3 attributes the same quote three ways;
  example 4 is a typed-in list beside a real one; example 5 clips a box and scrolls the same box.
  Four findings. **`overflow: hidden` gets no Chromium tab stop** — the headline, and it is a
  correction to what `result-panel` recorded; see the gotchas list, and both of that component's
  comments now say the right thing. **A host page's `h1`–`h6` rules are not an edge case here, they
  are the normal condition** — this is the one component whose whole job is styling bare elements
  inside somebody else's page, so `typography`'s cascade finding is load-bearing rather than
  interesting, and every heading rule declares `text-transform`, `letter-spacing` and `text-shadow`
  it does not appear to need. **A `<pre>` is a scroller inside a scroller** and needs the same three
  attributes as the surface, with its ring **inset** (`outline-offset: -3px`) because the surface
  clips a positive one on the edge that matters. And **a broken example has to be laid out as
  carefully as the good one**: the failing blockquote in example 3 kept the UA's
  `margin-inline: 40px` and no bar, so the three cases whose whole claim is that nothing tells them
  apart were visibly different — caught by the screenshot pass with every test green, and the spec
  now asserts all three compute the same border, padding and margin. Same for the typed bullets in
  example 4, which needed a hanging indent to line up with the real `<ul>`.

**`data-display` is complete.**

### compositions
- [ ] `app-page-to-markdown`

---

## Remaining non-component work

### 0a. Rewrite every `meta.json` `summary` in the new voice

**New rule, from the user, 2026-07-28.** The `summary` renders as the lede at the top of the
component page, on the index card, and as the page `<meta description>`. Every one written so far is
declarative and clause-strung — *"A message with a tone — the icon decorates, the word carries it.
… Four live failures: …"* — which reads as keywords bolted together rather than as someone
explaining the component.

The replacement voice is in `CLAUDE.md` under **Writing style**: two or three sentences, ~50 words,
leading with the reader's problem rather than the ARIA attribute, naming at most one attribute, and
**never enumerating or counting the examples** (`demoNote` already does that, and the page shows
them). `status-text` onward is written this way from the start; everything before it is a sweep, and
it pairs naturally with the on-page copy cut in 0b below since both are read at the same time.

Cheap to do — one field per component, no tests touch it.

### 0b. Cut the on-page copy back — every component built before 2026-07-28

**New rule, from the user, 2026-07-28.** The text that *renders on a component page* — the
`ac-demo__title`s, the `__note` paragraphs, captions, verdicts, readout labels — has to be short and
scannable. One or two plain sentences. No restated context, no second explanation of a point already
made. The long-form reasoning belongs in `docs.md` and in the source comments, where someone has
opted into reading it.

This is stricter than `CLAUDE.md`'s general "say it once" rule and it applies only to what a visitor
sees on screen. `loading-button` is written to it and is the reference. Everything before it is not:
`effects`, `motion-preferences`, `typography`, `live-region`, `focus-ring`, `button` and
`icon-button` are the worst, because their notes carry whole paragraphs of argument.
`chip-toggle`, `notice`, `status-text` and `badge` are written to it as well.

Also settled while building `notice`: **a demo that repeats a case three times cannot reuse one
button label.** Three buttons reading "Save the crate" are three identical accessible names on a
page that argues against exactly that, so each takes an `aria-label` starting with the visible text
(SC 2.5.3) and naming its case.

Do it as a sweep, one component at a time, and move anything cut into that component's `docs.md`
rather than deleting the reasoning. **Do not touch the tests' assertions on verdict text without
re-running them** — several specs match on a phrase.

Also settled while writing `loading-button`: the demo grid stacks its cases at every width the site
actually produces, so **never write "the left one" / "the right-hand readout"** in demo copy. Name
the case (`spinner only`, `keeps its name`) instead.

### 1. Retrofit everything built before the copyability conventions

`CLAUDE.md` gained a **Writing style** and a **Copyability** section after `dropdown`, `disclosure`
and the site pages were written. Those three predate it and do not follow it. `field` is the
reference implementation — copy its shape.

Each retrofit target needs:

- **Numbered example sections in `component.html`**, each with a visible `<h3 class="ac-demo__title">`
  so the rendered demo and the HTML tab match by eye. This was the actual complaint: with five demos
  on the dropdown page there is no way to tell which markup is which.
- **`component.css` / `component.js` sectioned by concern**, each header naming the examples that
  need it (`[CORE — all examples]`, `[3, 5]`, `[OPTIONAL — …]`), plus a copy map in the file header.
- **The framework caveat** at the top of `docs.md`.
- **Verbosity cut.** `dropdown`'s `docs.md` and `component.js` header are the worst offenders.

| Target | Why it needs it |
| --- | --- |
| ~~`dropdown`~~ | **Done.** Also lost its bottom sheet to `drawer`. |
| `disclosure` | Small, but same problem, and still has **no spec** — backfill that at the same time. |
| ~~`src/site/pages/index.astro`~~ | **Done** with the header redesign below. |
| ~~`src/site/pages/components/index.astro`~~ | **Done.** |

**Settled:** demo scaffolding (`.ac-demo-grid`, `.ac-demo`, `.ac-demo__title`, `.ac-demo__legend`)
lives in `src/site/styles/site.css`, not in any `component.css`. It was duplicated per component, and
dropdown's copy leaked site-wide because `BaseLayout` loads that file for the header theme picker.
Keeping it in the shell means everything inside a `component.css` is real component code.

**Still open:** whether the demo `<h3>`s should be linkable (`id` + anchor). Deep-linking to "example
3" would be genuinely useful and the global `scroll-margin-top` already clears the sticky header. Left
out for now rather than adding six ids with no consumer.

### 2. ~~Shared a11y gate~~ — **done, `tests/shared/a11y.spec.mjs`**

Ten checks × 33 components = 330 tests, plus `.github/workflows/ci.yml` (`npm ci`, `check:tokens`,
`playwright install chromium`, `playwright test` — the Playwright config builds and serves the site
itself, so the build is covered). The slug list is read from `meta.json` with `node:fs`, **not**
imported from `registry.mjs`, which is built on Vite's `import.meta.glob`.

| Check | What it asserts |
| --- | --- |
| axe | Full tag set, partitioned against `data-ac-demo-broken` in both directions |
| contrast | `color-contrast` repeated across all ten themes |
| tab order | No positive `tabindex` — the one thing that detaches focus order from DOM order |
| focusability | `el.focus()` then read `activeElement` back, the ground-truth probe |
| focus visible | An outline with width, or a box-shadow (SC 2.4.7) |
| SC 2.4.11 | A focused control is never left under the sticky header |
| SC 2.5.8 | Targets ≥24×24, with the inline and user-agent exceptions honored |
| reduced motion | Both routes — `emulateMedia` **and** `[data-motion="off"]` — give 0 durations |
| forced colors | The component ships a `@media (forced-colors: active)` block *and* it takes effect |
| SC 1.4.10 | No horizontal overflow at 320×640 |

Four things worth knowing before editing it:

- **The deliberate failures are asserted, not skipped.** Every claim in a `data-ac-demo-broken` list
  has to still fire, and a violation inside a marked element that is *not* in its list still fails.
  That check is what makes the file worth more than a lint run — see the typography incident above.
- **`:disabled`, never `el.disabled`.** The IDL property reflects only the control's own attribute,
  so it is `false` for every input inside a `<fieldset disabled>` — the gate hit the library's own
  documented gotcha on its first run and reported eight healthy controls as broken.
- **SC 2.5.8 is about *pointer* targets and has exceptions.** A focusable heading or scroll region
  is not a target; a link inside a sentence is exempt; a native checkbox is user-agent sized. A
  sweep written without those reports the spec rather than the page — it flagged 60 elements, all
  fine. And "the target" is the control *or any label bound to it*, whichever clears both
  dimensions: comparing areas instead picks a full-width block label that is 282×18 and clears
  nothing.
- **The contrast test needs `test.setTimeout(180_000)`.** Ten axe passes over a demo page does not
  fit in the default 30s, and the failure looks like a hang rather than a slow test.

**Not built, deliberately: the accessibility-tree snapshot fixture.** A committed `ariaSnapshot` of
a whole demo page is enormous, and these pages update their own readouts on interaction and on load,
so the fixture would churn on every run and be re-recorded rather than read. The per-component specs
already assert the tree where it carries the argument — `typography` and `data-table` both check
hand-written readouts against the real accessibility tree, which is the same guarantee scoped to
where it means something.

`tests/site-header.spec.mjs` still covers the shell's own controls and the gate does not duplicate
it. `field`'s per-component copies of the reduced-motion, 320px and ≥24×24 checks are now redundant
with the gate but are left in place — they are cheap and they name the component in the failure.

### 3. Docs

`docs/authoring-a-component.md`, `docs/at-support.md` (manual NVDA/JAWS/VoiceOver/TalkBack matrix,
dated; mark untested combinations untested rather than assuming they pass), `docs/wcag-mapping.md`
(outcomes + SC + contrast in both WCAG 2.x ratio and APCA Lc, for the eventual WCAG 3 migration).

**All three of these exist and are substantive** — written at some point without this item being
ticked. What is genuinely left is filling `at-support.md`'s matrix, which needs a real screen reader
rather than a keyboard.

### 5. The agent-facing layer — **built, all eight phases, see `docs/agent-layer.md`**

The library has two audiences and only the human one was built for. An agent arriving before this work
found no `AGENTS.md`, no index, no `llms.txt`, a 1.42 MB corpus, and a `CLAUDE.md` telling it to read
this 113 KB file first. The design record has the measurements, the four-tier read path with its token
budgets, the one-manifest generator that keeps every surface in sync, and the accuracy tests that
assert the hand-written contracts against the real markup.

**All eight phases are done.** All four tiers ship — `AGENTS.md` at 2.4 KB, `agents/index.md` at
3.2 KB, `agents/index.json`, `agents/llms.txt`, and a per-component contract in
`agents/components/<slug>.md` at 0.9–1.7 KB — plus the four cross-cutting Tier 4 surfaces,
`agents/{pitfalls,conventions,verify,testing}.md`, and a generated Claude Code skill at
`.claude/skills/a11y-library/SKILL.md` (2.8 KB) that is Tier 0's third door. All of it is rendered by
`scripts/build-agent-surfaces.mjs` and gated by `npm run check:agents` in `verify` and in CI, plus
`tests/shared/agent-surfaces.spec.mjs` in the suite. **Answering "how do I build an accessible X" costs
an agent 6.8–7.2 KB** — Tier 0, the index, and one contract — against a `src/library/` of 1,833 KB.

Two things from phase 7 that outlive it:

- **A component edit is now an edit to its contract too, and three checks enforce it.** They read
  `component.html` in a browser and `component.js` as text, and report ARIA, keys or factories the
  contract does not admit to. `CLAUDE.md` > **Component folder shape** has the table of which change
  obliges which field. The one row nothing can check is `summary` → `contract.useWhen`: a fingerprint in
  `agents/index.json` fires, names the component, and leaves the judgement to a person.
- **`contract.root` is required, and `.ac-<slug>` is not what you think.** Every ARIA check scopes to
  the selectors a contract declares, because the class cannot be derived from the slug — it holds for 15
  of 33 components and fails for the rest. Rename a component's root class and `root` moves with it, or
  the check quietly stops checking. That is what its two guards exist to prevent.

One thing from phase 6 that outlives it:

- **A fact stated in three places gets corrected in two.** Phase 5 made the accessibility findings a
  four-homes rule and added a check for the one overlap that is mechanizable; it updated `CLAUDE.md` and
  the design record and left the copy in this file saying "three homes" and "nothing checks for it". Phase
  6 found it by reading, not by any check. Same session found `scripts/new-component.mjs` still sending a
  new component's author to `docs/component-specs.md` for the contract — the misrouting phase 5 fixed in
  `CLAUDE.md` — in its own header and inside the spec template it writes. **When you correct a
  convention, grep for it.** The layer mechanizes the overlaps it knows about; the rest is on the person
  making the change.

Two things from phase 5 that outlive it:

- **`CLAUDE.md` and `agents/conventions.md` state the same conventions on purpose**, one as a checklist
  for whoever adds a component and one as an explanation for whoever pastes one out. The three canonical
  CSS shapes — the token chain, the accent mixed toward `--text`, the motion `calc()` — are duplicated
  verbatim, `CLAUDE.md` is canonical, and `tests/shared/agent-surfaces.spec.mjs` asserts they still
  match. Change a token name, a percentage or a duration in one and change the other in the same commit.
- **`docs/component-specs.md` is a pre-build planning record, not a component reference.** It decided
  the patterns before they were built and has no entry for `disclosure`, `dropdown` or `field`. For a
  built component's ARIA contract and keyboard map, `agents/components/<slug>.md` is the generated,
  asserted answer; go to `component-specs.md` for the design reasoning and the CSS gotchas it carries
  that a contract does not.

Two things from phase 4 that outlive it:

- **Never let a generator clear `.claude/`.** `npm run agents` rebuilds `agents/` from scratch so a
  deleted component cannot leave an authoritative-looking file behind. `.claude/` must never get the
  same treatment: `settings.local.json` lives there, and it is machine-specific and gitignored and so
  unrecoverable. The skill is written in place, and a leftover from a renamed skill folder is caught
  instead by ownership-by-signature — a file under `.claude/skills/` is the generator's only if it
  carries the do-not-edit marker, which also leaves a hand-written skill of your own alone.
- **`.claude/skills/a11y-library/SKILL.md` is generated**, from `docs/agents/preamble.md`'s two
  `skill-*` slots. Hand-edit it and `npm run check:agents` reverts your work. Its `description` is the
  routing mechanism Claude Code matches against a request, which makes it the one string in this repo
  where keyword coverage beats brevity — and its pattern nouns are a trigger net, not a roster, so do
  not sync them to `agents/index.md`.

One thing from phase 3 that outlives it:

- **The accessibility findings have four homes now, and a new one belongs in exactly one.** A fact
  about the platform that makes correct-looking markup wrong goes in `docs/agents/pitfalls.src.md`. A
  fact about Playwright or axe that makes a correct assertion wrong goes in `testing.src.md`. Something a
  copied component assumes about the page it lands in goes in `conventions.src.md`. Anything
  about working *on* this repo stays in the gotchas list here. Writing it in two places is the drift
  the layer exists to prevent, and only one overlap is checked — the CSS shapes shared with `CLAUDE.md`.

Two things from phase 2 that outlive it:

- **A contract's `aria` block is what must be in the markup you copy** — so an attribute that exists
  only in a transient state (`aria-busy` while pending, `aria-invalid` after a failed validation)
  belongs in `states`, not `aria`. The browser check asserts against the initialized demo at rest and
  will fail otherwise. It caught `loading-button` in the same session the rule was written down.
- **A key documented in a contract must be pressed by that component's own spec**, unless its effect
  starts `native:` — the browser owns those, and testing them would be testing Chromium. Adding a key
  to a `contract.keyboard` therefore means adding a press to `tests/<slug>.spec.mjs`.

Three things from phase 1 that outlive it:

- **`GROUPS` moved to `src/site/lib/groups.mjs`.** `registry.mjs` re-exports it and now only holds the
  glob. Anything that runs under plain Node — the generator, any future script — imports groups.mjs,
  because `import.meta.glob` makes `registry.mjs` loadable by Astro alone.
- **The generator refuses mojibake in any file it reads.** PowerShell 5.1's
  `Set-Content -Encoding utf8` re-encodes a file it round-trips, and `—` becomes `â€"`. It corrupted
  `preamble.md` and `tabs/meta.json` during the phase and reached a generated surface unnoticed. Never
  round-trip a repo file through `Get-Content -Raw` / `Set-Content`; use the editor, or
  `git checkout --` to undo it.
- **A `new:component` scaffold can publish itself.** Nothing filters `status !== 'draft'` out of the
  human index, the nav or `getStaticPaths`, so an untouched scaffold reaches the site as a card and a
  sidebar row reading its own `TODO:` placeholder summary, plus an empty page — and the a11y gate
  starts driving it. Found during phase 1, with a scaffold that was sitting in the tree; deleting it
  was the fix that session, but the gap is still open. Worth closing next time those pages are open.
  The agent surfaces are covered either way: the generator carries `status` through to
  `agents/index.{md,json}` and marks any non-stable component on its index row.

### 6. Lint the gotchas that can be linted

Surveyed after phase 3, when the gotchas list was cut to the 19 that are about working *on* this repo.
Five of those 19 are already handled and the entry is only the explanation; six more are irreducible
environment facts. What is left is below, ranked, with the measurements so they do not need repeating.

Worth a check:

1. **Encoding, repo-wide.** `build-agent-surfaces.mjs` throws on `â€` only in what it reads — the five
   files in `docs/agents/` and every `meta.json` — so every `component.*`, every `docs.md` and this file
   are unguarded, and a 98 KB prose file is exactly what gets round-tripped. The only trap on the list
   that silently corrupts the product. Needs an allowlist, and re-measured on 2026-07-30 it is **three
   files, ten lines**: four in `scripts/build-agent-surfaces.mjs` (the guard's own doc comment, condition
   and message), two in `docs/agent-layer.md`'s record of the incident, and four in this file. Same shape
   as `data-ac-demo-broken`. **Re-measure again before writing the check rather than trusting the number**
   — it has now been wrong twice: an earlier version said two files, having forgotten the one it was
   written in, and the eight-line count went stale within the month.
2. **"What you see is what you copy", asserted.** Rule 1 of `CLAUDE.md` and nothing enforces it.
   `src/` → `public/` is byte-identical — measured, 89 of 89 files — but that is the sync, not the
   page. The open edge is the inlined `<style>` / `<script>`: drop `is:inline` and Astro bundles it,
   so the demo stops being the thing the code panel shows. Compare the page's inlined CSS against the
   served file.
3. **Readout-key uniqueness.** 159 keys across 14 components, currently **no duplicates anywhere**, so
   this is a green guard rather than a discovery. It bit once before shipping.

Worth eliminating instead of documenting:

4. **Node's PATH** → `.claude/settings.local.json`, which `.gitignore` already excludes. `C:\nvm4w\nodejs`
   is machine-specific and this repo is public, so it must not be the committed `settings.json`.
5. **`scripts/shots.mjs <slug>`** — the screenshot entry is a recipe with two failure modes and says it
   has been rewritten repeatedly. One command deletes both.
6. **`npm run clean`** — `.astro` and `dist`, so the stale-cache incantation is a script.

**Do not write a lint for `getPropertyValue('--ac-` in a spec.** Five specs do it and all five are
correct: they read `--ac-badge-accent`, `--ac-notice-accent`, `--ac-status-accent`,
`--ac-tooltip-arrow-x` and `--ac-motion` on `motion-preferences`' own scope, every one set by that
component's own `component.css`. The gotcha is narrower than it reads — it is about a token *only*
`tokens.css` would have set. The lint would be five false positives out of five hits, and "fixing"
them would break five working tests. Also verified while surveying: **0 of 68 built pages** contain
`style="color:#`, so `code-theme.mjs` is holding and a shiki check would be a green guard too.

### 4. Final verification

`npm run verify`, install the other two browsers, manual keyboard + screen reader pass, check at
320px and 200% zoom, deploy, confirm the live URL matches preview.

---

## Deploying — first-time setup

The repo is on `main` with `origin` already set to
`https://github.com/kaseycolian/a11y-component-examples.git`.

```sh
git push -u origin main
```

History was rewritten into a single root commit, so if anything was ever pushed, the first push needs
`--force-with-lease`.

**Then one step nobody can automate:** GitHub → **Settings** → **Pages** → **Source** →
**GitHub Actions**. Until that is set, `deploy.yml` runs and succeeds but publishes nothing, which
looks exactly like a broken build. If a deploy "passes" and the site 404s, check this first.

The workflow only triggers on pushes to **`main`** — that is why the branch was renamed from
`original-build`. A differently-named branch builds nothing.

Live URL once published: <https://kaseycolian.github.io/a11y-component-examples/>
It must match `npm run preview` exactly, base path included.

---

## Gotchas already solved — do not rediscover these

Working *on* this repo. The transferable accessibility findings moved to
`docs/agents/pitfalls.src.md`, the harness findings to `docs/agents/testing.src.md`, and what a copied
component assumes about its page to `docs/agents/conventions.src.md` — all of which render to the
`agents/` surfaces an agent reads, see `docs/agent-layer.md`. A new finding goes in whichever of the four
homes it belongs to, not in all of them.

- **Node is not on the inherited PATH.** Prefix PowerShell calls with
  `$env:Path = "C:\nvm4w\nodejs;$env:Path"`.
- **Never write a size or a count into a doc by hand.** Three of them were wrong here, each by a
  different mechanism: four rows divided bytes by 1000 while the budget beside them used 1024; one row
  quoted the number out of the generator's budget-failure message, describing a file two edits stale; and
  a gotcha total was counted by eye at 62 against an actual 69. All three were plausible and internally
  consistent, which is why none was caught by reading. Measure with `stat` in a loop, after the last edit,
  and paste the output.
- **A convention in `CLAUDE.md` describes new code, not old code.** `.ac-<slug>` reads like a rule this
  repo enforces; it is true for 15 of 33 components. The rest anchor on an abbreviation — `checkbox` is
  `.ac-choice`, `text-input` is `.ac-input` — and `dropdown` has no `ac-dropdown` class in its markup at
  all. A phase-7 check scoped that way would have swept nothing for over half the library and reported a
  pass. Before building anything that assumes a naming convention holds, **count how many components
  actually satisfy it.** One query, and it reshaped the phase.
- **A probe whose buckets come from your hypothesis can only agree with you.** Sorting unclaimed ARIA
  into "component" and "demo scaffolding" by whether it sat inside `.ac-<slug>` filed `checkbox`'s real
  inputs as scaffolding and made 60 real hits look like noise. What broke it was a question with no room
  for interpretation — *how many components have that element at all* — rather than a better bucket. Ask
  something countable.
- **`process.exit()` inside a `try` skips the `finally`.** A probe that patches files on purpose must
  restore them on every path, and exit is not a path — it terminates immediately. The first phase-7 red
  probe left a patched `component.html` behind that way. Throw instead; let `finally` run.
- **Never round-trip a repo file through PowerShell.** `Get-Content -Raw` then
  `Set-Content -Encoding utf8` re-encodes UTF-8 as Latin-1 on 5.1 and adds a BOM: every `—` becomes
  `â€"`, every `…` becomes `â€¦`. It survives `git diff --stat`, renders as garbage, and in a
  `meta.json` also breaks `JSON.parse` on the BOM. It hit `preamble.md` and `tabs/meta.json` while
  phase 1 of the agent layer was being tested, and the only visible symptom was a generated file
  growing 23 bytes. Use the editor to change a file; use `git checkout --` to undo one.
  `build-agent-surfaces.mjs` now throws on `â€` in any source it reads.
- **Astro's `<Code>` component does not inherit `markdown.shikiConfig`.** They are configured
  separately, and a `<Code>` given no `themes` falls back to a single hardcoded `github-dark`
  written as inline `style="color:#…"` on every token — which beats any stylesheet. So a page can
  have two code blocks side by side, one following the theme and one not, with nothing in either
  file to suggest it. `src/site/lib/code-theme.mjs` exists to keep the two consumers in step.
  Check by grepping the built HTML: `astro-code-themes` in the class list means the dual-theme
  custom properties were emitted, and `style="color:#` anywhere means they were not.
- **A blanket fix will reach the example that exists to be broken.** The codemod that mixed every
  accent-as-text toward `--text` repaired `typography`'s color-only link, whose whole argument is
  1.27:1 against the sentence around it. Caught by that component's own spec. The general rule: a
  broken variant needs a comment saying it must stay broken, and the gate has to *assert* the
  failure rather than skip it — same shape as a `[FORCED]` block reaching a broken variant.
- **`npm run x -- --flag "two words"` loses the quotes.** `new-component.mjs` joins words up to the
  next `--` to compensate. Running `node scripts/new-component.mjs …` directly is more predictable.
- **Astro `srcDir` is `./src/site`**, so pages live at `src/site/pages/`. `src/library/` is
  deliberately outside it.
- **`[slug].astro` uses `import.meta.glob(..., { query: '?raw', import: 'default', eager: true })`**
  and picks by path suffix. Astro cannot do a dynamic `import()` of a raw file per-slug.
- **The demo's CSS goes in `<slot name="head">`, the JS in `<slot name="end">` with `is:inline defer`.**
  `is:inline` stops Astro bundling it, which is what keeps the served file byte-identical to the
  copy panel.
- **npm 11 gates install scripts.** `allowScripts` in `package.json` already approves esbuild and
  sharp; re-approve with `npm approve-scripts <pkg>` if a new one appears.
- **Header height is not a number you can reason out — measure it in a browser at ~15 widths.** The
  two-row header wraps in three different places (brand name, brand tagline, settings row) and each
  wrap is worth 20–35px of sticky header. Every fix moved the problem to a different width until it
  was measured rather than argued: shrinking the theme trigger fixed 320px and needlessly truncated
  theme names at 375px, `white-space: nowrap` on the brand fixed 900–1024px and overflowed the page
  at 320px. The measurement loop is a Playwright script over a list of widths printing header height,
  each control's rect, and `scrollWidth > innerWidth` — cheap to rewrite, and it settles in one run
  what CSS reasoning gets wrong repeatedly.
- **`[glob-loader] Duplicate id "<slug>" found in …/docs.md` is a stale `.astro` cache, not a
  bug.** It appears after a `docs.md` is created or replaced — the content layer has the
  old entry cached and re-syncs the new one under the same id. This was recorded twice with
  contradictory ordinals, first build versus second, so do not re-add one. The page it
  names still builds correctly. `Remove-Item -Recurse -Force .astro` and rebuild; the warning is
  gone and nothing else changes. Do not go looking for a duplicate file — the glob's `base` is
  `src/library/components` and `public/library/` is not in it.
- **A readout key has to be unique across the whole page, not within its example.** `out()` is a
  document-wide `querySelector`, so two examples both using `data-ac-…-out="good"` silently write
  to the first one and the second readout never updates — caught in `status-text` before it shipped.
  Prefix the key with its example when the obvious word is already taken (`detail-good`).
- **Git is 2.24** — no `git init -b`, no interactive flags.
- **`src/library/tokens/tokens.css` is not loaded by the site.** It is an optional layer and no page
  links it, deliberately: a component has to work from the fallback chain alone. So
  `getPropertyValue('--ac-motion')` in a test on a component page returns `""`, not `1` or `0`, and
  the value that resolved is theme-service's `--motion`. Assert on the *effect* (a computed duration,
  `getAnimations().length`) or read the theme token, never the `--ac-*` name.
- **A `MutationObserver` callback is a microtask, so it lands after the click handler that caused
  it.** Clearing a mock-AT log in the same handler that resets the demo therefore empties the list
  *before* the reset's own mutations arrive, and they reappear in it. Clear in a
  `requestAnimationFrame` instead. Every page in the library with a "reset" button beside a mock
  screen reader has this shape.
- **A deliberately broken example has to opt out of the file's own `[FORCED]` block.** The good
  forced-colors rule matches the failing element too — `.ac-chip[aria-pressed="true"]` covers
  `.ac-ct-chip-flat` — so the block silently repairs the failure the example exists to show. The
  broken variant needs its own line putting it back to what a component with no forced-colors block
  gets for free. Screenshots do not catch this; only reading the computed style in both states does.
- **The header's motion toggle cannot be `.check()`ed.** The real input is `opacity: 0` under
  `.switch__track`, which intercepts the pointer, and Playwright retries for the full timeout. Click
  `.switch__track` the way a person clicks the label, or focus the input and press Space.
- **Screenshot the finished page before ticking the row.** It has caught a real bug three times, and all
  times every test was green. The recipe, because it fails two ways otherwise: a throwaway script that
  imports `{ chromium } from '@playwright/test'` **must sit in the repo root** — from the scratchpad it
  dies with `ERR_MODULE_NOT_FOUND`, since ESM resolves `node_modules` upward from the script's own
  directory — and `npm run preview` has to already be running, started as a background job and stopped
  after. Shoot the component root (`.ac-demo-grid`) at 1280 and 320, and print
  `document.documentElement.scrollWidth - clientWidth` while you are in there. Delete the script from
  the repo root afterwards; `git status` should come back with only the component folder.
  **Shoot `.ac-demo-grid > .ac-demo` one at a time as well.** A single tall element screenshot stitches
  while it scrolls, so the sticky header paints across the middle of it and hides an example — that is
  an artifact, not a bug, but it is also where a real one goes unnoticed. And print
  `document.activeElement.tagName` in the same pass; it is one line and it is what caught
  `document.body.focus()` leaving a keyboard reader parked mid-page — now in
  `docs/agents/pitfalls.src.md`. **The stitching is avoidable: open the page at `{ width, height: 3000 }`.** With a
  viewport taller than the demo, an element screenshot never scrolls and the header cannot paint into
  it — the per-example shots come back clean at both widths with no second pass.
- **Astro's bundled `site.css` loads *after* every `component.css`.** Head order is theme, effects,
  dropdown, the page's component, then the `_astro/*.css` bundle. So a shell rule at **equal**
  specificity wins over a component's. This bites exactly one rule shape: `site.css` ships a global
  `:focus:not(:focus-visible) { outline: none }` at (0,2,0), which cancels any component's
  `.thing:focus { outline: … }`. `focus-ring`'s `--always` variant carries a deliberately doubled
  selector for this, with the reason in the CSS; `skip-link` never hit it because its rings are only
  ever reached by keyboard, where `:focus-visible` matches and the reset does not apply.

---

## Decisions worth not re-litigating

- **No `src/library/core/` shared modules.** Components are fully self-contained — deliberately not
  DRY, because a copy-paste library is better served by each file standing alone.
- **Dropdown ships one focus model** (real DOM focus on options), not two. `aria-activedescendant`
  is unreliable on iOS VoiceOver and TalkBack; the tradeoff is documented in its `docs.md`.
- **`data-ac-secondary` text IS part of an option's accessible name.** Correct — it is real
  information, not decoration. Only `data-ac-icon` and `data-ac-swatch` are `aria-hidden`.
- **`components.css` and `theme-select.js` are not vendored** from theme-service. See
  `src/site/theme/THEME-SERVICE.md`.
- **The motion toggle can only add the restriction**, never override an OS reduced-motion
  preference. Correct per the cascade in `effects.css`; documented, not worked around. When the OS
  asks for reduced motion the toggle is `aria-disabled` rather than `disabled`, so it keeps its place
  in the tab order and the visible note explaining why is actually announced.
- **`field` validates on blur, and that is a knowing tradeoff.** Tabbing through an untouched
  required field errors at you. It is opt-in per field (`data-ac-validate`), the alternative
  (`check()` + `focus()` on submit) is documented, and the reasoning is in the component's `docs.md`.
