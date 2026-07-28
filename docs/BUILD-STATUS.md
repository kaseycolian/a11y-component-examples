# Build status

**Resume point.** `CLAUDE.md` (auto-loaded) has the conventions. This file has progress and the
ordered next steps. `component-specs.md` has the pre-decided ARIA contract for every remaining
component — read the one entry you need, not the whole file.

Read in this order and nothing else is needed to start: **START HERE** for the next component,
**The road to done** for the route and what depends on what, **The loop** for how to build one.
**Gotchas already solved** is worth a skim before debugging anything.

**Keep this file current.** Tick the roster row as each component lands, or the next session
re-does work.

Last updated: 2026-07-28 (effects)

---

## START HERE — next component is `button`, and it opens `buttons-actions`

`effects` landed (16/16 Chromium) and **`foundations` is complete**. Run the loop below with:

```sh
node scripts/new-component.mjs button --group buttons-actions --name "Button"
```

Decided in advance, so do not re-derive:

- Spec entry: `component-specs.md` → buttons-actions → `button`. Native `<button type="button">`
  with `.ac-btn`, the three weights (`--solid` / `--outline` / `--ghost`) and the four accents
  (`--pink` / `--green` / `--blue` / `--purple`). No ARIA — it is a button.
- **This is the canonical home for `.ac-btn`, and there is no `.ac-btn` anywhere in `src/library`
  yet.** Every component that needed one minted a local copy: `.ac-motion__btn` in
  `motion-preferences`, and the addon buttons in `input-group`, `modal`, `drawer` and `tooltip`.
  Those stay — components are deliberately not DRY — so list them in the roster row the way `field`,
  `visually-hidden` and `fieldset-group` list theirs.
- The two things this page exists to say: **always set `type`** (a bare `<button>` in a form submits
  it), and **`disabled` is unfocusable and announces nothing** — when the user needs to know *why*,
  `aria-disabled="true"` plus a blocked handler is the pattern. `switch`, `motion-preferences` and
  `fieldset-group` all ship that already; lift the argument rather than re-deriving it, and remember
  Playwright needs `{ force: true }` to click a soft-disabled control.
- The press transform is motion-gated through `--ac-press-y` / `--ac-press-s`, which
  `tokens.css` already defines. Targets ≥24×24 (SC 2.5.8), 44px preferred.
- `icon-button` → `loading-button` → `chip-toggle` follow, and all three extend `.ac-btn`. Decide
  the modifier surface here with that in mind.

---

## The road to done

Fifteen components and four infrastructure items. Every remaining component already has a spec entry
in `component-specs.md` — `disclosure` is the only slug in the repo without one, and backfilling it is
part of item 1 below. **Read the entry, do not redesign it.**

Build in this order. The order is the dependency graph, not a preference.

| Batch | Slugs | Why here |
| --- | --- | --- |
| ~~**A**~~ | ~~`effects`~~ | **Done.** Closed `foundations` |
| **B** | `button` → `icon-button` → `loading-button` → `chip-toggle` | `button` is canonical `.ac-btn` and the other three extend it |
| **C** | `notice` → `status-text` → `badge` → `result-panel` | all four are small, and three of them restate `live-region`'s argument in a new shape |
| **D** | `tabs` → `jump-nav` | `tabs` is the largest behavior left; `jump-nav` reuses its `aria-current` thinking |
| **E** | `data-table` → `prose-surface` | `prose-surface` is the scroll-region pattern `data-table` establishes |
| **F** | `app-url-maker` → `app-page-to-markdown` | **last.** They compose the others and cannot be built before them |

Cross-batch notes that will otherwise be rediscovered:

- **There is no `.ac-btn` anywhere in `src/library` yet.** Every component that needed a button minted
  a local one (`.ac-motion__btn`, and the addon buttons in `input-group`, `modal`, `drawer`,
  `tooltip`). Those stay — components are deliberately not DRY. When `button` lands it becomes the
  canonical home, so list the local copies in its roster row the way `field`, `visually-hidden` and
  `fieldset-group` list theirs.
- **`result-panel`'s copy button is `input-group`'s copy button.** Same clipboard write, same
  pre-existing empty `role="status"`, same rule against renaming the button. Lift it.
- **`status-text` and `notice` are the same SC 1.4.1 point twice** — the glyph is `aria-hidden` and the
  *word* carries the meaning. Make that argument on `notice` and point at it from `status-text`, or
  the two pages read as duplicates.
- **`tabs` has a working reference in `src/site/components/CodePanel.astro`.** Roving tabindex,
  automatic activation, panel at `tabindex="0"`.
- **Batch F composes with `effects`** — `app-page-to-markdown` is specified around `fx-bar-top`,
  `fx-scroll` and `fx-bar-bottom`, which are now documented and patched. Its scrollable preview is
  the `fx-scroll` case: `tabindex="0"` + `role="region"` + a name, and the focus ring from
  `effects`' `[PATCH]`.

Then the four items under **Remaining non-component work**, in this order:

1. **`disclosure` retrofit + spec backfill** — any time, and best as a session warm-up rather than
   squeezed onto the end of one. It is the only component off-convention.
2. **The shared a11y gate (item 2) — land it before batch F, not after all the components.** Its value
   is catching a regression across the twenty already built, and every batch after it is checked for
   free. Doing it last means it only ever runs once.
3. **Docs (item 3)** — after the gate, because `wcag-mapping.md` should be generated against something
   that is actually being enforced.
4. **Final verification and deploy (item 4)** — last. Two known blockers are already written up below:
   Firefox and WebKit are not installed, so `npm run verify` fails at the test step until
   `npx playwright install firefox webkit`; and GitHub Pages **Source** must be set to **GitHub
   Actions** by hand or a green deploy publishes nothing.

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
3. Fill in `meta.json` (summary, tags, apg, wcag) and set `status` to `stable`.
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
  reaching into the component's internals. Two rows on a phone: brand + settings, then the picker
  full-width.
- **Header theme picker** — is the library's own Dropdown, loaded site-wide from
  `public/library/components/dropdown/` by `BaseLayout`. The shell is a *consumer* of the library, so
  a regression in the dropdown breaks the site, not just a test. Covered by
  `tests/site-header.spec.mjs`.
- **Home hero** — two columns from 68rem up, prose left at its own measure, a real `Field` markup
  excerpt right (`tabindex="0"` + `role="group"`, because it scrolls sideways). No component counts
  anywhere: see the **Writing style** rules in `CLAUDE.md` — never count, and demo content is 90s punk
  song/album references with `462` and `99` as the arbitrary numbers.
- **Markdown tables** — `scripts/rehype-scrollable-tables.mjs` wraps every `docs.md` table in a
  focusable `.table-scroll` region. Without it every component page overflowed sideways at 320px.
- **Playwright** — `playwright.config.mjs`, three browser projects, `webServer` runs
  `npm run build && npm run preview`. **Only Chromium is installed**, so `npm run verify` currently
  *fails* at the test step: every Firefox and WebKit test errors with "Executable doesn't exist".
  Chromium is **434/434**. Run `npx playwright install firefox webkit` to get a green `verify`.

---

## Component roster — 21 / 35

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
- [ ] `button`
- [ ] `icon-button`
- [ ] `loading-button`
- [ ] `chip-toggle`

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
- [ ] `tabs` — a working reference already exists in `src/site/components/CodePanel.astro`
- [ ] `jump-nav`

### feedback-status
- [ ] `notice`
- [ ] `badge`
- [ ] `status-text`
- [ ] `result-panel`

### data-display
- [ ] `data-table`
- [ ] `prose-surface`

### compositions
- [ ] `app-url-maker`
- [ ] `app-page-to-markdown`

---

## Remaining non-component work

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

### 2. Shared a11y gate — `tests/shared/a11y.spec.mjs`

Drives every component in the registry:

- `@axe-core/playwright`, tags `wcag2a wcag2aa wcag21a wcag21aa wcag22aa best-practice`, repeated
  per `data-theme` value
- Tab reachability in DOM order + a visibly changed focus indicator
- focus never obscured by the sticky header (SC 2.4.11)
- accessibility-tree snapshot as a committed fixture
- reduced motion via **both** routes (media emulation and `data-motion="off"`) → durations 0
- `forcedColors: 'active'` → states still distinguishable
- 320×640 → no horizontal overflow (SC 1.4.10)
- interactive boxes ≥24×24 (SC 2.5.8)

Then `.github/workflows/ci.yml`: `npm ci`, `check:tokens`, `build`, `playwright test`.

`tests/site-header.spec.mjs` already covers the shell's own controls (theme picker, motion toggle) —
that is not the gate, and the gate should not duplicate it.

Several of these bullets now have a one-component precedent in `field`'s spec (reduced motion,
320px reflow, the ≥24×24 sweep). Lift them from there rather than reinventing, then delete the
per-component copies once the shared gate covers every slug.

### 3. Docs

`docs/authoring-a-component.md`, `docs/at-support.md` (manual NVDA/JAWS/VoiceOver/TalkBack matrix,
dated; mark untested combinations untested rather than assuming they pass), `docs/wcag-mapping.md`
(outcomes + SC + contrast in both WCAG 2.x ratio and APCA Lc, for the eventual WCAG 3 migration).

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

- **Node is not on the inherited PATH.** Prefix PowerShell calls with
  `$env:Path = "C:\nvm4w\nodejs;$env:Path"`.
- **`npm run x -- --flag "two words"` loses the quotes.** `new-component.mjs` joins words up to the
  next `--` to compensate. Running `node scripts/new-component.mjs …` directly is more predictable.
- **Astro `srcDir` is `./src/site`**, so pages live at `src/site/pages/`. `src/library/` is
  deliberately outside it.
- **`[slug].astro` uses `import.meta.glob(..., { query: '?raw', import: 'default', eager: true })`**
  and picks by path suffix. Astro cannot do a dynamic `import()` of a raw file per-slug.
- **The demo's CSS goes in `<slot name="head">`, the JS in `<slot name="end">` with `is:inline defer`.**
  `is:inline` stops Astro bundling it, which is what keeps the served file byte-identical to the
  copy panel.
- **`[popover]` needs a UA-style reset** — `inset: auto; margin: 0; border: 0; padding: 0` — or the
  browser centers it in the viewport.
- **Do not use `includeHidden: true` with `getByRole('option')`** in dropdown tests: it also matches
  the hidden native `<select>`'s `<option>` elements and trips strict mode.
- **npm 11 gates install scripts.** `allowScripts` in `package.json` already approves esbuild and
  sharp; re-approve with `npm approve-scripts <pkg>` if a new one appears.
- **Git is 2.24** — no `git init -b`, no interactive flags.
- **Playwright does not walk up to find its config.** `npm` finds `package.json` from any
  subdirectory, so an earlier `cd` into a component folder leaves tests failing with
  `Project(s) "chromium" not found. Available projects: ""`. Prefix the call:
  `Set-Location D:\sources\a11y-component-examples; npx playwright test --project=chromium <slug>`.
- **`textContent = <the same string>` still mutates the DOM.** The old text node is removed and a new
  one inserted, so a `MutationObserver` fires even though the announced value never changed. A test
  that counts mutations therefore cannot tell a working live region from a silent one — assert that
  the region is **observed empty** between two identical messages instead. `live-region`'s spec is the
  precedent.
- **A second intermittent full-suite failure, same shape as the first.** `modal.spec.mjs` → "the close
  button has a real name and clears 44px" read `boundingBox()` a frame after the dialog opened, so it
  measured the button mid-entrance-animation and reported it under 44px. Now `expect.poll`. **Any
  geometry read on something with a motion-gated entrance needs polling**, the same way any state read
  after a dialog closes does.
- **The first intermittent full-suite failure was found and fixed.** It was `modal.spec.mjs` → "the page is
  scroll-locked while it is open, and released after", failing about one run in four. A test bug, not
  a component bug: the `close` event is **queued, not dispatched synchronously**, so reading
  `document.documentElement.overflow` immediately after Escape races the unlock. Now
  `await expect.poll(...)`. **Any assertion about state after a dialog closes needs polling** — this
  is the second bug that queued `close` event has caused.
- **`innerText` includes clipped text.** It only drops `display: none` and `visibility: hidden`, so it
  cannot prove something is off screen. Use geometry (`boundingBox`, a `getBoundingClientRect` diff)
  for "not visible" and `toHaveAccessibleName` for "still announced".
- **`astro preview` does not rebuild, and Playwright reuses it.** `reuseExistingServer` only checks
  that the port answers, so a preview server left running from an earlier step will serve a stale
  build and tests will pass or fail against the wrong bytes. Kill it before a test run.
- **A `role="alert"` must already be in the accessibility tree** before its text is inserted. Not
  `hidden`, not `display: none`, not created on demand — `field` keeps its error element rendered and
  empty for exactly this reason, and pays one flex `gap` for it.
- **Don't make a message container `display: flex`.** Every inline element inside becomes a flex item,
  so a `<code>` or a link in the text breaks onto its own line. Position the marker instead.
- **`display: block` on a `<table>` drops its role** from the accessibility tree in Chrome and
  Safari. To make a wide table scroll, wrap it — never restyle it.
- **Playwright's `toBeDisabled()` treats `aria-disabled="true"` as disabled**, so it cannot be used
  to prove a control is still focusable. Assert on the `disabled` attribute directly.
- **A row's `textContent` includes decoration.** A dropdown option reads `"Acid Arcade✓"`, so anchored
  `hasText` regexes fail; match on the accessible name instead.
- **`test.use({ forcedColors: 'active' })` silently does nothing** in this setup — Playwright 1.62,
  Chromium. It is accepted, and `matchMedia('(forced-colors: active)')` still reports `false` inside
  the page, so every assertion in the block is made against the ordinary stylesheet and **passes for
  the wrong reason**. Use `await page.emulateMedia({ forcedColors: 'active' })` in a `beforeEach`,
  which is the same API the reduced-motion tests already use. `focus-ring`'s spec is the precedent.
  **`test.use({ reducedMotion: 'reduce' })` has the identical problem** — accepted, ignored, and the
  test passes against a page that is still animating. `page.emulateMedia` for both, always.
- **`src/library/tokens/tokens.css` is not loaded by the site.** It is an optional layer and no page
  links it, deliberately: a component has to work from the fallback chain alone. So
  `getPropertyValue('--ac-motion')` in a test on a component page returns `""`, not `1` or `0`, and
  the value that resolved is theme-service's `--motion`. Assert on the *effect* (a computed duration,
  `getAnimations().length`) or read the theme token, never the `--ac-*` name.
- **Headless Chromium paints overlay scrollbars.** `offsetWidth - clientWidth` is `0`, no scrollbar
  is drawn, and a screenshot of an `fx-scroll` region shows nothing at all — so the styling looks
  broken when it is not. A headed launch (`chromium.launch({ headless: false })`) shows the 12px
  gutter and the gradient thumb. `getComputedStyle(el, '::-webkit-scrollbar-thumb')` resolves in both
  modes, so assert scrollbar *colors*, never scrollbar geometry.
- **Chromium 151 makes any scrollable box a tab stop with no `tabindex`.** It gets no role and no
  accessible name, and its focus indicator is the UA default — `rgb(16, 16, 16) auto 1px`, a black
  hairline that is invisible on a dark theme. So a scroll region is reachable and silent by default;
  `tabindex="0"` + `role="region"` + a name is still required (Safari does not do this at all), and
  the ring has to be supplied. `effects`' `[PATCH]` is the one to lift.
- **Forced colors drops gradient `background-image`s and every `box-shadow`** in Chromium, which is
  why `fx-grid`, both `fx-bar-*` and the glow tokens vanish there without anyone writing a rule.
  `background-image` is not in the spec's forced list, so declare `none` yourself rather than relying
  on it — and remember that whatever the decoration was distinguishing is now undistinguished.
- **The header's motion toggle cannot be `.check()`ed.** The real input is `opacity: 0` under
  `.switch__track`, which intercepts the pointer, and Playwright retries for the full timeout. Click
  `.switch__track` the way a person clicks the label, or focus the input and press Space.
- **A host page's own `h1`–`h6` rules cascade into anything you put a class on.** A class beats a bare
  element selector only for the properties it actually declares; everything it stays quiet about still
  comes from the host. `.ac-t-h2` on an `<h4>` inherited the shell's `text-transform: uppercase`, its
  neon `text-shadow` and its `letter-spacing`, while the same class on a `<div>` got none of them — so
  typography's example 2, whose whole argument is that the two are indistinguishable, quietly stopped
  being true. Only visible at 320px, because that is where the two specimens stack and can be compared
  by eye. A utility class that claims to own appearance has to declare the properties a host is likely
  to set, not just the ones it cares about.
- **Screenshot the finished page before ticking the row.** It has caught a real bug twice, and both
  times every test was green. The recipe, because it fails two ways otherwise: a throwaway script that
  imports `{ chromium } from '@playwright/test'` **must sit in the repo root** — from the scratchpad it
  dies with `ERR_MODULE_NOT_FOUND`, since ESM resolves `node_modules` upward from the script's own
  directory — and `npm run preview` has to already be running, started as a background job and stopped
  after. Shoot the component root (`.ac-demo-grid`) at 1280 and 320, and print
  `document.documentElement.scrollWidth - clientWidth` while you are in there. Delete the script from
  the repo root afterwards; `git status` should come back with only the component folder.
- **`[WARN] [glob-loader] Duplicate id "<slug>" found` is a stale content cache, not a real
  duplicate.** It appears on the first build after a scaffolded `docs.md` is filled in, because the
  entry was already indexed in `.astro/`. Nothing is wrong and the page builds; `rm -rf .astro` and
  rebuild if you want to confirm. Do not go looking for a second `docs.md`.
- **Playwright honors `aria-disabled` in its actionability checks.** A click on a control that is only
  *soft* disabled hangs for the full 30s timeout with "element is not enabled" — including a click on
  a `<label>` or a decorative `<span>` inside one, because it resolves to the associated input. That
  is correct behavior and the same reason a screen reader says "unavailable", so do not weaken the
  markup: pass `{ force: true }` and say in a comment that the `preventDefault` in the component is
  what the assertion is actually about. `motion-preferences` and `switch` both need this.
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
