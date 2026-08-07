# The copy and structure pass

A library-wide rewrite of every human-facing string, one component at a time. Started 2026-08-03.

**This file is the tracker.** It survives across sessions. Open it first, take the next unticked row in
[The roster](#the-roster), follow [The procedure](#the-procedure), tick the row, commit.

Everything here is about *writing and structure*. Component behavior does not change. `CLAUDE.md` is still
the contributing contract for code, and `docs/BUILD-STATUS.md` is still the build log.

---

## START HERE

**Phase 0 is done. Components 1–29 are done. Next up is row 30, `badge`.**

Last updated 2026-08-07, after row 29. The repo was left green:

```
check:tokens                      34 files clean
check:agents                      42 surfaces match their sources
npm run build                     35 pages
npx playwright test --project=chromium status-text                22 passed
npx playwright test --project=chromium agent-surfaces            117 passed
npx playwright test --project=chromium a11y -g "status-text|badge|result-panel|notice|live-region"
                                                                 195 passed
```

The full suite was re-run at row 29: **1220 passed**, exit 0 — unchanged since row 21, because rows
22 to 29 added no tests. It is the honest baseline: if something is red before you have touched
anything, it is not your change.

**A row that touches `src/site/` makes the whole suite the check, not the slug.** Row 22 changed
`site.css` and needed it; rows 23 to 29 touched only their own folders and did not.

**A full run can flake, so re-run before you conclude anything.** One at row 19 reported *4 failed,
1202 passed*; the identical tree at row 20 came back 1206/1206. Nothing was fixed in between. Four
failures in a 1206-test suite that touches themes, forced colors and animation timing is a flake
signature, not a regression — confirm with a second run before you go hunting. And **pipe the run to
a file you keep**: the row-19 log was truncated to its last seven lines, which cost the failing names
and made the question unanswerable.

Read these three things before touching anything, in this order:

1. **This file**, top to bottom. It is the whole contract.
2. **`button`'s four files** — `src/library/components/button/{meta.json,component.html,docs.md,tests/button.spec.mjs}`.
   It is the worked example of every rule below. **A spec lives inside its component's folder**, not in
   the repo-root `tests/` — that one holds only the shared gate and the site-shell specs, and looking
   for `tests/<slug>.spec.mjs` there finds nothing.
3. **The row you are about to do**, in [The roster](#the-roster). Every finished row records what
   actually bit, and that is the reason this file is worth reading rather than skimming.

Then follow [The procedure](#the-procedure) for `badge`, exactly.

**Where the pass stands.** 29 of 33 components done, in roster order — there is no reordering, so the
next unticked row is always the next job. Ten of the twelve renames are applied — `chip-toggle`,
`dropdown`, `effects`, `field`, `fieldset-group`, `focus-ring`, `jump-nav`, `motion-preferences`,
`notice`, `status-text`. The other two happen in
their own rows, and [Naming decisions](#naming-decisions) is the ledger. Phase 3 (the site's own copy)
is untouched and stays that way until all 33 are done.

`docs/BUILD-STATUS.md` is **not** the active work — all 33 components are built, and its "START HERE"
was written mid-build. It is still the place for the build history and **Gotchas already solved**.
This file is the one that says what to do next.

### What the finished rows learned, in one place

Roughly in the order they were learned, each naming the row that taught it. Read it once before
starting; every one of these cost a debugging detour the first time.

- **Three shapes exist, not one.** Most components split into *Correct examples* + *Common mistakes*
  (`button`, `icon-button`, `chip-toggle`). One correct example means a singular heading, *Correct
  example* (`loading-button`). No counter-examples at all means **one section only**, with the file
  header saying why (`field`, `text-input`). Never invent a broken example to fill a gap.
- **Check whether the split costs a renumber before assuming it does.** `typography` is a specimen
  sheet plus four failure demos, so example 1 is the whole *Correct example* section and 2–5 are all
  mistakes — correct-first order was already the file's order, nothing moved, and not one section
  marker in the CSS changed. Read the examples in order and find the boundary before planning the
  work; a component whose correct examples already come first is a one-sitting row.
- **When the split is genuinely ambiguous, read `contract.failureModes`.** `effects`' example 5 reads
  as a correct-behavior explainer — its own comment said *Neither is a bug* — and moving it into
  *Correct examples* would have forced a renumber through the CSS markers and the spec. The contract
  already listed *two motion gates with different reach* as a failure mode, which settles it: the
  component's own contract says what the example is. The same question on example 4 is settled harder
  still — it carries `data-ac-demo-broken`, so the gate asserts it is failing, and an example the gate
  asserts as broken is never a correct example.
- **Renumbering is the expensive part.** It ripples into `[SECTION] example N` markers in the CSS and
  JS, the order of the blocks in those files, the spec's section comments and block order, and any
  *other* component's prose that names an example number. `chip-toggle` is the worked example.
- **A rename is 10–15 files, not one, and most references are not links.** `grep -rn "<Old Display
  Name>" src/ docs/` after every one — `focus-ring` had five references and only one was a `docs.md`
  link; the rest were source comments in three other components and in `tokens.css`. **Use a multiline
  grep, not a line-based one.** `motion-preferences` had a reference wrapped across two lines of prose
  in `src/site/theme/THEME-SERVICE.md`, and only `Grep` with `multiline: true` on `Motion\s+Preferences`
  found it. That file is vendored but safe to edit — its "Deliberate deviations", "Motion behavior" and
  "History" sections are this repo's own record of the apply, not upstream boilerplate.
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
- **Demoting the demo titles to `h4` can strand a heading the component itself ships.** Three rows
  have hit it — `fieldset-group`, `typography` and `motion-preferences` — and each became a sibling of
  its own example title rather than a child. All three are `h5` now. axe's `heading-order` does not
  catch it, because nothing is skipped, and `motion-preferences` shows the worse case: no spec
  asserted the tag, so nothing failed and nothing would have. **Grep the component for `<h3` and `<h4`
  before demoting** — assume every row has one until you have looked.
- **Splitting into two sections makes `.ac-demo-grid` match twice.** A spec that calls `.evaluate()`
  on a locator for it fails Playwright's strict mode — `visually-hidden` had exactly one such call,
  `live-region` had four, and chained `.locator(…)` uses were unaffected, so the failure is easy to
  miss when reading. Grep the spec for `ac-demo-grid` before splitting a page. Most of them do not
  need the grid element at all — three of `live-region`'s four already used `document.querySelector`
  inside the callback and became a plain `page.evaluate`. **Grep for `.nth(` too.** A positional pick
  is resolved across both grids after the split, so it still passes and now means something the reader
  cannot see: `effects` had two `.fx-grid:not(.ac-fx-broken-grid)').nth(1)` selections that happened
  to stay correct. Re-anchor them on something in the markup — `.ac-fx-pair .fx-grid:not(…)` — the way
  `typography`'s heading-list test was re-anchored on `[data-ac-t-outline]`.
- **An example whose title needs an "and" is two examples.** `live-region`'s old 5 was *Repeats, and
  `role="log"`* — a correct pattern and a live failure in one block, which the two-section split has
  nowhere to put. Splitting it gave the log a home in *Correct examples* and the Copy pair a home in
  *Common mistakes*, and cost almost nothing: the CSS, the JS and the spec already had them in
  separate blocks. Check for this before renumbering, not after.
- **A JS component can be missing `## API` and `## Using it in a framework` entirely.** `live-region`
  was, because its API had been written up as an argument (*An announcer, for messages with no
  element*) rather than as a signature. Both headings are mandatory for a component with a
  `component.js`, so a "restructure" is sometimes an addition. Check the canonical list against the
  file, rather than only placing what is there.
- **A broken example does not always carry `data-ac-demo-broken`.** `skip-link`'s two failures are
  invisible to axe — an unfocusable link and a target that never takes focus are not violations — so
  the marker would be a lie the gate then asserts. Move the example into *Common mistakes* and leave
  its markup alone. The marker is for failures the gate can actually see.
- **Check `component.js` and class names for demo vocabulary, not just comments.** `checkbox`
  announced "2 of 4 *inputs* selected" from a hardcoded string — the demo's audio inputs, shipped in
  every copy of the component. Step 4 says "change no behavior", and a user-visible string is copy,
  not behavior. `skip-link`'s `.ac-skip-lineup` and `focus-ring`'s `.ac-fr-track` were the same leak
  in a class name.
- **Rewriting demo content can invalidate a test's premise, not just its strings.** `native-select`
  asserted type-ahead by pressing `g` for an option valued `gilman` — but type-ahead matches option
  **text**, and the replacement options had no `g` word. A green suite after a content swap is not
  proof; reread what each assertion is actually claiming.
- **Never let a fake credential look like real hex.** It cost a blocked push and a `filter-branch`.
  See [The demo vocabulary](#the-demo-vocabulary).
- **A mistake the component's own factory would repair needs page wiring, not the factory.**
  `disclosure`'s four counter-examples are all things `createDisclosure` fixes on sight — it writes
  `aria-expanded` onto the trigger, writes `aria-controls` from the panel's real id, and uses the
  `hidden` attribute — so three of the four would have silently become correct examples. They are
  wired by a `createDisclosurePage` factory in the same file instead. Check 14 exempts the `Page`
  suffix, which is what makes this legal rather than an undocumented public API.
- **Rewriting the example titles can change what the page is about, and then `useWhen` has to move
  too.** `modal`'s four titles named their content — *The baseline*, *A form in a modal*, *Long
  content* — when the thing that actually separates them is where focus lands, which is the one job
  `showModal()` leaves to the author. Retitling them made the page argue something the old `summary`
  did not, and the old `contract.useWhen` then agreed with neither. **Reread `useWhen` against the new
  titles, not only against the new summary** — `check:agents` fires its receipt on the summary alone.
- **Rewriting the example titles is a separate pass from rewriting the prose, and it is easy to skip.**
  `status-text` reached its screenshot with *A tick is not a status* and *One region, not one per row*
  still on two examples — both arguments, both fine as `docs.md` headings, neither a name for what the
  example contains. **Read the rendered `h4` list on its own** at the end of a row; the titles are the
  one string the eye slides over while checking everything around them.
- **A display name that is also an ordinary word cannot be renamed by a blanket replace.** `Notice`
  is a verb, and `motion-preferences/component.css` opens a comment with *"Notice what is missing"* —
  a global swap would have written *"Alert what is missing"* into a file the row never touched.
  Rename from an explicit per-file list of exact strings, then `grep -rnE "\bNotice\b"` and expect the
  survivors to be exactly the ones you skipped. The same care is due for `Field`, `Effects` and
  `Badge`, which is why they are not in the sweep below either.
- **A rename can collide with an ARIA value.** `Alert` is also `role="alert"`, so prose that read
  *"an alert present at page load"* now has to say *"an alert **role** present at page load"* to stay
  unambiguous. Read the renamed prose for sentences where the new name and a spec term are the same
  token.
- **An A→B→C id rotation needs a placeholder, and the placeholder gets caught by the next rule.**
  `jump-nav` renamed `-shipping`→`-items` and `-payment`→`-shipping` in one pass; the temporary
  `jn3a-shipping-TMP` was itself matched by the `-shipping` rule and came out `jn3a-items-TMP`, so the
  restore step found nothing. Grep for the marker afterwards, always — a stray `TMP` in an id is
  invisible on the page and the spec only catches the ones it happens to assert.
- **A renumber can invert two section markers and leave the JS out of order.** `tabs` swapped examples
  2 and 3, which put `[ACTIVATION]` (now example 2) after `[STOPS]` and `[NAIVE]` (now 3). Moving 52
  lines fixed the reading order and was safe because every block is a hoisted function declaration
  inside the factory — but **run `node --check` on the file afterwards**, which is the cheapest proof
  the move did not straddle a brace.
- **Check a repeated demo string's roles before a global swap.** `tabs` used `Distro` as both a link
  label and a `<nav>`'s `aria-label`; replacing both with the new link text quietly renamed the
  landmark, and the spec asserted the landmark name. One `toHaveAccessibleName` caught it. Grep each
  string you are about to replace and look at *what it is* in each hit, not just how many there are.
- **"Kept as a comparison" is a mistake wearing a different word.** `tooltip`'s example 3 was the
  native `title` attribute, introduced as a comparison rather than a failure — and it is a live
  instance of the first entry in its own `contract.failureModes`. Read a "comparison", a "for
  contrast" or a "the thing you are replacing" example against `failureModes` before deciding it is
  correct markup; if it matches one, it belongs in *Common mistakes*, and that costs a renumber.
- **A section with one example gets a full-width grid track, and `.ac-demo` is a stretch column.** So
  a bare control in a single-example *Common mistakes* section spans the whole panel while the same
  control in a three-column section looks fine. Wrap it in whatever inline wrapper the component
  already ships rather than adding CSS — `tooltip` reused `.ac-tooltip-host` without the
  `data-ac-tooltip` attribute the factory looks for.
- **Demo text that explains the component's own CSS belongs in `docs.md`.** `drawer`'s example 3 was
  ten paragraphs narrating `min-height: 0` and `overscroll-behavior: contain` — true, and the wrong
  place for it, since a reader has not opted in to that on a rendered demo. Replace it with real
  content from the vocabulary table and keep the *shape* the example needs, which here was "still long
  enough to scroll". Check the long-content example of every remaining row for this.
- **Two controls whose names share a prefix collide under `getByRole`.** Playwright matches an
  accessible name as a case-insensitive *substring* by default, so a `Delete project` trigger and a
  `Delete Project 462` confirmation button resolve to the same locator and trip strict mode. Give the
  outer one `exact: true` rather than renaming around it; the two names are correct copy.
- **The page-factory wrapper the pass keeps adding was quietly costing columns.** `.demo` is
  `display: flex; flex-direction: column; align-items: flex-start`, so a `<div data-ac-button>` around
  the sections is a flex item **sized to its content**, and the `.ac-demo-grid` inside it then lays out
  in fewer columns than the panel has room for. It had been live since row 3 and nothing caught it:
  `chip-toggle` and `loading-button` were rendering at two columns of three, and `dropdown` at one.
  Fixed once, in `site.css`, with `.demo > :has(> .ac-demo-section) { width: 100% }` — matched by what
  the wrapper contains rather than by a class, so a later component cannot forget it. **Measure rather
  than eyeball**: `getComputedStyle(grid).gridTemplateColumns.split(' ').length` across every page is
  what found it, and 29 of 33 pages were already right, which is why it read as normal.
- **Ask axe rather than reasoning about it, and let the gate answer.** Whether `aria-expanded` on a
  role-less `<div>` trips `aria-allowed-attr`, and whether a dangling `aria-controls` is a violation
  or only an `incomplete`, both depend on axe internals that are quicker to run than to recall. Build
  the example unmarked, run `a11y -g <slug>`, and read the two lists it prints — unclaimed violations
  and claims that never fired. `disclosure`'s example 4 needed no marker and example 7 needed one.
  The one thing worth knowing up front: axe skips a bad `aria-controls` on a collapsed control, so an
  example built to fail that rule has to ship **expanded**.

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

Re-counted 2026-08-07, after row 20. Every remaining row, heaviest first:

```
tabs 24 · data-table 16 · modal 13 · jump-nav 11 · prose-surface 9 · result-panel 5 · notice 4
tooltip 1 · status-text 1 · badge 1
```

`dropdown` and `drawer` return nothing, but that is not the same as being light — `dropdown` is 433
lines. The count measures punk vocabulary only, not the size of the row; `disclosure` scored zero and
still took a full retrofit and a spec written from nothing. Finished rows are gone from the list.

---

## Naming decisions

Settled. Do not re-litigate. **Display name only** — `meta.json` `name`. Slugs, folders, URLs and spec
paths do not move.

| slug | old name | new name | done |
| --- | --- | --- | --- |
| `chip-toggle` | Chip Toggle | **Filter Chip** | [x] |
| `field` | Field | **Form Field** | [x] |
| `dropdown` | Dropdown / Listbox | **Custom Select** | [x] |
| `effects` | Effects | **Background Effects** | [x] |
| `fieldset-group` | Fieldset Group | **Fieldset** | [x] |
| `focus-ring` | Focus Ring | **Focus Indicator** | [x] |
| `jump-nav` | Jump Nav | **In-Page Navigation** | [x] |
| `motion-preferences` | Motion Preferences | **Reduced Motion** | [x] |
| `notice` | Notice | **Alert** | [x] |
| `prose-surface` | Prose Surface | **Rich Text Content** | [ ] |
| `result-panel` | Result Panel | **Copyable Result** | [ ] |
| `status-text` | Status Text | **Status Label** | [x] |

A rename happens **in that component's own pass**, not ahead of it. Six are applied, and the prose in
every other component was updated in the same commit each time. The `done` column above is the ledger;
the count in [START HERE](#start-here) has to agree with it.

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

**Most references are not links.** `focus-ring` had five and only one was a `docs.md` link — the rest
were source comments in three other components and in `tokens.css`. Grep the display name across
`src/` and `docs/`, never just the `../slug/` link form.

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

 1. Read src/library/components/<slug>/{meta.json, component.html, docs.md,
    tests/<slug>.spec.mjs} -- the spec is inside the component folder, not in
    the repo-root tests/. Read this component's entry in
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
- **All 33 components now have a spec.** `disclosure` was the last one without, and nothing in the
  repo checked for it: agent-surfaces §3 only asserts that *documented* keys are pressed, and a
  contract whose every key is `native:` gives it nothing to assert. A new component scaffolded
  without a spec would be just as invisible.
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
| 13 | `fieldset-group` | [x] | **Renamed → Fieldset.** Six references, in four other components: two `component.css` header comments and four `docs.md` links. `field/docs.md` already said `[Fieldset]`, having anticipated the rename. None named an example number. New content: delivery instructions, pickup time, invoice options, payment methods, tax settings + refund policy. **Demoting the demo titles to `h4` made example 3's `.ac-group__heading` a sibling of its own example title** — it is now `h5`, which is correct for this page and is why the docs say the level comes from your outline, not the component. `contract.keyboard` gained an arrows row: the docs table already listed them. |
| 14 | `skip-link` | [x] | CSS-only. **First two-section page since `chip-toggle`** — example 5 is genuinely broken, so it moved into *Common mistakes* with no renumbering, since it was already last. It carries no `data-ac-demo-broken`, and correctly: neither failure is an axe violation or a `focus-visible`/`target-size` one, so there is nothing for the gate to assert. The `.ac-skip-lineup` mock class became `.ac-skip-people` — demo vocabulary had reached a class name, the way it reached a string in `checkbox`. |
| 15 | `visually-hidden` | [x] | Two sections, no renumber: 1–3 are the three jobs the class does, 4–5 exist to show failures, so they moved as-is with all four `data-ac-demo-broken` markers untouched. **The split broke a test that nothing else had touched**: the spec's `demo()` helper is `page.locator('.ac-demo-grid')`, and one test called `.evaluate()` straight on it — two grids, strict-mode failure. Chained uses were fine. `contract.keyboard` did not exist and now does, one `native:` Tab row, because the mandatory Keyboard table needs something to agree with. |
| 16 | `focus-ring` | [x] | **Renamed → Focus Indicator.** Five references, and **only one was a docs link** — the other four are source comments in `effects`, `prose-surface`, `typography` and `tokens.css`. The class prefix stays `.ac-focus-ring`: this is a display-name rename, not a slug one. Two sections, no renumber (1–3 correct, 4–5 the failures; 5 is broken-then-fixed side by side, the icon-button shape). `.ac-fr-track` → `.ac-fr-item`, and the spec's `demo(page).evaluate()` hit the two-grid strict-mode trap the last row recorded. |
| 17 | `live-region` | [x] | Two sections, and **the first row where an example was split in two**: old 5 was *Repeats, and `role="log"`* — two topics glued together, one correct and one a live failure. The log became correct example 4 and the Copy pair became mistake 6, which made the renumber 1→1, 2→2, 4→3, 5(log)→4, 3→5, 5(repeat)→6. `data-ac-live-region` moved onto a wrapper `<div>`. Still **0 `data-ac-demo-broken`**, correctly: silence is not an axe violation, a `focus-visible` one or a `target-size` one, so the marker would be a lie the gate then asserts — the `skip-link` case. **Four `demo(page).evaluate()` calls hit the two-grid strict-mode trap**, the most of any row so far; three of them never used the grid element at all and became plain `page.evaluate`. `docs.md` had seven component-specific `##` against a cap of two: *The whole thing* folded into Required markup, *Assertive is not "important"* became a `###` there, *An announcer* became the new `## API`, and the remaining four merged into two `##` with a `###` each. It had no `## API` and no `## Using it in a framework` — both are new. `contract.keyboard` did not exist and now does, two `native:` rows for the `role="log"` scroller, which is the only tab stop on the page. Content: Changes saved / Draft saved / Report exported / Teammates to invite / an Activity log. |
| 18 | `typography` | [x] | **The cheapest split so far, and the shape to look for: only example 1 is correct markup, so it is the lone *Correct example* and 2–5 are all mistakes — no renumbering at all, and not one section marker in the CSS moved.** Both `data-ac-demo-broken` markers were left untouched, including the `opacity: 0.4` one the CSS comment says to measure across every theme before changing. **Demoting the demo titles to `h4` stranded a heading**, the second component after `fieldset-group`: example 2's specimen was an `<h4 class="ac-t-h2">` chosen to match its depth, and at `h4` it became a sibling of its own example title. It is `h5` now, and the spec's `toBe('H4')` moved with it. axe does not catch this — nothing is skipped. The heading-list test found its example by `.nth(1)`; it now filters on `[data-ac-t-outline]`, so a later split cannot silently point it at a different example. Three `demo(page).evaluate()` traps. `docs.md` had nine `##` against a cap of two: *Muted text* and *A link is not a color* became `###` under States (both are that table's rows argued at length), *Forced colors* dissolved into a paragraph in each of them, and *rem*, *Text spacing* and *Reflow* merged into one *Text that survives being resized*. `## Keyboard`, `## States` and `## Related` are new. Content: Billing / Overview / Recent activity, Order 462, Invoice 99, `ORD-462-99`, Jordan Lee. |
| 19 | `motion-preferences` | [x] | **Renamed → Reduced Motion.** Five references: three source comments and docs links in `effects`, `jump-nav` and `switch`, and **one in a vendored file** — `src/site/theme/THEME-SERVICE.md`, wrapped across two lines exactly as this file warns, and only a multiline grep found it. That file is safe to edit: its "Deliberate deviations" and "Motion behavior" sections are this repo's own record, not upstream boilerplate. None named an example number. Second row after `typography` where only the last example is a mistake, so **no renumber and no CSS marker moved**. `.ac-motion-scope` moved off the grid onto a wrapper `<div>` with `data-ac-motion`, since the spec's `SCOPE` locator has to stay singular. `.ac-motion-record` → `.ac-motion-disc`: the demo was a spinning vinyl record, and the vocabulary had reached the class name. **Third stranded heading** — example 4's two `.ac-motion-panel__title` were `h4` and are `h5` now; the spec never asserted their tag, so nothing failed and nothing would have. `contract.keyboard` went from one row to three, adding `native:` <kbd>Tab</kbd> and <kbd>Enter</kbd>; <kbd>Space</kbd> stays non-`native:` because the spec really presses it. `docs.md` had five component-specific `##` against a cap of two: *Reduced is not removed* became a `###` under States, *Persistence* and the no-third-state mechanism became `###` under *The asymmetry*, and *matchMedia* and *SC 2.2.2* became `###` under a renamed *What the gate does not cover*. `## Keyboard`, `## States` and `## Related` are new. Content: Syncing disc, an Order 462 / Invoice 99 activity ticker, `462 unread`. |
| 20 | `effects` | [x] | **Renamed → Background Effects**, the joint-largest ripple of the twelve: 11 references in 7 components, only 5 of them `docs.md` links, and 4 of the 6 source comments needed re-wrapping because the name is 11 characters longer. **The split was the ambiguous one and `contract.failureModes` settled it** — example 5's "two motion gates with different reach" is listed there, and example 4 carries `data-ac-demo-broken`, so both are mistakes. That leaves example 1 alone in a singular *Correct example*, the `typography` shape: **no renumber, no CSS marker moved, no stranded heading** (the file ships no `<h3>`/`<h4>` but the five demo titles). Spec: the `demo(page).evaluate((grid) => …)` two-grid trap, and the two `.nth(1)` picks re-anchored on `.ac-fx-pair`. `aria-label="Set list, second night"` → `Recent orders`, asserted in three places. `docs.md` had six component-specific `##` against a cap of two: *fx-grid needs isolation* became a `###` under Required markup, *Motion* and *Forced colors* `###` under States, and the gradient and scrollbar sections stayed `##`. `## Keyboard`, `## States`, `## Screen reader behavior` and `## Related` are new, and the old *Before you copy* hedged about frameworks — deleted. `contract.keyboard` went from one row to three, adding `native:` arrows and Home/End for the scroll region. Content: Order 462 / Invoice 99 / Jordan Lee, a Billing frame, a Recent orders list of order and invoice statuses. |
| 21 | `disclosure` | [x] | **The full retrofit, and the largest row so far: seven examples and a spec written from nothing.** The old page was three correct disclosures in an `.ac-disclosure-group` with no `ac-demo` anything, and its content was documentation in costume — the three panels answered questions *about the component*, so none of it survived. **The four `contract.failureModes` became examples 4 to 7 exactly**, which made the split trivial and the wiring the expensive part: `createDisclosure` repairs three of the four on sight, so all four are driven by a new `createDisclosurePage` in the same file (check 14 exempts the `Page` suffix). **Only one `data-ac-demo-broken` in the end, on example 7** — axe reads a role-less `<div aria-expanded>` as fine, and the dangling `aria-controls` only fails while the control is *expanded*, so example 7 ships open. Example 5 is the best failure on the page: `height: 0` on the panel, and the link inside it is still in the tab order, which the spec asks the browser rather than asserting. Fourth stranded-heading row — three `<h3 class="ac-disclosure__heading">` are `h5` now, and the spec asserts the tag on all three triggers. `contract.aria` gained `hidden` on the panel and `contract.keyboard` went from one row to three, adding `native:` <kbd>Tab</kbd> and a non-`native:` <kbd>Esc</kbd> whose effect is *nothing, deliberately* — the spec presses it and expects no change, which is how the "Keys deliberately not bound" reasoning got a test. `docs.md`: `## How it works` → `## Required markup`, `## Options` → `## API`, `## What to watch for` → `## Common mistakes`; `## Before you copy`, `## Keyboard`'s table shape, `## States` and `## Related` are new; the two component-specific sections are *Progressive enhancement* and *Disclosure or `<details>`*, the latter inheriting the argument the old demo panels were making. `.ac-disclosure-group` was dropped — stacking is a flex column with a gap and the CSS header says so. Referenced by `modal` ×1 and `tooltip` ×4; no rename, so those were prose-safe and untouched. Also fixed the stale note in `tests/shared/a11y.spec.mjs` that called this component the one still waiting on its retrofit. |
| 22 | `dropdown` | [x] | **Renamed → Custom Select**, and the Tier 2 budget was never the problem: `Dropdown / Listbox` is 5 bytes *longer* than the new name, so the rename bought headroom rather than spending it. 45 references in 16 files, and **only 4 were `docs.md` links** — the rest are source comments in the site shell (`SiteHeader.astro` ×7, `site-header.css` ×7, `THEME-SERVICE.md` ×4, `A11Y-WAY-PAGES.md` ×4), because the header's theme picker *is* this component. One more in `tests/site-header.spec.mjs`, including a test name. `field/docs.md` already said `[Custom Select]`, having anticipated the rename the way it anticipated `[Fieldset]`. Code identifiers do not move: `createDropdown`, `_acDropdown`, `.ac-dropdown`, `createDropdownPage`, the `DropdownChange` type. **Second single-section page after `field`'s shape** — all six examples are correct markup, so no *Common mistakes* block and no renumber; not one CSS or JS section marker moved. Only example 3's content was punk (`Rink Classic` / `Synthwave Sunset` / `Acid Arcade`, which are this site's own theme names) and it is a `Chart palette` of `Standard` / `Colorblind safe` / `High contrast` now, with the ids `ac-dd-theme-*` → `ac-dd-palette-*` and the spec's `toHaveAccessibleName` moving with them. `docs.md` had six component-specific `##` against a cap of two: *It is markup, not a script that writes markup* and *Decorating an option* became `###` under Required markup, *Where the value lives* a `###` under API, and *Not supported* a `###` under Keyboard, since multiple selection is entirely a keyboard-model argument; *The focus model* and *Positioning* stayed `##`. `## Screen reader behavior` and `## Using it in a framework` are new, and the old *Before you copy* opened by recommending the reader's own framework — deleted. **The row also fixed a layout defect three rows old**, in `site.css`; see the bullet above. |
| 23 | `modal` | [x] | Single section, no renumber, no rename, and nothing to change in the CSS or JS — the whole row is `component.html`, `docs.md`, `meta.json` and the spec. **The example titles were the find:** all four were named for the *content* (`The baseline`, `A form in a modal`, `Long content`) when what actually separates them is where focus lands, which is the one thing `showModal()` leaves to you. They are `Focus on the dialog itself` / `Focus in the first field` / `Focus on the safe answer` / `Content longer than the screen` now, and the section note says so. The old `summary` and `contract.useWhen` disagreed about the hard part once the summary was rewritten — the summary said focus placement, `useWhen` said "the ARIA you must not add" — so `useWhen` moved with it; the ARIA point is still carried by two `failureModes`. Content: doors/setlist/door list/house rules → Order 462, Invite a teammate, Delete Project 462, Billing terms, with all four ids renamed and **23 strings in the spec**. **A trigger and a confirmation button cannot share a name prefix**: `Delete project` and `Delete Project 462` collide under `getByRole`'s default substring match, so the trigger locators need `exact: true`. `docs.md` had six component-specific `##` against a cap of two: *Sizing and zoom* became a `###` under Required markup, *Refusing to close* a `###` under Keyboard, *Dismissing by the backdrop* a `###` under *The four things it does not do*, and *Ask first whether it should be a modal* folded into a Common mistakes bullet. The two that stayed `##` are the two `CLAUDE.md` names as load-bearing: *What showModal() gives you* and *The four things it does not do*. `## States` is new. **The dialog's own `<h2>` stays `<h2>` under an `<h4>` example title** — not a stranded heading: a closed `<dialog>` is `display: none` so its heading is not in the tree, and an open one makes the rest of the page inert. The file header now says that, so a later row does not "fix" it. |
| 24 | `drawer` | [x] | Single section, no renumber, no rename, no CSS or JS change — the same shape as `modal`, and the second row running where the whole job is `component.html`, `docs.md`, `meta.json` and the spec. **The demo content was explaining its own CSS**: example 3's ten paragraphs were "Section 6. The body is a flex item with `min-height: 0`…", which is a `docs.md` sentence sitting in rendered demo text. It is an Activity log for Project 462 now — real content, still ten paragraphs so the scroll is real — and the `Terms of service` title went with it, which also removed an overlap with `modal`'s new *Billing terms*. Renamed `ac-demo-long` → `ac-demo-activity` across the markup, the spec and example 2's nav list. `contract.keyboard` gained a `native:` <kbd>Enter</kbd> / <kbd>Space</kbd> row so the mandatory table could account for the trigger. `docs.md` had six component-specific `##` against a cap of two: *Edges* became a `###` under Required markup, and *Modal or not*, *Scroll lock* and *The slide is motion-gated* became `###` under the new `## States`; *The focus story* and *Top layer, and the backdrop's z-index* stayed `##`. `## Required markup`, `## States` and `## Screen reader behavior` are new, and the old *Before you copy* both hedged about frameworks and carried the "consider `<dialog>` first" argument — the hedge is gone and the argument moved to `## Related`, pointing at `modal`. **This file is the one with CRLF line endings**, which breaks a `\n`-anchored regex over the whole file; `split('\n')` still works because `trim()` eats the `\r`. |
| 25 | `tooltip` | [x] | **First two-section split since `effects`, and the renumber came with it.** Example 3 was the native `title` attribute, kept "as a comparison" — but it is a live failure of exactly the first `contract.failureModes` entry (*hover only, which fails all three*), so it is a mistake, and mistakes go last: 1→1, 2→2, 4→3, 5→4, 3→5. That moved every example number in the CSS header and its four inline markers, the JS header and its two, and two spec section comments. **No block reordering**, because each section's *first* example still ascends: `[BUTTON]` is now 1 and 5, `[ICON]` 2, 3, 4. It carries no `data-ac-demo-broken` — none of `title`'s failures is an axe violation, a `focus-visible` one or a `target-size` one, the `skip-link` case. **A single-example section is a full-width grid track**, and `.ac-demo` is a stretch column, so example 5's bare button spanned the whole panel; wrapping it in the component's own `.ac-tooltip-host` (without `data-ac-tooltip`, which is what the factory looks for) puts it back to content width with no new CSS. Content: Advance the show / run sheet / load-out / set length / Berkeley curfew → Export report, Print invoice, What counts as a seat?, Seats with a 99-seat plan cap, Billing contact — 13 strings in the spec including a two-part `toHaveAccessibleDescription` regex. `contract.keyboard` gained a `native:` <kbd>Tab</kbd> row. `docs.md` had five component-specific `##` against a cap of two: *First, do you want one at all?* became a `###` under Required markup, *Positioning* a `###` under the new `## States`, and *Why `title` is not this* a `###` under Common mistakes; the two that stayed are *SC 1.4.13 is the whole component* (which `CLAUDE.md` names as load-bearing) and *Toggletip, and why it is a different component*, which is a second component in the same folder. |
| 26 | `tabs` | [x] | **The heaviest content sweep of the pass, and the first row to move a JS block.** Four of the five examples pair a failing strip with a correct one, so the split turned on which example is *not* a failure: `contract.failureModes` lists four, and automatic-vs-manual activation is not among them — its own comment already said *Not broken*. So examples 1 and 3 are correct, 2, 4 and 5 are mistakes, and mistakes go last: 1→1, 3→2, 2→3, 4→4, 5→5. **That inverted two `[SECTION]` markers, and `[ACTIVATION]` then read after `[STOPS]`/`[NAIVE]` in `component.js`** — 52 lines moved above `[FOCUS]` so the file reads in example order again, which is the `button` rule. Safe because every block is a hoisted function declaration inside the factory; `node --check` confirmed it. Content: Setlist / Pressings / The venue / Show notes / sleeve notes / Zines / Distro / Buy a ticket → Overview / Activity / Billing / Project 462 / Open tasks / Reports / Invoices / Save changes, across 24 markup strings and 10 in the spec. **One blanket replacement was wrong**: `'Distro'` was both a link label and the `<nav>`'s `aria-label`, and only the link became `Invoices` — the nav is `Workspace`. Check a repeated string's *roles* before a global swap. `contract.keyboard` gained a `native:` <kbd>Enter</kbd> / <kbd>Space</kbd> row and Tab moved to the front. `docs.md`: the `\| Key \| Where \| Does \|` table was the last of the three old shapes in the library; *One sentence* folded into the Required markup lede; five component-specific `##` against a cap of two — *aria-selected or aria-current* became a `###` under Required markup, *Hide the panel with `hidden`* a `###` under States, *The panel gets a Tab stop* a `###` under *Roving tabindex*; the two that stayed are *Roving tabindex* and *Automatic or manual activation*. `## Related` is new. |
| 27 | `jump-nav` | [x] | **Renamed → In-Page Navigation**, and the smallest rename ripple of the eight: five references, one of them `meta.json` itself, and only two were `docs.md` links. **The split is the `typography` shape and cost no renumber** — example 4 looks like a correct instrumented specimen, but *the active section written to a live region per scroll event* is one of the five `contract.failureModes`, so it belongs with 2, 3 and 5 and example 1 stands alone under a singular *Correct example*. Content: Salad Days / Nausea / Cannonball / Freak Scene / Longview / Pepper / Tour notes → Summary / Items / Shipping / Payment / Order 462, over 22 ids and their labels. **Two things bit during the sweep.** A placeholder collision: renaming `-shipping`→`-items` and `-payment`→`-shipping` in one pass needs a temporary token, and `jn3a-shipping-TMP` was itself matched by the `-shipping` rule and came out `jn3a-items-TMP` — check for a leftover marker after any A→B→C rotation. And **fifth stranded-heading row**: the demo documents ship 22 `<h4 class="ac-jump-nav__target">` section titles, which became siblings of the `h4` example titles; all 22 are `h5` now, the file header says why, and `docs.md`'s screen-reader line moved from *heading level 4* to *level 5* with a note that the level is the page's. `contract.keyboard` gained a `native:` <kbd>Enter</kbd> row and Tab took the `native:` prefix. `docs.md` had five component-specific `##` against a cap of two: *aria-current="location"* became a `###` under Required markup, the two *The target needs…* sections merged into one `## What the target needs` with a `###` each, and *Nothing is announced* became a `###` under *Which section is current*. The `\| Key \| Where \| Does \|` table is gone. `## Related` is new. |
| 28 | `notice` | [x] | **Renamed → Alert**, and the one rename where a blanket replace is unsafe: `Notice` is also an ordinary verb, and `motion-preferences/component.css` opens a comment with *"Notice what is missing"*. Twenty references were renamed by an explicit per-file list with that one deliberately left out — `grep -rnE "\bNotice\b"` afterwards returns exactly it, which is the check. `Alert` also collides with `role="alert"`, so the prose says *"an alert role present at page load"* where it used to say *"an alert"*. **Slug, classes and factory names do not move**: `.ac-notice`, `AC.createNotice`, `AC.buildNotice`, `AC.announceNotice` are all unchanged, and both the file header and `docs.md` say so, because this is the first rename where the two spellings sit side by side in the same file. **The `typography` shape again — no renumber**: all four of examples 2 to 5 are `contract.failureModes` entries, so example 1 stands alone under a singular *Correct example*. **Demo vocabulary had reached `component.js`**, the `checkbox` leak: three `buildNotice(...)` strings shipped *462 records saved to the crate*, a `4620` card and *your copy ships on the 9th*, plus a log line reading *role on the notice*. Content: Sunday matinee / Basement Tapes / the crate / the zine → invoices, an exported report, seats on the Team plan and the card ending 4462. `contract.keyboard` went from one row to two, both `native:` — the dismiss button is a real `<button>` and `component.js` branches on no keys at all. `docs.md` had five component-specific `##` against a cap of two: *Target size* became a `###` under Required markup, *Dismissing one* a `###` under Keyboard, and *`role="alert"` is for errors* a `###` under *Static or announced*; the two that stayed are that one and *The icon is decoration, the word is the meaning*, which three other components point at. The `\| Key \| Result \|` table is gone and `## Related` is new. |
| 29 | `status-text` | [x] | **Renamed → Status Label**, and unlike `notice` the old name is a two-word proper noun, so a blanket replace is safe: 15 references in 5 components, all mechanical. Slug, `.ac-status` and `AC.createStatusText` all keep their spelling, and both the file header and `docs.md` say so. **The `typography` shape for the fourth row running** — all four of examples 2 to 5 are `contract.failureModes` entries, so example 1 stands alone under a singular *Correct example* and nothing renumbered. **The first row where the `summary` needed no work at all**: it was already in the new voice and already used the words "status label", so `check:agents` fired no receipt and `useWhen` needed no reread. **`contract.keyboard` did not exist and now does** — one `native:` <kbd>Tab</kbd> row saying nothing here is a tab stop, the `visually-hidden` precedent, because the mandatory Keyboard table needs something to agree with and a component with no focusable part still owes the reader that sentence. Two example titles were arguing rather than naming: *A tick is not a status* and *One region, not one per row* became *Four labels that all mean it worked* and *A live region per row, and one for the list*; the `docs.md` section keeps the argued heading, since that rule is about example titles. Content: Cold Water Flat / Ten Second Anthem / Cassette Only zine → Standing desk / Office chair / Monitor stand, and `4620` → `4462`. `docs.md` had five component-specific `##` against a cap of two: *The detail that does not fit* became a `###` under Required markup, *When the column gets narrow* a `###` under States, and *One region, not one per row* a `###` under *Everything here comes from the size*; that one and *A tick is not a status* stayed. `## Related` is new. |
| 30 | `badge` | [ ] | **NEXT.** |
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

## Checking the rows already done

The sweeps in [Final verification](#final-verification) only come clean after all 33, because the
unfinished rows still hold everything they are supposed to. Mid-pass, run them **scoped to the
finished rows** — that catches a regression in work already signed off, which is the only thing that
can quietly rot while the pass runs:

```sh
DONE="button icon-button loading-button chip-toggle field text-input input-group textarea \
native-select radio-group checkbox switch fieldset-group skip-link visually-hidden focus-ring \
live-region typography motion-preferences effects disclosure dropdown modal drawer tooltip tabs jump-nav notice status-text"
P=""; for d in $DONE; do P="$P src/library/components/$d"; done
ls -d $P | wc -l          # must equal the number of finished rows, or every grep below is vacuous

grep -riE "setlist|merch|zine|olympia|berkeley|gilman|bakesale" $P
grep -rn "## The contract\|## One sentence\|## What to watch for\|## Watch for" $P
grep -rn 'h3 class="ac-demo__title"' $P
grep -rn "| Key | Action |\|| Key | Result |" $P

# The three mandatory headings, exactly once each. Prints only the failures.
for d in $DONE; do
  f=src/library/components/$d/docs.md
  k=$(grep -c "^## Keyboard$" $f); r=$(grep -c "^## Required markup$" $f); b=$(grep -c "^## Before you copy$" $f)
  [ "$k$r$b" = "111" ] || echo "$d: Keyboard=$k Required=$r Before=$b"
done

# Applied renames, across the whole repo rather than the finished rows -- an old
# display name can come back in any component's prose. Add each new one as you
# apply it, and drop the slug's own folder from the [ ] rows still to come.
grep -rn "Chip Toggle\|Dropdown / Listbox\|Fieldset Group\|Focus Ring\|Jump Nav\|Motion Preferences\|Status Text" src/ docs/
```

All five return nothing as of row 29 — and **check the sanity of `$P` before believing that**, because
every one of them is a grep over a path list and a wrong `DONE` or a failed `cd` makes all five pass
vacuously. `ls -d $P | wc -l` should print the number of finished rows. The rename sweep below returns
only its own rows in
[Naming decisions](#naming-decisions) and the command line above — anything in `src/` is a real hit.
Add each new row to `DONE` as you tick it.

`Field`, `Effects`, `Notice` and bare `Dropdown` are deliberately not in that last sweep. The first
three are ordinary words — `Notice` is a verb, and `motion-preferences/component.css` opens a comment
with it — and `Effects` now matches its own new name everywhere; `Dropdown` is inside
`createDropdown`, `_acDropdown`, `createDropdownPage` and the `DropdownChange` type, none of which
move, so it returns dozens of correct hits. The useful checks are `grep -rn "\[Field\]" src/`,
`grep -rn "\[Effects\]" src/`, `grep -rn "\[Notice\]" src/` and `grep -rn "\[Dropdown\]" src/`, for a
cross-link whose text was not updated. The full old name `Dropdown / Listbox` is unambiguous and is
swept above.

A `\bNotice\b` sweep has exactly two legitimate survivors: that verb, and the sentence in
`notice/docs.md` explaining that `AC.createNotice` keeps its spelling because the slug does.

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
