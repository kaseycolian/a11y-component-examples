# The copy and structure pass

A library-wide rewrite of every human-facing string, one component at a time. Started 2026-08-03.

**This file is the tracker.** It survives across sessions. Open it first, take the next unticked row in
[The roster](#the-roster), follow [The procedure](#the-procedure), tick the row, commit.

Everything here is about *writing and structure*. Component behavior does not change. `CLAUDE.md` is still
the contributing contract for code, and `docs/BUILD-STATUS.md` is still the build log.

---

## START HERE

**Phase 0 is done. Components 1–12 are done. Next up is row 13, `fieldset-group`, which is also a
rename → Fieldset.**

Last updated 2026-08-06. This note is part of the `switch` commit. The repo was left green:

```
check:tokens                      34 files clean
check:agents                      42 surfaces match their sources
npm run build                     35 pages
playwright --project=chromium     switch 23 · agent-surfaces 117 · a11y -g switch 40
```

The whole suite was last run in full at row 6: 1205 passed, 10.9 min.

Re-run that last line before you start if you want to be sure nothing drifted. It is the honest
baseline — if something is red before you have touched anything, it is not your change.

Read these three things before touching anything, in this order:

1. **This file**, top to bottom. It is ~250 lines and it is the whole contract.
2. **`button`'s four files** — `src/library/components/button/{meta.json,component.html,docs.md}` and
   `tests/button.spec.mjs`. It is the worked example of every rule below.
3. **The row you are about to do**, in [The roster](#the-roster). The notes on rows 1–6 record what
   actually bit, and they are the reason this file is worth reading rather than skimming.

Then follow [The procedure](#the-procedure) for `fieldset-group`, exactly. It is a **rename**, so also
follow the rename rules: `grep -rn "Fieldset Group" src/ docs/` afterwards, and check whether any of
those references also names an example number.

### What the last session learned, in one place

- **Three shapes exist, not one.** Most components split into *Correct examples* + *Common mistakes*
  (`button`, `icon-button`, `chip-toggle`). One correct example means a singular heading, *Correct
  example* (`loading-button`). No counter-examples at all means **one section only**, with the file
  header saying why (`field`, `text-input`). Never invent a broken example to fill a gap.
- **Renumbering is the expensive part.** It ripples into `[SECTION] example N` markers in the CSS and
  JS, the order of the blocks in those files, the spec's section comments and block order, and any
  *other* component's prose that names an example number. `chip-toggle` is the worked example.
- **A rename is 10–15 files, not one.** `grep -rn "<Old Display Name>" src/ docs/` after every one, and
  look for the name wrapped across two lines of a comment — that is what escaped the first pass twice.
- **The `docs.md` component-specific cap is two sections.** When a component has more, place them
  rather than delete them: `text-input`'s *Read-only is not disabled* became a `###` under States.
  `input-group` had five and needed all three moves — one `###` under Required markup, one under
  States, and two merged under a single new `##` with a `###` each.
- **The spec asserts demo strings exactly, and not only the obvious ones.** `input-group` had three:
  a fake key, a password value and a field label. Grep the spec for every string you rewrite.
- **When the Keyboard table outgrows `contract.keyboard`, grow the contract.** A key whose effect
  starts `native:` costs the spec nothing — agent-surfaces §3 skips it — so <kbd>Enter</kbd> and
  <kbd>Space</kbd> went into `input-group`'s contract and <kbd>Enter</kbd> into `textarea`'s rather
  than being documented off-contract, where nothing would keep the two in step. Watch the Tier 2
  budget when doing it wholesale: nine rows took `native-select` from 0.9 KB to 1.6 KB of 1.8 KB.
- **Check `component.js` for demo vocabulary, not just comments.** `checkbox` announced "2 of 4
  *inputs* selected" from a hardcoded string — the demo's audio inputs, shipped in every copy of the
  component. Step 4 says "change no behavior", and a user-visible string is copy, not behavior.
- **Rewriting demo content can invalidate a test's premise, not just its strings.** `native-select`
  asserted type-ahead by pressing `g` for an option valued `gilman` — but type-ahead matches option
  **text**, and the replacement options had no `g` word. A green suite after a content swap is not
  proof; reread what each assertion is actually claiming.
- **Never let a fake credential look like real hex.** It cost a blocked push and a `filter-branch`.
  See [The demo vocabulary](#the-demo-vocabulary).

---

## Why

Every human-facing surface was written in a compressed, allusive voice that states claims without
explaining them — example titles like "Three is not a name" and "A spinner is silent", summaries built out
of strung-together clauses. Demo content was 90s punk references, which made a reader hold an unrelated
domain in their head while learning an ARIA pattern.

The target: a developer reads any component page and comes away knowing **what the component is, what
markup it requires, what the keyboard has to do, and what breaks**. Low cognitive load, nothing to decode.

WCAG 2.2 AA stays the floor. Keyboard behavior gets stricter treatment, not looser.

---

## The style rules

### Voice

- Direct, dry, definitive. Say what a thing is and what it does.
- No metaphor, no aphorism, no sentence whose subject is a concept.
- Never open with a paradox or a reversal. Open with the component.
- One idea per sentence. Prefer a period to an em dash.
- Name an attribute when the attribute is the point. Do not name three in a lede.
- No apology and no hedging about frameworks. Never write "your framework probably has a better one".

### `meta.json` `summary`

Two or three sentences, ~50 words. It renders as the page lede, the index card, and the `<meta
description>`. Structure: **what it is → what it is for → the one thing that makes it hard.**

```
old: "A filter chip that is a toggle button, not a checkbox — aria-pressed carries the state, and
      a tick carries it where color cannot. Four live failures: the color-only chip, the tick that
      renames its own control, the chip that renames itself on purpose, and a row that swallows
      the tab order."

new: "A filter chip is a button that stays pressed. Use it to switch a filter on and off without
      submitting a form. It is not a checkbox, so aria-pressed carries the state, and the on state
      needs a second cue besides color."
```

### `meta.json` `demoNote`

One or two plain sentences saying what to try on the page. Not an enumeration of every example — the
per-example notes and the section notes carry that.

### Example titles

Name what the example *contains*, not what it argues.

```
old: "1 · The specimen"                          new: "1 · Basic filter chip"
old: "2 · Pressed is not a color"                new: "2 · State shown by color only"
old: "3 · The name has to stay still"            new: "3 · Chip that renames itself"
old: "5 · A row of chips is a row of tab stops"  new: "5 · Row of chips with no roving tabindex"
```

### `docs.md` — the canonical structure

Every component, this order, these headings. Anything that does not fit is cut or folded in.

| # | Heading | Required | Content |
| --- | --- | --- | --- |
| 1 | `## Before you copy` | always | The template below. Two short paragraphs. |
| 2 | `## Required markup` | always | Table `Element \| Attribute \| What it does`, rows in DOM order. |
| 3 | `## Keyboard` | **always** | Table `Key \| What it does`. See below. |
| 4 | `## States` | always | Table `State \| Signaled by \| Never signaled by`. |
| 5 | `## Screen reader behavior` | always | What was actually observed. Untested → say so, point at `at-support.md`. |
| 6 | *component-specific* | ≤ 2 sections | Plain descriptive `##` titles. Only where the pattern needs it. |
| 7 | `## API` | JS only | The factory signature and every method. Keep the idempotency line. |
| 8 | `## Using it in a framework` | JS only | The existing React snippet, unchanged. |
| 9 | `## Common mistakes` | always | Bulleted, bold lead-in, one sentence each. |
| 10 | `## Related` | where it applies | Links only. |

Headings that are **deleted** wherever they appear: `## One sentence`, `## The whole thing`,
`## The contract` (renamed to `## Required markup`), `## What to watch for` and `## Watch for` (both
renamed to `## Common mistakes`). Fold their bodies into the sections above.

The ~140 one-off argument headings collapse too. Most belong under `## Required markup` as a `###`, or in
`## Common mistakes`. Row 6 exists for the few that are genuinely load-bearing — modal's
`## What showModal() gives you`, tooltip's SC 1.4.13 breakdown. Cap is two per component.

### `## Before you copy` — the template

```markdown
## Before you copy

These files are a working reference, not a package. Move the markup into your own templates and
the state into your own code. What has to survive that move is the ARIA below, the keyboard
behavior, and where focus goes — those are the parts that make the component accessible, and the
parts that are usually dropped.

Every example on this page is numbered and separately copyable. The CSS and JS sections name which
examples need them.
```

Drop "and JS" from the second paragraph for CSS-only components.

### Keyboard — the strictest section

- **It always exists**, even when the answer is "the native element already does this". Write the table
  anyway. A reader needs to see the keys accounted for, not omitted.
- One table shape everywhere: `| Key | What it does |`. The old `Key | Action`, `Key | Result` and
  `Key | Where | Does` variants are gone. Where behavior differs by state, add a third column named for
  the state (`| Key | Closed | Open |`) — never a second table.
- `<kbd>` for every key. Spell keys exactly as `contract.keyboard` does.
- List **every** key in `contract.keyboard`, in this order: <kbd>Tab</kbd> / <kbd>Shift</kbd>+<kbd>Tab</kbd>,
  <kbd>Enter</kbd>, <kbd>Space</kbd>, arrows, <kbd>Home</kbd>/<kbd>End</kbd>, <kbd>Esc</kbd>, typing.
- Finish with **"Keys deliberately not bound"** where one applies, and say why. Disclosure's missing
  <kbd>Esc</kbd> handler is the model, and that reasoning must not be lost.

Three things enforce this, and all three have to be satisfied in the same commit:

| Check | What it asserts |
| --- | --- |
| agent-surfaces §3 | every `contract.keyboard` key string appears **literally** in `tests/<slug>.spec.mjs`, unless its effect starts `native:` |
| agent-surfaces §13 | every key `component.js` branches on is in `contract.keyboard` |
| *you* | the `docs.md` table and `contract.keyboard` agree — nothing automated checks this |

### Demo markup — two sections

Correct examples first, mistakes second, inside `component.html`:

```html
<div class="ac-demo-section">
  <h3 class="ac-demo-section__title">Correct examples</h3>
  <p class="ac-demo-section__note">One sentence on what this group shows.</p>
  <div class="ac-demo-grid"> … </div>
</div>

<div class="ac-demo-section ac-demo-section--mistakes">
  <h3 class="ac-demo-section__title">Common mistakes</h3>
  <p class="ac-demo-section__note">One sentence. These are live and wrong on purpose.</p>
  <div class="ac-demo-grid"> … </div>
</div>
```

- Per-example titles are `<h4 class="ac-demo__title">`. The class does not change; only the tag does.
  The page is `h1` → `h2 Live example` → `h3` section → `h4` example, and axe's `heading-order` runs on it.
- Examples are numbered `1..N` **continuously across both sections**, correct first, so the `EXAMPLE 3 ·`
  banners in `component.css` and `component.js` still line up.
- An example that ends with the fix but exists to show the mistake belongs in **Common mistakes**.
  icon-button's example 3 — three broken buttons then the fixed one — is that case.
- Omit the second section only when the component genuinely has no counter-example. `field` is the
  worked example: all six of its demos are correct markup, so it ships one section, its file header
  says why, and the failures are written up in `docs.md` instead. Do **not** invent a broken example
  to fill the gap.
- When there is only one correct example, the heading is singular — **Correct example**. `loading-button`
  is that case.

`ac-demo-section*` is demo scaffolding like the rest of `ac-demo-*`: it lives in `src/site/styles/site.css`
and is never copied.

---

## The demo vocabulary

One shared domain so a reader never context-switches between components.

| Kind | Use |
| --- | --- |
| People | `Jordan Lee`, `Sam Rivera`, `Alex Chen`, `Priya Patel` |
| Emails | `jordan.lee@example.com` — always `@example.com` |
| Records | `Order 462`, `Invoice 99`, `Project 462` |
| Actions | `Save changes`, `Delete project`, `Send invite`, `Export report` |
| Fields | `Work email`, `Full name`, `Company`, `Country`, `Notes` |
| Statuses | `Shipped`, `Pending`, `Failed`, `Draft`, `Paid` |
| Tabs and sections | `Overview`, `Activity`, `Billing`, `Settings` |
| Table columns | `Order`, `Customer`, `Total`, `Status` |
| Arbitrary numbers | `462` and `99` |
| Fake keys | `sk_test_` + an obviously repeating body, e.g. `sk_test_462abcdefg99abcdefg462abcdefg` |
| Fake ids | UUID v4 shape, obviously fake: `00000000-0000-4000-8000-000000000462` |
| URLs | `https://app.example.com/…` |

Fake credentials keep a **valid shape** — right prefix, roughly the right length — so the example still
teaches the format. The body has to read as obviously fabricated at a glance: repeat `462`, `99` and
`abcdefg` rather than typing plausible hex.

**This is not a style rule.** `sk_test_` followed by 24 hex characters is exactly what GitHub's push
protection matches as a Stripe test key, and it blocked a push over a value that was invented on the
spot. Push protection scans **every commit in the push**, not the tip, so fixing the working tree does
not clear it — the four commits carrying it had to be rewritten with `git filter-branch` before the
push would go through. Get the shape right the first time.

**Sweep these out:** `setlist`, `merch`, `zine`, `distro`, `matinee`, `Salad Days`, `Ruby Soho`, `Gilman`,
`Bakesale`, `Cat's Cradle`, `Cold Water Flat`, `Ten Second Anthem`, `Basement Tapes`, `Storm Windows`,
`Cassette Only`, `Rink Classic`, `Synthwave Sunset`, `Acid Arcade`, `the VFW hall issue`,
`the Berkeley show`, `Doors at eight`, `462 rpm`.

`dropdown` is already product-flavored (`Deploy target`, `Production`, `app.example.com`). It is the model.

**How much is left, per component.** Run this to see where the punk text is concentrated, so a heavy
row can be budgeted as more than one sitting:

```sh
grep -riEc "setlist|merch|zine|distro|matinee|salad days|ruby soho|gilman|bakesale|olympia" \
  src/library/components/*/component.html | grep -v ":0"
```

As of 2026-08-06 the heaviest are `tabs` (24 hits), `data-table` (16), `modal` (13), `jump-nav` (11),
`fieldset-group` and `prose-surface` (9 each), `native-select` (8) and `radio-group` (7). Everything
else is five or fewer. The finished rows are gone from this list.

---

## Naming decisions

Settled. Do not re-litigate. **Display name only** — `meta.json` `name`. Slugs, folders, URLs and spec
paths do not move.

| slug | old name | new name | done |
| --- | --- | --- | --- |
| `chip-toggle` | Chip Toggle | **Filter Chip** | [x] |
| `field` | Field | **Form Field** | [x] |
| `dropdown` | Dropdown / Listbox | **Custom Select** | [ ] |
| `effects` | Effects | **Background Effects** | [ ] |
| `fieldset-group` | Fieldset Group | **Fieldset** | [ ] |
| `focus-ring` | Focus Ring | **Focus Indicator** | [ ] |
| `jump-nav` | Jump Nav | **In-Page Navigation** | [ ] |
| `motion-preferences` | Motion Preferences | **Reduced Motion** | [ ] |
| `notice` | Notice | **Alert** | [ ] |
| `prose-surface` | Prose Surface | **Rich Text Content** | [ ] |
| `result-panel` | Result Panel | **Copyable Result** | [ ] |
| `status-text` | Status Text | **Status Label** | [ ] |

A rename happens **in that component's own pass**, not ahead of it. Two are already applied, and the
prose in every other component was updated at the same time.

Unchanged, because they are already the standard term: badge, button, checkbox, data-table, disclosure,
drawer, icon-button, input-group, live-region, loading-button, modal, native-select, radio-group,
skip-link, switch, tabs, text-input, textarea, tooltip, typography, visually-hidden.

`Custom Select` pairs with `Native Select` — the two pages are about that choice. `Alert` matches
`role="alert"`, which the component is built on.

**Cross-links.** `docs.md` files link each other as `[Notice](../notice/)`. The path is the slug and does
not move; the link *text* follows the rename. **Source comments name components too** — `chip-toggle`
was mentioned by eleven other components, mostly in `component.css` and `component.js` prose. After
every rename:

```sh
grep -rn "<Old Display Name>" src/ docs/
```

Two of those eleven also named an example *number*, which the renumber had moved. A prose reference to
"X's example 5" has to be re-checked against X's new numbering, not just renamed.

Group names, in `src/site/lib/groups.mjs`:

| id | old name | new name |
| --- | --- | --- |
| `foundations` | Foundations | **General Concepts** |

The `id` stays `foundations`. It is in the `/components/#group-foundations` anchors and in
`agents/index.md`.

---

## The procedure

**One component per pass. Do not batch.**

```
COMPONENT: <slug>

 1. Read src/library/components/<slug>/{meta.json, component.html, docs.md}
    and tests/<slug>.spec.mjs. Read this component's entry in
    docs/component-specs.md if it has one.

 2. meta.json
    - name     -> the naming table above (or unchanged)
    - summary  -> rewrite per the style rules
    - demoNote -> one or two sentences
    - contract.useWhen -> one line, agrees with the new summary
    - contract.keyboard -> complete and correct. This is the source of truth.

 3. component.html
    - Split the examples into the two ac-demo-section blocks, correct first.
    - Demote every <h3 class="ac-demo__title"> to <h4>. Class unchanged.
    - Renumber examples 1..N continuous across both sections.
    - Rewrite every example title.
    - Replace all demo text with the shared vocabulary.
    - Rewrite the file-header banner: WHAT TO COPY, REQUIRED MARKUP, the
      scaffolding warning. "THE CONTRACT" is renamed to "REQUIRED MARKUP" so the
      banner and docs.md use one term.
    - Rewrite every .ac-demo__note / .ac-demo__legend / verdict / readout label:
      one or two plain sentences naming what the example shows.

 4. component.css / component.js
    - If step 3 renumbered anything, update every section header naming an
      example: [CORE - all examples], [3, 5, 6], [OPTIONAL - ...].
    - Update the copy map at the top of each file.
    - Update source comments quoting demo text or old example titles.
    - Change no behavior.

 5. docs.md -> the canonical heading order, exactly.
    - Verify the Keyboard table against contract.keyboard, key by key.
    - Verify the Required markup table against contract.aria and the real markup.
    - Update cross-link text for any renamed component.

 6. Run, in order:
       npm run check:tokens
       npm run agents
       npm run check:agents
       npm run build
       npx playwright test --project=chromium <slug>
       npx playwright test --project=chromium agent-surfaces
       npx playwright test --project=chromium a11y -g "<slug>"

 7. Open the page. Tab through both sections. Check the two headings read as
    groups and the numbering is continuous.

 8. Commit meta.json + component.* + docs.md + the regenerated agents/,
    AGENTS.md and .claude/skills/ TOGETHER. Tick the row below.
```

### What will bite

- **Changing `summary` fires a receipt.** `agents/index.json` stores `_summaryRev`, a hash of the summary.
  `check:agents` exits 1 with `The summary changed on: <slug> … Reread contract.useWhen.` That is by
  design. Reread `useWhen`, then `npm run agents`. Step 6 has the order right.
- **Tier 2 budget is 1800 bytes per component, and `dropdown` has 25 bytes of headroom.** A longer
  `useWhen` or an extra `keyboard` row pushes it over and the generator exits 1 naming
  `dropdown/meta.json "contract"`. Cut elsewhere in the contract. Do not raise the budget.
- **`agents/index.md` has ~313 bytes of headroom** across all 33 `useWhen` strings. Keep them one line.
- **Specs assert on visible demo text.** Several components print verdicts and readouts that
  `tests/<slug>.spec.mjs` matches. Step 6 catches it. Update the spec; never loosen an assertion to make
  it pass.
- **`data-ac-demo-broken` is asserted in both directions.** Moving a broken example into the new section
  must not change its markup. A claimed violation that stops firing fails the gate with
  `claimed as broken but axe found nothing`.
- **axe runs with `best-practice`, which includes `heading-order`.** `h1` → `h2` → `h3` → `h4`. Skipping a
  level fails the gate.
- **agent-surfaces §12 sweeps ARIA outside broken examples only.** Adding `data-ac-demo-broken` to
  something that did not have it removes its ARIA from the sweep and can trip the vacuity guard.
- **`disclosure` is a full retrofit, not a pass.** No `ac-demo` scaffolding at all, no `demoNote`, no
  numbered examples, no `## Before you copy`. Build the examples from nothing. Budget it as three or four
  ordinary components.
- **Never round-trip a repo file through PowerShell.** `Get-Content -Raw` produces mojibake and
  `build-agent-surfaces.mjs` throws on it. Use the file tools.
- **Node is not on the inherited PATH:** `$env:Path = "C:\nvm4w\nodejs;$env:Path"`.
- **Playwright's webkit browser is not installed.** Always pass `--project=chromium`.

---

## The roster

33 components. Order is a default, not a constraint — `button` is first because it is the most-referenced
component and becomes the reference every later one copies.

**Read `button`'s four files before starting any other component.** It is the worked example of every
rule above: the two demo sections, the renumbering and how it ripples into the CSS and JS section
headers, the `Required markup` table, the mandatory `Keyboard` table with its "Keys deliberately not
bound" note, and a `summary` in the new voice.

| # | slug | done | notes |
| --- | --- | --- | --- |
| 1 | `button` | [x] | **The reference. Copy its shape.** Examples renumbered: old 3 (unavailable) became 2 and moved into *Correct examples*; old 2 (no `type`) became 3. That rippled into the `[DISABLED]`/`[SIZE]` order in the CSS and the `[LOCK]`/`[FORM]` order in the JS — both files now read in example order, which is the rule. `data-ac-button` moved off the grid onto a new wrapper `<div>`, because the grid is now two grids. Spec renamed 12 demo strings and was reordered to match. |
| 2 | `icon-button` | [x] | No renumbering — 1 and 2 were already correct, 3 to 5 already the mistakes. `data-ac-icon-button` moved onto a wrapper `<div>`. Labels: Play / Add task / Search projects / Bookmark project / Share project / View options / Close panel, `Add teammate` ×3, `Delete project`, `Archive project` vs `Send this project to a teammate`, Mute notifications / Next page / Stop export. |
| 3 | `loading-button` | [x] | No renumbering. `data-ac-loading-button` moved onto a wrapper `<div>`. Only one correct example, so its section heading is singular: **Correct example**. `Save set list` → `Save changes`, `Set list saved.` → `Changes saved.`, hint → `Project 462 · 12 tasks`. |
| 4 | `chip-toggle` | [x] | **Renamed → Filter Chip**, and the first rename done, so it is the worked example: 11 other components mentioned it in prose and all were updated, including two that named an example number. Heavy renumber — old 4 and 5 were choice demos, not failures, so they moved into *Correct examples*: 1→1, 4→2, 5→3, 2→4, 3→5. That reordered `[ACCENTS]`/`[CHECK]` in the CSS and all four demo blocks in the JS, plus the spec's five sections. |
| 5 | `field` | [x] | **Renamed → Form Field.** **The first single-section page:** all six examples are correct markup, so there is no *Common mistakes* block — the file header says so, and the failures live in `docs.md` instead. No renumber, no wrapper `<div>` (auto-init already scopes to each `[data-ac-field]`). The home page `PEEK_FILES` excerpt mirrors this component and was updated in step. 14 other components referenced "Field" in prose. |
| 6 | `text-input` | [x] | Single section, like `field` — six decisions, no verdicts. CSS-only, so no wrapper `<div>` and no renumber. **First component to take the new fake-key shape**: `sk_test_462abcdefg99abcdefg462abcdefg`. `docs.md` had four component-specific sections against a cap of two: *Read-only is not disabled* became a `###` under States, and *Placeholders* collapsed into one Common mistakes bullet. |
| 7 | `input-group` | [x] | Single section — all five examples are correct markup. No renumber. Three demo strings were asserted **exactly** by the spec and had to move with it: the fake key, the password value (`Password462`) and the search label (`Search orders`). `contract.keyboard` gained <kbd>Enter</kbd> and <kbd>Space</kbd>, both `native:`, so the mandatory Keyboard table could account for form submit and button activation. `docs.md` had five component-specific sections against a cap of two: affixes became a `###` under Required markup, invalid a `###` under States, and reveal + copy were folded into one *The two scripted addons* section with a `###` each. |
| 8 | `textarea` | [x] | Single section, no renumber. `contract.keyboard` gained <kbd>Enter</kbd> (`native:`) so the Keyboard table could say the thing that separates a textarea from an input — it inserts a line break rather than submitting. Five component-specific sections against a cap of two: *resize* became a `###` under Required markup, *Read-only is not disabled* a `###` under States (as in `text-input`), *No maxlength* a `###` inside the counter section. Spec: two demo strings and one section comment. |
| 9 | `native-select` | [x] | CSS-only, single section, no renumber. The whole demo domain was a band tour, so **every id changed** (`ac-ns-venue` → `ac-ns-country`, `-tour` → `-assignee`, `-slot` → `-window`, `-label` → `-org`, `-merch` → `-speed`, `-riders` → `-notify`) and the spec moved with it: 12 selectors, 6 names, 4 option values, 2 regexes. **Type-ahead asserts on option *text*, not value** — the old test pressed `g` for `gilman`; the new options made that a no-match, so it presses `u` for `United Kingdom` and expects `gb`. `contract.keyboard` went from one vague row to nine `native:` rows, including the four `multiple`-only modifiers, which took the Tier 2 surface from 0.9 KB to **1.6 KB against the 1.8 KB budget** — the second-tightest after `dropdown`. |
| 10 | `radio-group` | [x] | CSS-only, single section, no renumber. Every id and every `name` changed with the content (refund method, invoice delivery, plan, pickup location + billing cycle, send updates), so the spec took 24 id rewrites plus 4 assertions on demo text. `contract.keyboard` went to four `native:` rows — <kbd>Space</kbd> and the left/right arrows were real native behavior the old two-row contract never named. `docs.md` had ten `##` sections: four became `###` under Required markup, two under States, and *Targets* collapsed into a table row plus a Common mistakes bullet. |
| 11 | `checkbox` | [x] | Single section, no renumber. **The one row so far where demo vocabulary had leaked into library code**: `component.js` announced "2 of 4 **inputs** selected" — audio inputs, from the stage-plot demo — in a string every copy of the component ships. It is now "2 of 4 selected", and the spec's exact-match assertion moved with it. New content: columns to export, email notifications, refund terms. `docs.md`'s radio-group comparison table became a `###` under Keyboard, *Required* a `###` under Required markup, *Select all* a `###` under Indeterminate. |
| 12 | `switch` | [x] | Single section, 4 examples, no renumber. Content: workspace defaults, order alerts, public status page, audit logging + beta features. The `docs.md` `Key \| Action` table was one of the three old shapes being eliminated. Six `##` sections placed: *Two cues* and *Unavailable, two ways* became `###` under States, *Labels* a `###` under Required markup, *Saying it out loud* a `###` under *A switch is a promise*; the two that stayed `##` are that one and *Checkbox or role=switch*. `contract.keyboard` gained the `native:` prefix on all three keys and its <kbd>Enter</kbd> effect was corrected — it said "submits the form", the docs said "nothing"; both now say it submits only if there is a form, and never toggles. |
| 13 | `fieldset-group` | [ ] | **NEXT.** rename → Fieldset. |
| 14 | `skip-link` | [ ] | CSS-only. |
| 15 | `visually-hidden` | [ ] | 4 broken markers. |
| 16 | `focus-ring` | [ ] | rename → Focus Indicator. 2 broken markers. |
| 17 | `live-region` | [ ] | |
| 18 | `typography` | [ ] | 2 broken markers; one is a contrast ratio that must stay broken. |
| 19 | `motion-preferences` | [ ] | rename → Reduced Motion. |
| 20 | `effects` | [ ] | rename → Background Effects. |
| 21 | `disclosure` | [ ] | **full retrofit** — no demo scaffolding at all. |
| 22 | `dropdown` | [ ] | rename → Custom Select. **25 bytes of Tier 2 headroom.** 6 examples, 433 lines. |
| 23 | `modal` | [ ] | 4 examples. |
| 24 | `drawer` | [ ] | 4 examples. |
| 25 | `tooltip` | [ ] | |
| 26 | `tabs` | [ ] | |
| 27 | `jump-nav` | [ ] | rename → In-Page Navigation. |
| 28 | `notice` | [ ] | rename → Alert. |
| 29 | `status-text` | [ ] | rename → Status Label. |
| 30 | `badge` | [ ] | |
| 31 | `result-panel` | [ ] | rename → Copyable Result. |
| 32 | `data-table` | [ ] | heavy punk content. CSS-only. |
| 33 | `prose-surface` | [ ] | rename → Rich Text Content. heavy punk content. |

### Phase 0 — the contract and the tracker

Landed before component 1, so a clean session cannot revert to the old voice.

| | file | what |
| --- | --- | --- |
| [x] | `docs/rewrite-pass.md` | this file |
| [x] | `CLAUDE.md` | `## Writing style` and `## Copyability` rewritten; pointer added |
| [x] | `docs/authoring-a-component.md` | `docs.md` house style aligned |
| [x] | `scripts/new-component.mjs` | HTML and docs templates emit the new shapes |
| [x] | `src/site/styles/site.css` | `.ac-demo-section*` scaffolding |
| [x] | `src/site/lib/groups.mjs` | General Concepts + all 8 summaries |
| [x] | `docs/agents/conventions.src.md` | the scaffolding item names the two section headings |

Verified: `check:tokens` 34 files clean · `check:agents` 42 surfaces match · `build` 35 pages ·
`playwright --project=chromium site-header agent-surfaces` 140 passed.

### Phase 3 — the site, after all 33

**Off limits: the brand name, the tagline, `SiteHeader.astro`, `SiteFooter.astro`.** `hero__copy` may gain
content, but nothing currently in it is removed or edited.

| | file | what |
| --- | --- | --- |
| [ ] | `src/site/pages/index.astro` | the four `promises`; the `PEEK_FILES` excerpt strings, which must match `field/component.html`; the two `<h2>`s. **Not** `hero__copy`. |
| [ ] | `src/site/pages/components/index.astro` | the `<p class="lede">` under `<h1>All Components</h1>` |
| [ ] | `src/site/pages/components/[slug].astro` | `<h2>Live example</h2>` |
| [ ] | `src/site/components/CodePanel.astro` | review only — its strings are already direct |
| [ ] | `docs/agents/*.src.md` | review only. Byte-capped: `llms.txt` has ~65 bytes of headroom, `AGENTS.md` ~124. |

---

## Renaming a slug later

Display names are settled first, deliberately. When a slug is ready to move, these are the touch points:

1. `src/library/components/<old>/` → `<new>/`, and `tests/<old>.spec.mjs` → `<new>.spec.mjs`
2. `meta.json` `slug`
3. every `contract.seeAlso` naming the old slug — agent-surfaces §1 fails otherwise
4. every `[Name](../<old>/)` cross-link in every `docs.md`
5. class prefixes if they encode the slug (`.ac-notice` → `.ac-alert`), which also means `contract.root`,
   `component.css`, `component.html`, `component.js`, the spec, and agent-surfaces §12's scope
6. `docs/agents/pitfalls.src.md` — it names slugs in backticks and agent-surfaces §8 resolves every one
7. `docs/BUILD-STATUS.md` roster rows, and the `docs/component-specs.md` entry
8. `npm run agents` — `agents/components/<old>.md` is deleted and `<new>.md` written
9. a redirect from the old URL, or accept the break

Steps 5 and 6 fail late. One slug per commit.

---

## Final verification

```sh
npm run verify        # check:tokens -> check:agents -> build -> test
```

`npm run verify` currently fails at the test step because Playwright's webkit browser is not installed.
Run that step as `npx playwright test --project=chromium` until it is.

Then sweep by hand:

```sh
grep -riE "setlist|merch|zine|distro|matinee|salad days|ruby soho|gilman|bakesale" src/
grep -rn "## The contract\|## One sentence\|## What to watch for\|## Watch for" src/library/
grep -rn "h3 class=\"ac-demo__title\"" src/library/
```

All three return nothing. Every `docs.md` has exactly one `## Keyboard` and one `## Required markup`.
