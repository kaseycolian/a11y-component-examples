# Build status

**Resume point.** `CLAUDE.md` (auto-loaded) has the conventions. This file has progress and the
ordered next steps. `component-specs.md` has the pre-decided ARIA contract for every remaining
component — read the one entry you need, not the whole file.

**Keep this file current.** Tick the roster row as each component lands, or the next session
re-does work.

Last updated: 2026-07-27

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

**Reference implementation: `field`.** It is the only component that follows the current
copyability and writing-style conventions in `CLAUDE.md` — numbered example sections across all three
files, a copy map in each header, the framework caveat in `docs.md`. Copy its shape.

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
  Chromium is 45/45. Run `npx playwright install firefox webkit` to get a green `verify`.

---

## Component roster — 11 / 34

### foundations
- [ ] `skip-link`
- [ ] `visually-hidden`
- [ ] `focus-ring`
- [ ] `live-region`
- [ ] `typography`
- [ ] `motion-preferences`
- [ ] `effects`

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
- [ ] `fieldset-group`

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
- [ ] `tooltip`

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
