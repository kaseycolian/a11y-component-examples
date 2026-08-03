# The agent layer

Why the agent-facing side of this library is shaped the way it is, and what it is made of.

**Status: built and complete, and this record matches it.** All eight phases are done — the generator
runs, all four tiers ship, every component has a contract, the cross-cutting surfaces are written, all
three Tier 0 doors are rendered from one preamble, the entry docs say which audience they serve, and
a component edit is now coupled to its agent-side knowledge in both directions. `npm run check:agents`
plus `tests/shared/agent-surfaces.spec.mjs` gate all of it in CI. What each surface measured against its
budget is in **What the layer costs, measured**. The checklist below is the source of truth for how far
it got; keep it current as the library grows, and record what surprised you in the **What phase N cost**
sections.

This is a contributor document. An agent *consuming* the library should read `AGENTS.md` and
`agents/`, never this file — the same way it should never read `BUILD-STATUS.md`.

---

## The problem

The library has two audiences and only one of them was built for. A person gets a browsable site.
An agent gets a 1.42 MB directory and no map. Measured before any of this work started:

| Measured | Consequence |
| --- | --- |
| No `AGENTS.md`, no `llms.txt`, no `.claude/`, no index | Nothing tells an agent the library exists or how to read it |
| Corpus is **1.42 MB** (~400k tokens) | Reading broadly is impossible |
| `CLAUDE.md` says *"When resuming, read `docs/BUILD-STATUS.md` first"* | That file is **113 KB** (~28k tokens) and is a build-progress log, not a consumer doc |
| `src/site/lib/registry.mjs` uses `import.meta.glob` | Vite-only, so no agent and no plain Node script can enumerate the roster |
| The ARIA contract is hand-written in three places | `docs/component-specs.md`, each `docs.md` `## The contract`, and the markup — already drifting |
| `component-specs.md` has 17 ad-hoc bullet labels, 20 unlabeled bullets, and no entry for `disclosure`, `dropdown` or `field` | Unusable as a machine source; a parser over it would be confidently wrong |
| The 68 gotchas mix audiences, and two are duplicates | The transferable accessibility knowledge is trapped inside a progress log |
| 57 `BROKEN ON PURPOSE` anti-patterns live in HTML comments | Unqueryable — and this is the most agent-valuable content in the repo, because an agent's problem is rarely producing plausible markup, it is knowing the traps |

Two things already worked, and this design builds on them rather than replacing them:

- **`meta.json` is perfectly consistent** — the same ten fields in every component folder, 30 KB in
  total. It is already what `registry.mjs` and `tests/shared/a11y.spec.mjs` read.
- **The raw files are already static assets.** `scripts/sync-library.mjs` mirrors `src/library/` into
  `public/library/`, so every component is already fetchable at
  `<base>/library/components/<slug>/{component.html,component.css,component.js,docs.md,meta.json}`.

**The outcome being bought:** an agent can answer "how do I build an accessible X" for under ~2k
tokens, be certain that what it read matches the shipped code, and get the same answer whether it
cloned the repo, fetched the site, or is running Claude Code.

**Constraint held throughout:** nothing under `src/site/pages/`, `src/site/components/` or
`src/site/styles/` changes. The human pages are finished and are not part of this.

---

## The read path

Four tiers with hard budgets. An agent stops as soon as it has enough, and each tier names the next.

| Tier | Surface | Budget | For |
| --- | --- | --- | --- |
| 0 | `AGENTS.md` / `llms.txt` / the skill | ~2.5 KB, skill 3 KB | What this is, the read path, and the one rule: never read `BUILD-STATUS.md` or `CLAUDE.md` |
| 1 | `agents/index.md` | ~3.5 KB | Route to one component — slug, group, `useWhen`, tags, WCAG, files |
| 2 | `agents/components/<slug>.md` | 1.8 KB | The answer: ARIA, keyboard, states, failure modes, API |
| 3 | `library/components/<slug>/component.*` | as needed | The code to copy. Already served, unchanged |
| 4 | `library/components/<slug>/{docs.md,meta.json}` | as needed | The *why*, per component |
| 4 | `agents/{pitfalls,conventions,verify,testing}.md` | ≤ 15 KB each | The cross-cutting traps |

Tier 1 uses a new one-line `useWhen`, deliberately **not** `meta.json`'s `summary`: the summaries run
~50 words and are written as ledes for a human page.

The cross-cutting set is one read-path row, not four, because Tier 0 has no room for four and the file
names already say which is which:

- **`agents/pitfalls.md`** — the transferable accessibility findings, grouped by topic (names and
  labels · live regions · focus · forced colors · targets and pointers · color and contrast · CSS and
  the cascade · tables and reflow) and tagged with the SC where there is an honest one. This is the
  highest-value unique artifact in the repo: every item was paid for once by a real failure.
- **`agents/conventions.md`** — the copy-paste contract with its reasoning. The token chain, the motion
  gate, the forced-colors block, the `ac-` prefix, IIFE + `destroy()`. It is where Tier 0's compressed
  claims get their *why*, which is what let Tier 0 shrink enough to afford this row.
- **`agents/verify.md`** — how to check the result, distilled from `tests/shared/a11y.spec.mjs`: the
  ten checks, and the exceptions that make a naive sweep wrong.
- **`agents/testing.md`** — the Playwright and axe harness findings, for an agent writing a11y tests.

**No `pitfalls.json`.** The plan paired one with the markdown. There is no consumer: `index.json`
exists because routing over the roster is a filtering job, while a reader of a 15 KB pitfalls file
reads all of it, and the SC tags are in the markdown already. It would have been a second rendering of
the same bytes with nothing pointing at it — phase 1's finding about `index.json`'s size, applied
before paying for it rather than after.

---

## One manifest, many renderings

The requirement is that the surfaces can never drift apart. So they are not separate documents. They
are renderings of one in-memory manifest, and **no file is ever half hand-written and half generated**
— that is the property that makes a `--check` mode possible at all.

```
HAND-WRITTEN — the only places to edit
  src/library/components/<slug>/meta.json    + a new `contract` block
  docs/agents/preamble.md                    Tier 0 prose, in slots -- the two
                                             skill-* ones render only into SKILL.md
  docs/agents/pitfalls.src.md                one block per transferable finding
  docs/agents/testing.src.md                 harness findings
  docs/agents/conventions.src.md             the copy-paste contract
  docs/agents/verify.src.md                  how to check the result
        |
        v
  scripts/build-agent-surfaces.mjs   ->  one manifest  ->  every surface below
        |
        +--> AGENTS.md                                                    committed
        +--> agents/index.md, agents/index.json                           committed
        +--> agents/components/<slug>.md                                  committed
        +--> agents/{pitfalls,conventions,verify,testing}.md              committed
        +--> .claude/skills/a11y-library/SKILL.md                         committed
        +--> public/llms.txt, public/agents/**       generated at build, gitignored
```

The four `.src.md` files share one parser and one renderer. They carry three markers —
`<!-- lede -->`, `<!-- group: Title -->`, `<!-- item: Title · 4.1.2 -->` — and the split is on the
markers only, never on the prose, so a body passes through byte for byte. Same rule as the preamble's
slots, and for the same reason: parsing prose is what got `component-specs.md` rejected as a source.

Every generated file opens with
`<!-- generated by scripts/build-agent-surfaces.mjs from meta.json + docs/agents/ — do not edit -->`.

`node scripts/build-agent-surfaces.mjs --check` re-renders into memory and diffs against disk, exiting
non-zero and naming the offending path. It is wired into `npm run check:agents`, into `npm run verify`,
into `.github/workflows/ci.yml`, and asserted by a Playwright test so it cannot be quietly skipped.
**That is the anti-drift mechanism**: editing a `meta.json` without regenerating fails CI.

`public/` mirrors the committed `agents/` at `prebuild`, by extending the existing `JOBS` array in
`scripts/sync-library.mjs` — which already does exactly this for `src/library` and `src/site/theme`.

The generated files are committed as well as served, so a fresh clone is useful before anyone runs a
build. The `--check` mode is what keeps a committed generated file honest.

---

## The contract block

The per-component contract goes into `meta.json` as a `contract` block, rather than into a new sibling
`contract.md`. The reasons, in order of weight:

1. **JSON needs no parser.** Being unparseable is precisely why `component-specs.md` was rejected as
   the machine source; choosing a second markdown file would import the same problem.
2. **It adds no new place for a contract to live.** There are already three. A `contract.md` would make
   a fourth, and 34 new files.
3. `meta.json` is already consistent, already served, and already read by `registry.mjs` and the a11y
   gate — so a schema test sits naturally beside the checks that exist.

Prose stays in `docs.md`, where it already is. The contract block is a table, not paragraphs, and it
has a byte budget enforced by a test.

```jsonc
"contract": {
  "useWhen": "Swap panels in place. Not for moving between pages — see jump-nav.",
  "pattern": "https://www.w3.org/WAI/ARIA/apg/patterns/tabs/",
  "aria": {
    "tablist":  ["role=tablist", "aria-labelledby"],
    "tab":      ["role=tab", "aria-selected", "aria-controls", "tabindex"],
    "tabpanel": ["role=tabpanel", "aria-labelledby", "tabindex=0"]
  },
  "keyboard": [["Tab", "one stop for the whole strip"],
               ["ArrowLeft/ArrowRight", "move between tabs"],
               ["Home/End", "first / last tab"]],
  "states": ["selected", "disabled"],
  "failureModes": ["a [hidden] panel has no accessible name",
                   "aria-controls naming a panel nobody built",
                   "panels faded out with opacity keep their tab stops"],
  "api": "AC.createTabs(root) -> { destroy() }",
  "seeAlso": ["jump-nav", "chip-toggle"]
}
```

This roughly doubles the total size of `meta.json` across the library, which costs nothing: no agent
reads all of them. It reads the Tier 1 index, then one Tier 2 file.

---

## Accuracy — `tests/shared/agent-surfaces.spec.mjs`

Hand-written content asserted against reality. This is the pattern `typography`, `data-table` and
`prose-surface` already use for their on-page readouts: the claim is written by a person and proven
against the real thing, so it cannot drift.

As built, in `tests/shared/agent-surfaces.spec.mjs`:

1. **Shape, then coverage.** The generator's own `validateContract()` refuses to render a malformed
   block, so the shape fails at `npm run agents` rather than in a test — earlier, and with the slug in
   the message. The spec owns what the generator cannot see: that *every* component has a contract,
   and that every rendered Tier 2 file is under budget.
2. **The ARIA is real** — every role and attribute a contract names is found in the initialized demo
   DOM, scoped to `.demo` and *outside* any `data-ac-demo-broken` subtree. Runs in the browser, so it
   sees what JavaScript sets, and `el.closest()` does the subtree exclusion exactly.
3. **The keyboard map is tested** — every key a contract names is pressed by that component's own
   `tests/<slug>.spec.mjs`. A key whose effect starts `native:` is exempt: the browser implements it,
   so there is no library code to exercise and testing it would be testing Chromium. The exemption
   renders into the Tier 2 file, so it is a visible claim and not a silent skip.
4. **The API is real** — every factory an `api` signature names is registered as
   `global.AC.<name> =` in `component.js`, and the reverse: a component whose `files` has no `js`
   must claim no API at all.
5. **Not a failure-mode count.** Replaced by two checks that hold: `failureModes` is never empty, and
   every `seeAlso` slug resolves to a real component and is not the component itself. The reasoning is
   in **Phase 2, as revised** below — it is the correction that mattered most.
6. **The last hop resolves** — the served `meta.json` and `docs.md` a Tier 2 file points at both
   return 200 during the Playwright run.
7. **`--check` is clean** — run as a subprocess so the drift report itself lands in the failure
   message.

Each of the seven was verified by mutation: rename a role in `component.html`, document a key nothing
presses, rename a factory in a contract, empty a `failureModes`, point a `seeAlso` at nothing, lower
the budget under the roster, edit a `meta.json` without regenerating. All seven go red, and the ARIA
one names the part and the selector it could not find.

---

## Phases

- [x] **0 · Persist the design.** This file, plus pointers from `BUILD-STATUS.md` and `CLAUDE.md`, so
      an interrupted or compacted session resumes from the repo rather than from memory.
- [x] **1 · Generator, Tier 0 and Tier 1.** `scripts/build-agent-surfaces.mjs`,
      `docs/agents/preamble.md`, `AGENTS.md`, `agents/index.{md,json}`, `agents/llms.txt`, the
      `sync-library.mjs` job, `.gitignore`, `check:agents` in `package.json` and `ci.yml`. Renders only
      from `meta.json` fields that already exist, so it lands working before any component is touched.
- [x] **2 · Contract blocks.** One `meta.json` edit per component, plus the accuracy tests. Seeded from
      the `component-specs.md` entries, each `docs.md` `## The contract` table and the
      `BROKEN ON PURPOSE` comment bodies; `disclosure`, `dropdown` and `field` were backfilled from
      their `docs.md` and markup, having no spec entry at all. The shape shipped is the one in
      **Phase 2, as revised** below, not the one sketched further up — see **What phase 2 cost**.
- [x] **3 · Split the gotchas.** The transferable accessibility findings moved to
      `docs/agents/pitfalls.src.md`, the harness findings to `testing.src.md`, the build trivia stayed
      in `BUILD-STATUS.md`, and the duplicated stale-cache entry collapsed to one. Then
      `conventions.src.md` and `verify.src.md`. See **What phase 3 cost**; "Phase 3, prepared" below is
      the classification it was built from and is kept as the record of what was decided before any of
      it moved.
- [x] **4 · The Claude Code skill.** `.claude/skills/a11y-library/SKILL.md`, generated, a router only —
      the third Tier 0 rendering rather than a fourth document, so it cannot disagree with `AGENTS.md`
      or `llms.txt` about the read path or the rules. Two new preamble slots, `skill-description` and
      `skill-audience`, render into it alone. All four warnings written into this item before the phase
      started were real and all four are addressed; see **What phase 4 cost**.
- [x] **5 · Split the entry docs by audience.** `CLAUDE.md` states the two contracts up front —
      contributing to the library versus consuming it, plus the one thing they share — and `README.md`
      gained an "if an agent is doing the copying" section. The conventions duplication between
      `CLAUDE.md` and `agents/conventions.md` was resolved by keeping both and checking the overlap
      rather than by deleting one; a routing row that sent contributors to the wrong file for a
      component's contract was fixed. See **What phase 5 cost**.
- [x] **6 · Close the record.** This file went from plan to built state: the status line above, and a
      current **What the layer costs, measured** section that re-measures rather than merging the five
      per-phase tables, which stay as the snapshots they are. `README.md` now reaches this record, so both
      entry points land on something true — humans → `README.md` → here, agents → `AGENTS.md` →
      `agents/`. One of the two items that was to be recorded as open got closed instead, because this
      phase's one required edit made it worse; the other is recorded as open. Phase 6 also found real
      drift, in `BUILD-STATUS.md` and in `scripts/new-component.mjs`. See **What phase 6 cost**.
- [x] **7 · Couple a component edit to its agent-side knowledge.** Requested after phase 1 landed, and
      designed only once phases 2–6 were done, because the contract block is what an edit has to keep in
      step. Three checks that read the component and report what the contract does not admit to, one
      fingerprint for the single edit no check can see, and the obligation written down as a table.
      It also added `contract.root`, without which the ARIA check would have swept nothing for more than
      half the library. See **Phase 7 — the coupling, as built**, and **What phase 7 cost**.

**Deferred: an MCP server.** Files work for every agent with no runtime, and a server would be a
second thing to keep accurate. The manifest the generator already builds is the natural backing for
one when it is wanted.

---

## What the layer costs, measured

Measured 2026-07-30 after phase 7, against the budgets in **The read path** above, KB = 1024 throughout.
These are current values. The six **What phase N cost** tables below are snapshots of the day each phase
landed and are deliberately *not* merged into this one — several surfaces moved after their table was
written, so a merge would present history as the present.

| Tier | Surface | Budget | Measured | Spare |
| --- | --- | --- | --- | --- |
| 0 | `AGENTS.md` | 2,560 B | 2,436 B | 124 B |
| 0 | `agents/llms.txt` | 2,560 B | 2,495 B | 65 B |
| 0 | `.claude/skills/a11y-library/SKILL.md` | 3,072 B | 2,831 B | 241 B |
| 1 | `agents/index.md` | 3,584 B | 3,253 B | 331 B |
| 2 | `agents/components/<slug>.md` | 1,800 B each | 909–1,725 B, median 1,177 | **75 B on `dropdown`**, the largest |
| 4 | `agents/pitfalls.md` | 16 KB | 14.7 KB | 1.3 KB |
| 4 | `agents/testing.md` | 12 KB | 9.9 KB | 2.1 KB |
| 4 | `agents/verify.md` | 8 KB | 5.8 KB | 2.2 KB |
| 4 | `agents/conventions.md` | 7 KB | 5.0 KB | 2.0 KB |

Bytes rather than KB in the top half, because bytes are what the generator compares and those margins
are thin enough that rounding hides them. **Every budget held, and only one was ever raised** — the
skill's, mis-sized by analogy with `AGENTS.md`, which has no frontmatter; see finding 1 under phase 4.

**Tier 2 is now the tight one.** `dropdown.md` has 75 bytes spare, down from 262 before phase 7 added a
`Root:` line to every file and three contract rows to that one. It is the first surface likely to need a
budget conversation, and the honest fix when it comes is cutting a `failureModes` entry rather than
raising 1,800 — the budget is what has kept these files answers instead of documents.

**The claim at the top of this file.** Tier 0 → Tier 1 → one Tier 2 file is **6.8 to 7.2 KB**, 7.0 KB for
`tabs`: about 1.8k tokens at four bytes per token, so *"under ~2k tokens"* still holds, with less room
than before. Read it as bytes rather than tokens — markdown tables tokenize worse than prose, and the
conversion is the soft part of that sentence, not the measurement.

**The map against the territory.** `AGENTS.md` + `agents/` + the skill is **98.7 KB across 42 files**,
against a `src/library/` of **1,832.9 KB** — 5.4%. Those 42 files are exactly what `check:agents` reports
matching, which is the cheapest available proof that nothing generated is unaccounted for.

**`agents/index.json` is 19.5 KB and is not on the read path.** It is the machine copy, for filtering the
roster; no agent reads it to answer a question. Phase 1 recorded it rendering to more than five times
`index.md`, and the contract blocks have widened that gap — still not a problem, for the same reason. It
is also where phase 7 put the one fingerprint in the layer, on the same argument: off the read path, so
bookkeeping there costs an agent nothing.

**What the layer cost to build.** The hand-written side is `docs/agents/` at 43.6 KB across five files;
the machinery is `scripts/build-agent-surfaces.mjs` at 43.8 KB and
`tests/shared/agent-surfaces.spec.mjs` at 31.0 KB, so rendering and checking the sources costs about 1.7×
the sources themselves — phase 7 moved that ratio from 1.4×, and all of the growth is in the spec.
Checking a claim against reality costs more than making the claim, which is the trade the whole layer is.
The rendering is close to 1:1 by design rather than by accident: the four
`.src.md` files total 39.3 KB and render to 35.4 KB, losing only the markers and the editorial headers,
because the split is on markers and the prose passes through byte for byte. `preamble.md` is the exception
in the other direction — 4.3 KB rendering to 7.6 KB, because it is rendered three times. Everything else,
the index and every Tier 2 file, comes from `meta.json`.

**`meta.json` grew more than the plan predicted** — 30 KB to an estimated ~50 KB, landing at **67.2 KB**
across the roster, of which the `contract` blocks are 29.0 KB minified. The estimate was low because
`failureModes` and `aria` run richer per component than the sketched example did. It still costs nothing,
for the reason the plan gave: an agent reads `index.md` and then one Tier 2 file, and neither is a
`meta.json`.

**Where the two records sit.** The contributor docs are **about 210 KB across six files** at the top of
`docs/`, against `agents/` at 95.4 KB across 40 — and **about 162 KB of that is `BUILD-STATUS.md` plus
this file**, the two an agent must never open. The audience split is not a matter of taste; it is 162 KB of
context that would otherwise be spent saying nothing about how a component behaves. `docs/agents/` is
excluded here and counted with the machinery above, being sources rather than record. Rounded, not
because the measurement is soft but because writing this paragraph changes the number it reports — the
one figure in this section that cannot be exact.

---

## Phase 2, as revised

Phase 2 had not started when this was written; what follows is the result of surveying all 33
components against the contract shape specified above. Two of the corrections matter enough that
implementing the original spec literally would have made the layer worse.

**1 · Drop `contract.pattern`.** `meta.json` already has `apg` with exactly that URL, in every
component that has one. A second field would be a second place for it to be wrong. The Tier 2 renderer
already reads `component.apg`.

**2 · Test 5 as specified is wrong — do not implement it.** It asserts that the number of
`failureModes` entries equals the number of `BROKEN ON PURPOSE` comments in `component.html`. Measured,
those comments are distributed like this:

| Comments | Components |
| --- | --- |
| 6 | `badge`, `data-table` |
| 3 | `button`, `chip-toggle` |
| 0 | `checkbox`, `disclosure`, `drawer`, `dropdown`, `effects`, `field`, and others |

A component with no deliberately broken demo still has failure modes — `dropdown` and `field` have
some of the richest in the library. The test would force `"failureModes": []` on exactly the
components whose traps are most worth writing down, and `failureModes` is the highest-value field in
the block. The two things it conflates are genuinely different: a *broken demo example* is a teaching
device on the page, and a *failure mode* is how the pattern goes wrong in the wild.

Replace it with two checks that hold:

- **`failureModes` is non-empty** for every component. Weak, but it stops the one field an author is
  most tempted to skip from being skipped.
- **every `seeAlso` slug resolves** to a real component folder. Mechanical, and a dead cross-link is a
  dead end for an agent that followed it.

Nothing is lost by dropping the count: the shared a11y gate already asserts every
`data-ac-demo-broken` element still fails the checks it claims, and Tier 0 already tells an agent never
to copy from inside one.

**3 · `contract.aria` means "what has to be in the markup you copy."** Test 2 runs in the browser, so
it can do subtree exclusion exactly — `el.closest('[data-ac-demo-broken]')` — against the initialized
demo DOM, scoped to `.demo` the way `tests/shared/a11y.spec.mjs` already is. The consequence is that
an attribute which only exists in a transient state (`aria-activedescendant` while open,
`aria-invalid` after a failed validation) must **not** be listed in `aria`; it belongs in `states` or
`failureModes`. That is the right rule for a copy-paste library anyway.

**4 · `api` has to allow more than one entry.** Eight components register more than one factory:

| Component | Registered on `global.AC` |
| --- | --- |
| `badge` | `createBadge`, `setBadge` |
| `jump-nav` | `createJumpNav`, `createJumpPage` |
| `live-region` | `createAnnouncer`, `speak` |
| `notice` | `createNotice`, `buildNotice`, `announceNotice` |
| `result-panel` | `createResultPanel`, `copyResult`, `setResult` |
| `status-text` | `createStatusText`, `setStatus` |
| `tabs` | `createTabs`, `createTabsPage` |
| `tooltip` | `createTooltip`, `createToggletip` |

Ten components register none at all — the CSS-only ones, identifiable by `files` in `meta.json`, where
test 4 is skipped.

**5 · Re-deriving the facts.** Registration is `global.AC.<name> = <name>` (not `window.AC.`), and each
factory returns an `api` object literal. Two greps give you everything phase 2 needs:

```sh
grep -rn 'global\.AC\.' src/library/components/*/component.js     # factory names
grep -rc 'BROKEN ON PURPOSE' src/library/components/*/component.html
```

`docs/component-specs.md` and each `docs.md` `## The contract` table are the prose seeds; roughly half
the components have the latter, and it is the better of the two where it exists.

---

## What phase 1 cost

Measured, against the budgets in the table above:

| Surface | Budget | Landed at |
| --- | --- | --- |
| `AGENTS.md` | 2.5 KB | 2.4 KB |
| `agents/llms.txt` | 2.5 KB | 2.5 KB |
| `agents/index.md` | 3.5 KB | 3.2 KB |
| `agents/index.json` | not budgeted | 15.6 KB |

Nine things the plan did not anticipate:

1. **`registry.mjs` could not be shared, so the group list moved.** It globs with `import.meta.glob`,
   which is Vite-only, and the generator validates `group` against the same list the site does. Two
   copies would drift, so `GROUPS` is now `src/site/lib/groups.mjs` — plain data, no imports — and
   `registry.mjs` re-exports it. Same pattern as `code-theme.mjs`, and the only file outside `agents/`
   the phase touched.
2. **The budgets are enforced by the generator, not just by a test.** It exits non-zero and names the
   overage in bytes. Written that way after Tier 0 came in at 3.4 KB on the first render: a warning
   would have been ignored. Three rounds of cutting got it under.
3. **Tier 0's copy contract is compressed to claims without their reasoning.** It is the block that
   pays for the budget. A reader who wants *why* is one hop from a component's `docs.md`, and phase 3's
   `agents/conventions.md` is where the expanded version belongs.
4. **`index.json` was 20.8 KB before scalar arrays stopped being pretty-printed** one tag per line —
   six times the markdown index it is an alternative to. Objects stay expanded; arrays of short strings
   collapse to one line. It is opt-in and the read path states its size, so 15.6 KB is a fair price for
   "every field", but it is not a routing surface.
5. **The index drops each component's `name`.** It is the title-cased slug in every component in the
   library, so it costs ~500 bytes across the roster to say nothing. Tags on more than a fifth of the
   roster are dropped too, and the index header names them — a *missing* `forced-colors` would
   otherwise read as "this one does not handle it."
6. **Both Tier 0 renderings and the index adapt to whether any `contract` exists.** No Tier 2 row in
   the read path, and the index says to read the code rather than a slug file that would 404. Phase 2
   is therefore a data-only change: add contract blocks, regenerate, and the rows appear.
7. **`llms.txt` is generated into `agents/` and copied to `public/llms.txt`.** The convention puts it
   at the root of a site; the generator keeps every surface in one folder. `sync-library.mjs` grew a
   single-file job type for it, and its `--watch` loop skips those — each one lives inside a folder
   another job already watches.
8. **The generator refuses mojibake in any source it reads.** PowerShell 5.1's
   `Set-Content -Encoding utf8` re-encodes a file it round-trips, turning every `—` into `â€"`. It got
   `preamble.md` and a `meta.json` during this phase and reached a generated surface before anything
   noticed — the only symptom was llms.txt growing 23 bytes. `â€` is a reliable signature, so
   `readSource()` throws on it and says to use `git checkout --`.
9. **The do-not-edit header is shorter than the plan's, and names the command.**
   `generated by npm run agents -- edit docs/agents/preamble.md or a meta.json`. It lands in every
   surface including the budgeted ones, and telling a reader how to regenerate beats listing the
   sources twice.

`--check` was verified against all five ways the surfaces can drift: a hand-edit to a generated file,
a `meta.json` edited without regenerating, a deleted surface, an orphan left in `agents/`, and an
unknown slot in the preamble. Each exits 1 and names the path.

---

## What phase 2 cost

| Surface | Budget | Landed at |
| --- | --- | --- |
| `AGENTS.md` | 2.5 KB | 2.4 KB |
| `agents/llms.txt` | 2.5 KB | 2.5 KB |
| `agents/index.md` | 3.5 KB | 3.2 KB |
| `agents/components/<slug>.md` | 1.8 KB | 0.8–1.5 KB, median 1.1 KB |
| `agents/index.json` | not budgeted | 18.4 KB (was 15.6) |

A component now costs an agent about **1.1 KB to answer**, after 2.4 KB of Tier 0 and 3.2 KB of Tier 1
— and Tier 0 and Tier 1 are read once per session, not once per component.

**1 · The 800-byte Tier 2 budget was measured against the wrong thing, and raising it was correct.**
It came from the 626-byte median of a `docs/component-specs.md` entry. But an entry is prose bullets;
a rendered contract also carries ~250 bytes of frame — the do-not-edit header, the folder line, the
WCAG and APG references — plus a keyboard map and a failure-mode list, neither of which a spec entry
had. Written out, the roster measured 0.8–1.5 KB. The only way to hit 800 was to delete
`failureModes`, which is the same mistake test 5 would have made for a different reason. The budget is
now the measured maximum rounded up, and the number is justified *in the source*, next to the
constant. Phase 1's rule — cut prose rather than raise a budget — still holds for Tier 0, where the
content is explanatory and compressible; a Tier 2 row is a fact and does not compress.

**2 · Tier 0 went over the moment Tier 2 existed**, by 70 bytes in `AGENTS.md` and 126 in `llms.txt` —
one read-path row in each. That is content, so the prose paid for it: `copying` lost its per-convention
reasoning, which is exactly where the preamble's own header says the pressure should land, and phase 3
gives that reasoning a home in `agents/conventions.md`.

**3 · `useWhen` replaced the keywords on an index row rather than joining them.** Adding a sentence to
33 rows would have put `agents/index.md` at ~5.5 KB against a 3.5 KB budget. But the sentence already
*contains* the routing words, so printing the tags beside it spends the roster's one shared budget on a
duplicate. A row now carries one or the other, and a component with no contract still falls back to
keywords — so the generator keeps working for a component added before its contract is written. This
made the index better, not just smaller.

**4 · Importing the generator executed it.** `TIER_2_BUDGET` is exported so the budget is stated once,
and the spec imports it — which ran the script's top-level `await main()` inside every Playwright
worker, in *write* mode, because a worker's `argv` has no `--check`. Several workers raced each other's
`rm -rf agents` and the losers exited 1, reported as `worker process exited unexpectedly`. Fixed with a
main-module guard. A module that does work when you import it is a trap for whoever imports it next.

**5 · The transient-attribute rule caught its author.** `loading-button`'s contract listed
`aria-busy=true` and `aria-disabled=true` under `aria`, and test 2 failed: they exist only while the
button is pending. That is precisely the rule written down in **Phase 2, as revised** — and writing it
down was not enough to follow it. They moved to `states`, which is where a state belongs. This is the
best evidence the check is worth having: it caught a real error, in the same session, in prose written
by the person who had just defined the constraint.

**6 · A contract's `aria` values are attribute tokens, not prose.** `role=tab`, `aria-modal=true`,
`tabindex=-1`, `scope=col`, `hidden` — anything the spec can turn into a CSS attribute selector. A
value is matched exactly only when it is a literal, so `aria-describedby` in a contract means "this
attribute is present", which is all an idref list can be asserted to be from outside. The consequence:
requirements about *elements* (`<caption>`, `<legend>`, `<fieldset>`) cannot live in `aria` and go in
`useWhen` or `failureModes` instead. Worth knowing before writing the next one.

**7 · `api` is a list, and the demo-page factories are not in it.** Eight components register more than
one factory. But `createTabsPage` and `createJumpPage` sit under a comment reading *"Everything below
is this page checking its own claims… delete it all when you copy"* — so they are deliberately absent
from the contracts. A single-entry `api` renders inline; two or more render as a list.

**8 · Two of the seven mutation probes were wrong before the tests were.** The first ARIA probe used
`String.replace`, which takes the first match only, and the `tabs` demo ships several strips — so the
remaining tablists satisfied the check and the probe reported a false negative. The first
`failureModes` probe left one entry in place, which is not empty. Both tests were right. A probe that
does not mutate anything real is indistinguishable from a test that cannot fail, which is the reason to
read what a green probe actually did.

**Verified:** `check:tokens` 34 files clean · `check:agents` 37 surfaces match · `npm run build` 35
pages · **chromium 1120/1120** (phase 1 was 1046; the 74 new tests are the difference) · **firefox
74/74** on the new spec. **Webkit could not run**: its browser binary is not installed on this machine
(`Executable doesn't exist … webkit-2336`), which is why only the tests needing a browser failed and
the `request`-fixture ones passed. Pre-existing and unrelated to any contract — CI installs chromium
only and runs `--project=chromium`, so the firefox and webkit projects execute nowhere but a local
machine that has them. Installing the other two browsers is already an item under **4. Final
verification**.

---

## What phase 3 cost

| Surface | Budget | Landed at |
| --- | --- | --- |
| `AGENTS.md` | 2.5 KB | 2.4 KB (124 bytes spare) |
| `agents/llms.txt` | 2.5 KB | 2.4 KB (65 bytes spare) |
| `agents/pitfalls.md` | 16 KB | 14.7 KB, 26 entries in 8 groups |
| `agents/testing.md` | 12 KB | 9.9 KB, 22 entries in 5 groups |
| `agents/verify.md` | 8 KB | 5.8 KB, 17 entries in 3 groups |
| `agents/conventions.md` | 7 KB | 5.0 KB, 11 entries in 6 groups |

The four Tier 4 rows above were first written as 15.0, 10.2, 6.0 and 5.1 KB — the recorded byte counts
(15,018 · 10,183 · 5,989 · 5,107) divided by 1000, while the Budget column and the generator both use
1024. Corrected against the files on disk. Worth knowing because the mistake is invisible: every value
was plausible, internally consistent, and wrong in the same direction.

`docs/BUILD-STATUS.md` went from **118.1 KB to 91.9 KB**, and its gotchas list from 69 entries to 19.

Eight things worth keeping:

1. **The count in "Phase 3, prepared" was wrong.** It says 62 entries; a mechanical count says **69**,
   splitting 28 → pitfalls, 21 → testing, 20 → local. The classification itself held up entry for
   entry — only the total was off, because it was counted by hand while reading. Recorded rather than
   quietly corrected, because the lesson is that a hand count in a design record is worth re-running
   before anything depends on it, and this one was about to size a budget.
2. **69 entries became 65 rendered ones.** The duplicate collapsed, the two tab-stop entries merged
   into one, and the three "a modifier that never applies" entries — which `BUILD-STATUS.md` itself
   calls members of one family — became a single pitfall with three mechanisms. The two observation
   *tails* the prepared section said to cross-reference rather than repeat (`<output>` cannot be found
   with `el.role`, `ariaSnapshot()` does not report a table demotion) merged into one testing entry.
   Consolidation was the largest single quality gain in the phase: a build log accretes near-duplicates
   because each one was true on the day it was written.
3. **Tier 0 went over on the first render, by exactly the amount forecast** — 73 bytes in `AGENTS.md`,
   132 in `llms.txt`, one new read-path row each. The prediction that there was no prose headroom left
   was right, and the way out was not more cutting but the consolidation phase 1 had already planned
   for: `copying`'s three "which…" clauses were the compressed reasoning, `conventions.md` now holds
   the real reasoning, so the clauses became a pointer. Tier 0 keeps every claim and lost only the
   explanations that now have a better home. **A budget that has to be paid for twice is a sign the
   content wants to move, not that the budget is wrong.**
4. **One grouped read-path row was the right call and would have been even if Tier 0 were roomy.** Four
   rows would have spent ~600 bytes routing between four files whose names already route. The row cost
   156 bytes and quotes the largest single file, because one fetch is what a reader actually pays.
5. **The four surfaces needed a format, and it had to be markers.** `<!-- lede -->`,
   `<!-- group: … -->`, `<!-- item: Title · 4.1.2 -->`, split on the markers only. Success criteria are
   optional, and that is load-bearing: about a third of the pitfalls are *mechanisms* — how a failure
   gets introduced, like a modifier that never applies — and inventing a criterion for those would make
   every real tag less trustworthy. The generator checks the shape of the ones that are there
   (`4.12` for `4.1.2` renders as a plausible tag and is wrong forever).
6. **A self-describing format makes its own markers non-unique, and that broke a probe.** Each
   `.src.md` explains its markers in the editorial header, so `String.replace('<!-- lede -->', …)` hit
   the *documentation* and left the real marker intact — the probe came back green against a check that
   works. Second time in this project a first-match-only replace produced a false negative; the fix is
   a line-anchored `^…$` regex. **A green mutation probe is a claim about the probe until you read what
   it changed.**
7. **A `[MARKER]` reference in prose is machine-checkable, and prose in general is not.** The surfaces
   earn their keep by naming the component that has each fix live — `badge`'s `[NAME]`, `effects`'
   `[PATCH]`, `loading-button`'s `[FORCED]` — and a rename would break those silently. Two new tests
   check the possessive form (`` `slug`'s ``) against the roster and each `[MARKER]` against that
   component's CSS and JS. A third asserts the regexes still match something, because a pattern over
   prose that stops matching passes forever. Widening past the possessive was tried and rejected: it
   catches every backticked CSS property in the file.
8. **The dangling references were in the entries that stayed.** Deleting 50 entries left three
   survivors pointing at "the gotcha below" and "the focus probe above". Nothing checks cross-references
   inside a markdown file, and they were only found by grepping for `above|below` afterwards — worth
   doing as a step rather than hoping.

**Verified:** `check:tokens` 34 files clean · `check:agents` 41 surfaces match · `agent-surfaces`
**77/77 on chromium** (74 before; the three new tests are the difference). Ten mutations proved the new
machinery can go red: a removed lede, a duplicate lede, an item before any group, prose under a group
marker, an item with no body, an unknown marker kind, a malformed success criterion, a source edited
without regenerating, a source pushed over its byte budget, a pitfall naming a component that does not
exist, and a pitfall pointing at a renamed source marker.

---

## What phase 4 cost

| Surface | Budget | Landed at |
| --- | --- | --- |
| `.claude/skills/a11y-library/SKILL.md` | 3 KB | 2.8 KB |

Nothing else moved. The skill adds no read-path row, so `AGENTS.md` and `llms.txt` are byte-identical to
what phase 3 left — the one phase so far that cost Tier 0 nothing.

That row first read 2.7 KB, which was 2,767 bytes — the size in the generator's own budget-failure
message, quoted before the audience note was rewritten later in the same phase. The shipped file is 2,831
bytes. Corrected in phase 6; see finding 1 there.

Seven things worth keeping:

1. **The budget was mis-sized by analogy, and about 600 of its bytes cannot be cut.** 2.5 KB came from
   `AGENTS.md`, which has no frontmatter. The skill's *body* is the leanest of the three renderings — it
   drops `copying`, whose Tier 4 row reaches the same reasoning at greater length, and one intro
   paragraph — but the `description` is ~600 bytes whose entire job is keyword coverage, so cutting it
   is cutting the routing. Phase 1's rule, cut prose rather than raise a budget, does not reach a string
   that is read by a matcher instead of a person. The raise is 3 KB, the measured size rounded up,
   leaving room for about two more read-path rows. One real cut happened anyway: the audience note
   opened *"Two audiences, and this is the consuming one:"*, which was throat-clearing, and the budget
   failure is what made anyone look at it.
2. **Ownership inside `.claude/` has to be by signature, not by location** — this is warning (b), and
   the obvious fix for it was wrong. `agents/` is owned wholesale because everything in it is output.
   `.claude/skills/` cannot be: `settings.local.json` sits beside it and someone may add a skill of
   their own, which walking the folder would report as an orphan. So `ownedOnDisk()` claims a file
   there only if it carries the do-not-edit marker. Proven in both directions — a leftover generated
   `SKILL.md` at a renamed path is reported, and a hand-written sibling skill is left alone.
3. **Frontmatter inverts the file's opening, and the YAML needs quoting.** Every other surface starts
   with the do-not-edit comment; here it comes second, because a file that does not open with `---` has
   no frontmatter as far as the loader is concerned and a skill with no `description` never triggers —
   silently, looking exactly like a description that failed to match. The description itself is written
   as a YAML single-quoted scalar, the one form that needs no thought about content: everything inside
   is literal and only `'` escapes, by doubling. Unquoted, its first colon would be read as a key. It
   also carries a 1,024-character ceiling enforced by the generator, because the description is always
   in context while the body is read only once the skill fires.
4. **The skill is where the two audiences collide, and the first attempt got the boundary wrong.**
   `CLAUDE.md` says to read `docs/BUILD-STATUS.md` first; Tier 0's rules say never to. Both are right
   for their reader, and this is the one surface where the same agent sees both, because Claude Code has
   `CLAUDE.md` loaded already. The note first said the rule was *inverted* for a contributor — "those
   two are your files" — which reads as an invitation to look up a component in a build log. It is not
   an inversion. Working on the library changes where the *conventions* come from, `CLAUDE.md`, and
   nothing else; a component's behavior comes from `agents/` and the component's own files for everyone,
   contributor included. `docs/BUILD-STATUS.md` is a progress log and answers nothing about a component,
   so it now appears in exactly one place across every agent surface: the rule forbidding it. Phase 5
   generalizes the split, and this is the sentence it has to keep.
5. **Two Tier 0 claims had never been checked, and one was load-bearing since phase 1.** The `rules`
   slot names `docs/BUILD-STATUS.md` and `CLAUDE.md`; nothing asserted either exists. Rename one and
   Tier 0 forbids a file that is not there while the skill sends a contributor nowhere. A new test
   scans all three renderings for backticked verbatim `.md` paths and asserts each resolves —
   retroactive cover for phase 1. Templates are skipped (`<slug>`, `{docs.md,meta.json}` name no single
   file), and the check is `.md`-only because `llms.txt` is written bare in prose while living at
   `agents/llms.txt`. The report is deduplicated: the skill names `CLAUDE.md` twice, in the audience note
   and again in the rules, and one fix covers both.
6. **The one failure that would have been total and silent is a gitignored skill.** Every other check
   here would still pass, `--check` included, and the skill would simply never reach a clone. The design
   record has claimed since phase 0 that `.gitignore` excludes only `.claude/settings.local.json`;
   `git check-ignore -q` in the spec is what now holds it to that.
7. **Third first-look-green probe in this project, and this time the probe had not run at all.**
   `execFileSync('npx.cmd', …)` is `EINVAL` on modern Node — spawning a `.cmd` without a shell — so
   `err.status` came back `undefined`, the probe's `code !== 0` read that as a failing test, and both
   spec probes reported RED against an empty report. Fixed by running
   `node_modules/@playwright/test/cli.js` through `process.execPath` and by throwing when `status` is
   undefined. The lesson is the same one phases 2 and 3 each learned by a different mechanism, and it
   now has a sharper form: **a probe that reports RED without printing the failure has not run.**

**Not done, deliberately:** the skill is not published to `public/`, so `sync-library.mjs` is untouched.
Claude Code loads a skill from `.claude/` in a checkout and never over HTTP, and an agent that fetched
the site reads `llms.txt` — the same slots through a different frame. Publishing it would be a fourth
copy of Tier 0 that nothing would ever fetch. That reasoning still holds; what it did not anticipate is
that a checkout is not the only way a *local* skill is loaded — see **Installing out**.

**Verified:** `check:tokens` 34 files clean · `check:agents` **42 surfaces match** · `npm run build` 35
pages · **chromium 1125/1125** (1123 before; the two new tests are the difference). Eight probes: a
`skill-description` over the character ceiling, a hand-edited `SKILL.md`, a leftover generated skill at
a renamed path, a hand-written sibling skill that must *not* be flagged, `settings.local.json` surviving
write mode, an apostrophe escaped into the YAML scalar, Tier 0 naming a file that does not exist, and
the skill excluded by `.gitignore`.

---

## What phase 5 cost

No surface moved — this phase edited two hand-written files, `CLAUDE.md` and `README.md`, and added one
test. Six things worth keeping:

1. **The duplication was measured before it was resolved, and the measurement reversed the decision.**
   The first read of it — from memory, across two files not open side by side — was that all eleven
   entries in `agents/conventions.md` were restated in `CLAUDE.md`, which pointed at stripping
   `CLAUDE.md` down to a pointer. Read properly, the two diverge exactly where they should:
   `CLAUDE.md` carries the linter contract, the `--bg-elev` incident and the shapes a contributor types;
   `conventions.md` carries the consequences for someone else's page ("one of the few things a paste does
   **not** bring with it"). The genuine overlap is three CSS snippets and about seven one-line rule
   statements. Deleting the section would have cost the linter's context to remove eight sentences.
2. **So the resolution is a check, not a deletion**, and that is the right shape for this specific case:
   two documents for two readers whose *rules* must agree while their *framing* must not. Two of the
   three shared snippets were already byte-identical and the third differed only by a trailing
   semicolon — evidence they had not yet drifted, and that the risk is a token name, a percentage or a
   duration changing in one file only.
3. **`CLAUDE.md` is canonical, and the extraction is anchored on a heading.** The test reads the fenced
   `css` blocks under `## Non-negotiable conventions` and asserts each declaration appears in
   `docs/agents/conventions.src.md`. Canonical because a contributor changing a convention is editing
   `CLAUDE.md`; heading-anchored because parsing the prose is the mistake this project already refused
   once. It carries its own vacuity guard — a renamed heading leaves nothing to compare, so the test
   fails on an empty extraction rather than passing over it. That guard was probed, and it is the third
   surface in this layer to need one.
4. **The routing bug was the phase's most concrete defect and predates the whole layer.**
   `CLAUDE.md`'s table sent anyone wanting "the ARIA contract + keyboard map for a specific component" to
   `docs/component-specs.md` — a *pre-build* planning document, written before the components existed,
   with no entry at all for `disclosure`, `dropdown` or `field`, and rejected as a machine source in the
   problem statement at the top of this file. `agents/components/<slug>.md` has been the generated,
   test-asserted answer since phase 2 and nothing pointed at it. Both files now have a row saying what
   they are actually for: the contract, versus the up-front design decisions and CSS gotchas that the
   contract does not carry.
5. **The "three homes" rule had a hole exactly where this phase landed.** It routed platform facts,
   harness facts and repo trivia, and said nothing about a fact concerning what a copied component
   assumes — which is `conventions.src.md`. It is four homes now, and it no longer claims nothing checks
   for the overlap, because one overlap is checked and being precise about which is the difference
   between a rule and a slogan.
6. **`CLAUDE.md` names a machine-local path and always has.** The last row of its table points at
   `C:\Users\kasey\.claude\plans\this-will-be-a-curious-pnueli.md`, which no other clone has. Left
   alone deliberately: it is a personal archive, `docs/agent-layer.md` is the in-repo record that
   replaced it, and it is also why the Tier 0 path-existence check from phase 4 was **not** extended to
   `CLAUDE.md` — the check would pass on this machine and fail in CI, which is worse than not checking.

**Verified:** `check:tokens` 34 files clean · `check:agents` 42 surfaces match · `npm run build` 35
pages · **chromium 1126/1126** (1125 before; the new test is the difference). Three probes: the accent
mix percentage changed in `CLAUDE.md` only, the motion token renamed in `conventions.src.md` only, and
the anchoring heading renamed so the extraction finds nothing.

**Still open, and a candidate for phase 6:** `README.md`'s markdown links are unchecked, so a moved
`docs/at-support.md` or `docs/authoring-a-component.md` breaks silently on a public page. Different shape
from the backticked-path check phase 4 added — links, not inline code — so it is a small separate test
rather than a widening. *Closed in phase 6, which had to add a link to that file and would otherwise have
been documenting a gap while widening it.*

---

## What phase 6 cost

Two hand-written files edited (`README.md`, `docs/BUILD-STATUS.md`), five misroutings and one omission
fixed in `scripts/new-component.mjs`, one test added. No generated surface moved, so `check:agents` was 42
both before and after. Seven things worth keeping:

1. **A per-phase cost table went stale inside its own phase, and the stale number came from an error
   message.** Phase 4 recorded `SKILL.md` at 2.7 KB — 2,767 bytes, which is the figure the generator
   printed when the file blew its budget, *before* the audience note was rewritten later in that same
   phase. The shipped file is 2,831 bytes. This is warning (a) in miniature and it is worse than a table
   drifting over time: **a number lifted from a failure message describes a file that no longer exists.**
   Measure the artifact, and measure it after the last edit.
2. **Every arithmetic error in this record came from doing it by hand, and every one was caught by a
   script.** Phase 3's four rows used KB = 1000 while the budgets used 1024; phase 4's row was stale;
   "Phase 3, prepared" counted 62 gotchas where there were 69. Three mistakes, three phases, one
   mechanism. Phase 6's numbers come from `stat` in a loop, which is why the tightest Tier 2 margin
   (`dropdown`, 262 bytes) is in the table at all — nobody would have looked for it by hand.
3. **The design's headline claim had never been tested against a file.** *"Under ~2k tokens"* has been at
   the top of this document since phase 0. Tier 0 → 1 → 2 measures 6.4–7.1 KB, so it holds at roughly
   1.7k tokens — with less room than the sentence implies, and only because Tier 2 came in at a median of
   1.1 KB against a 1.8 KB budget. A claim that survives six phases without being measured is a claim
   nobody has checked.
4. **Phase 6 was told to record a gap and instead had to close it, because its one required edit widened
   it.** Point (e) said to leave `README.md`'s unchecked links open. But the phase's single mandated change
   *is* a new link in `README.md` — a fourth unchecked in-repo target on the repository's most-read page. Writing
   "these are unchecked" while adding to them is not recording a gap, it is signing off on one. The test is
   40 lines. The generated surfaces need no equivalent: every markdown link under `agents/` points outward
   at a spec, so this is a hand-written-file problem only, which is what phase 5 had already said.
5. **That test needs the same exclusion phase 5 argued for, and the interesting probe is the inverted
   one.** `README.md` links `../theme-service`, outside the repo. Checking it would pass on a machine with
   the sibling checkout and fail in CI — the reason phase 4's path check was never extended to `CLAUDE.md`.
   So targets that escape the root are skipped, and the probe that matters points the sibling link at
   something that does not exist and asserts the check *stays quiet*. Two ordinary probes went red (a moved
   target; every in-repo link stripped, which must fail on the vacuity guard rather than pass over an empty
   list) and the inverted one stayed green.
6. **Two files still carried what phase 5 corrected elsewhere, and both were found by reading rather than
   by any check.** `BUILD-STATUS.md`'s item 5 still said the accessibility findings have *three* homes and
   that *nothing checks for the overlap*; phase 5 made it four and added the check, in `CLAUDE.md` and in
   this file, and left the third copy alone. And `scripts/new-component.mjs` still sent a new component's
   author to `docs/component-specs.md` for "the contract to build to" — the misrouting phase 5 fixed in
   `CLAUDE.md`'s table — in **five** places: its own header, the `component.html` copy map, the
   `component.js` core comment, the spec template's assertion comment, and the numbered next steps it
   prints, whose step 1 was *"read the `<slug>` entry in `docs/component-specs.md` and build to it"* for a
   slug that by definition has no entry. So **every component scaffolded since phase 2 was seeded with a
   pointer to a pre-build planning
   document that has no entry for three of the components already shipped.** The lesson is not the fix, it
   is the sequence: the first grep found two, they were fixed, and only a second and wider grep found the
   other three. **Grep for the pattern, not for the instance you noticed** — and a fact stated in five
   places gets corrected in two.
7. **The scaffolder never told anyone to regenerate, and had not since phase 1.** Its printed steps went
   `check:tokens` → `build` → `playwright` → tick the roster, with no `npm run agents` anywhere. Follow
   them exactly and the new component has no Tier 2 file, so `check:agents` fails at the end of a session
   that thought it was finished — and the read path would have sent an agent to a file that is not there,
   which is the coverage test's own reason for existing. Phase 1 added the generator, phase
   2 added the obligation, and neither went back to the one script whose whole job is telling a new author
   what to do. This is the phase 7 gap in its cheapest form — a component change with no agent-side
   follow-through — and the fix was one line of output.

**Verified:** `check:tokens` 34 files clean · `check:agents` 42 surfaces match · `npm run build` 35 pages ·
**chromium 1127/1127** (1126 before; the new test is the difference).

**Deliberately not done:** `scripts/new-component.mjs` does not yet scaffold an empty `contract` block.
That was a phase 7 bullet already and phase 7's design decided the shape — it scaffolds the three
required fields and leaves the rest to the checks. What phase 6 did to that file is routing and
instructions only — five wrong pointers, and the missing `npm run agents` step — which cost nothing to
fix now and pre-empted nothing.

---

## What phase 7 cost

**1 · The convention the whole design rested on was not real, and one query said so.** The plan scoped
the ARIA check to `.ac-<slug>`, which reads like a rule this repo enforces. It holds for 15 of 33
components. The other 18 anchor on an abbreviation — `checkbox` is `.ac-choice`, `text-input` is
`.ac-input`, `icon-button` is `.ac-btn-icon`, `status-text` is `.ac-status` — and `dropdown` had no
`ac-dropdown` class in its markup at all: it was a `<select>` carrying `[data-ac-dropdown]`, and the
factory built the rest at runtime. (It is authored markup now, and `.ac-dropdown` is real — but the
point stands for the other 17.) A check scoped that way would have swept nothing for more than
half the library **and reported it as a pass**. It cost one query to find and reshaped the phase, adding
`contract.root` and 33 declarations. The lesson is not "check your assumptions" but something narrower:
**a convention stated in `CLAUDE.md` is a rule for new code, not a description of old code.** The
`ac-<name>__<part>` rule is real; `<name>` was never promised to be the slug.

**2 · An early probe misfiled real component parts as demo scaffolding, and nearly hid the finding
above.** Bucketing unclaimed ARIA by "is it inside `.ac-<slug>`", the first sweep put `checkbox`'s
`.ac-choice__input` and `radio-group`'s `.ac-group` in a bucket labeled *demo scaffolding* — 60 hits that
looked like noise and were substantially real. The bucket names came from the assumption, so the output
confirmed it. What broke the loop was a different question — *how many components have a `.ac-<slug>`
element at all* — whose answer had no room for interpretation. **When a probe's categories come from the
hypothesis, it can only agree with you.** Ask something countable instead.

**3 · The checks found 14 real omissions, and the two best were already written down for humans.**
`tabs` supports a vertical strip: its JS reads `aria-orientation` and swaps the arrow keys, its spec
presses ArrowUp and ArrowDown, and `docs.md` has a table row explaining it. `dropdown`'s `docs.md`
documents Space and Tab in its keyboard table. In both cases only the contract was silent, so the
agent-facing file said `tabs` responds to ArrowLeft and ArrowRight and nothing else. **That is the
requirement's exact scenario — the human side current, the agent side not — sitting in the library
already, twice.** It is also the answer to whether the gap was hypothetical.

The other 12: `aria-describedby` on `dropdown`'s trigger and `switch`'s input, `aria-label` on `notice`'s
icon-only dismiss button, `aria-invalid` on four controls, `role=switch`/`aria-checked` on `chip-toggle`'s
switch variant, `aria-live` on `visually-hidden`'s region, `role=status` on `checkbox`'s running count and
`motion-preferences`' readout, `aria-labelledby` on `fieldset-group`'s div-based group, and `aria-disabled`
on `result-panel`'s copy button.

**4 · Two checks handed work to each other, which is the coupling behaving correctly.** Adding
`dropdown`'s Space and Tab to the contract made check 3 fail — a documented key must be pressed by the
component's own spec — so the phase also wrote the two tests that never existed for keys the component
has always handled. Neither check is interesting alone. Together they close the loop: the JS obliges the
contract, and the contract obliges the spec.

**5 · The guard found two roots I drew too small, which is the guard being worth having.** Requiring that
the scope contain at least one attribute the contract *does* claim caught `loading-button` (its
`role=status` region is a sibling of the button) and `skip-link` (its `aria-label` is on the nav around
the links). Both were fixed by widening `root`. It also fired on `checkbox`, correctly and uselessly —
its entire `aria` block is `type=checkbox` and `for`, no ARIA at all — so the guard now applies only where
the contract names something it could find. **A guard that never fires is decoration; one that fires
where it cannot apply is noise. This one needed both edges.**

**6 · `process.exit(1)` inside a `try` skips the `finally`.** The first red-probe run hit a bad anchor,
exited, and left `disclosure/component.html` patched. Nothing was lost — the patch was one attribute and
`git status` showed it — but a probe that breaks files on purpose has to restore them on *every* path.
Throw, do not exit.

**7 · The verification run found a flake that was never phase 7's, and it had been there all along.**
`effects › contrast holds in every theme` failed, then failed again on a *different element in a
different theme* — the signature of a value measured mid-flight. `tests/shared/a11y.spec.mjs` sets
`data-theme` and calls axe in the next statement, while `.sidebar__link` and `.code-tab` transition
`color` and `background-color`, so axe read a color part-way between two themes that both pass. Nothing
in this phase touches the shell, the themes or that test; it is timing, which is why 1127/1127 held
before. Fixed in the test by disabling transitions for the sweep. The stylesheet's own half of it —
those transitions are not behind the motion gate — is a human-page file and is recorded under **Still
open** rather than changed.

**8 · Tier 2's margin is now 75 bytes.** `dropdown.md` went from 262 bytes spare to 75: a `Root:` line on
every file, plus that component's three new contract rows. Recorded in **What the layer costs, measured**
rather than acted on, because the budget is doing its job — but the next contract row anywhere near
`dropdown` will need something cut, and cutting is the intended response.

**Verified:** `check:tokens` 34 files clean · `check:agents` 42 surfaces match · `npm run build` 35 pages ·
**chromium 1164/1164** (1127 before; +33 for check 12, +2 for checks 13 and 14, +2 dropdown specs).

---

## Phase 3, prepared

Written before any of it moved, and kept as the record of what was decided. The count is wrong — see
finding 1 in **What phase 3 cost** — but every classification below held.

The sequencing constraint it names was the right one: **do the additive half first** (write the
`.src.md` files, render, confirm), and only then delete from `BUILD-STATUS.md`. Half-moved gotchas live
in two places at once, which is the exact drift this design exists to prevent, and it is the one
interruption that would leave the repo worse than untouched.

Measured: **62 entries**, splitting about **30 transferable · 22 harness · 17 repo-local** — close to
the estimate in the phase list, and the file has grown since that estimate was made.

**The duplicate is real and confirmed.** `docs/BUILD-STATUS.md:1104` and `:1315` are both the
`[glob-loader] Duplicate id "<slug>"` stale-`.astro`-cache entry, written twice with different
wording. Keep one. Note that they disagree on a detail — one says the warning appears on the *second*
build after a `docs.md` is created, the other on the *first* build after a scaffolded one is filled in.
Neither is obviously wrong; say "after a `docs.md` is created or replaced" and drop the ordinal.

Topic groups for `pitfalls.src.md`, which is where the accname and forced-colors findings carry the
most weight: **names and labels · live regions · focus · forced colors · targets · CSS cascade ·
tables and reflow**.

The classifications that were judgment calls, so they are not re-argued:

- **Accname findings go to pitfalls, not testing**, even where a test found them. "A live region is not
  part of an ancestor's accessible name", "CSS generated content is part of the accessible name" and
  "`<output>` has an implicit `role=status`" are facts about the platform. Each carries a testing tail
  (how to observe it) that belongs in `testing.src.md` and should cross-reference rather than repeat.
- **`el.disabled` inside `<fieldset disabled>`** is a pitfall, not a harness note: the DOM fact and
  `:disabled` as the fix are what transfer. That it also caught the gate is an aside.
- **The empty-live-region and `[hidden]`-has-no-name traps are harness entries**, because the finding is
  that the *obvious assertion fails on correct markup*. The component-side rule they imply — keep the
  region rendered and empty — is already the `live-region` and `field` contracts.
- **"A misspelled theme token goes quiet" transfers in its general form** — a typo in a `var()` fallback
  chain resolves to the literal and never errors — even though `check-tokens.mjs` is local.
- **Stays local:** the mojibake trap, Node's PATH, npm 11's install-script gate, Git 2.24, Astro's
  `srcDir` and `import.meta.glob`, the `<Code>` shiki split, `site.css` load order, `tokens.css` not
  being linked, the readout-key rule, the screenshot recipe, header-height measurement, and the
  broken-example conventions (`[FORCED]` opt-out, blanket fixes reaching a broken variant). These are
  about working *on* this repo.
- **Two entries correct earlier entries in the same file** — `display:block` on a table not dropping its
  role, and Chromium's free tab stop going to `auto`/`scroll` but not `hidden`. Move the corrected
  version only, and do not carry the superseded claim into a surface an agent reads.

---

## Rules for the generated surfaces

Two conventions from `CLAUDE.md` are easy to break here and worth restating, because the generator
writes prose:

- **Never count the components.** No "34 components", no derived totals, in `AGENTS.md`, `llms.txt` or
  the index header. The roster changes; the copy should not need editing when it does. Say what the
  library *is*.
- **American English**, and say it once. The budgets are the point — a Tier 2 file that explains itself
  twice has spent an agent's context on nothing.

---

## Phase 7 — the coupling, as built

Requested verbatim: *"add a pattern when any of the components are updated, that the agent side of the
component knowledge is also updated. That way the agent's information stays in sync with the human
information. The UI is where the information would be updated, so the agents' documentation needs to be
updated to match."*

**Designed after phases 2–6, not before** — phase 2 defines the contract block, and the contract block
is what a component edit has to keep in step, so designing the coupling first would have been guessing at
its own input.

**The gap it closes.** `check:agents` couples `meta.json`, `docs/agents/preamble.md` and the four
`docs/agents/*.src.md` files to the generated surfaces — those are every file the generator reads. It
never opens `component.html`, `component.css` or `component.js`. Phase 2's tests 2–4 assert a contract
against the real markup, the real spec and the real `global.AC` registrations, and phase 3 added two
checks reaching into component files from the other direction. **What none of them covered is a component
whose new behavior nobody documented** — they verify claims, and silence makes no claim. So the shape of
phase 7 is the reverse of phase 2: read the component, report what the contract does not admit to.

**What shipped**

- **`contract.root`** — the selector(s) that *are* the component. New required field, on all 33. Every
  ARIA check scopes to it. Not optional and not derivable; see finding 1 below.
- **Check 12 · ARIA in the markup that no contract mentions.** In the browser, because the attributes
  most worth catching are the ones a factory sets at runtime, and an attribute that lands on an element
  has a DOM position `closest()` can classify — statically there is no way to tell a component's own ARIA
  from the demo-page wiring in the same file. Excludes `[data-ac-demo-broken]` subtrees and any nested
  component's root. `aria-hidden` is exempt: every instance is decorative, which is a library-wide
  convention rather than a fact about one component. **That exemption runs one way** — a contract may
  still name `aria-hidden`, and test 2 asserts it when one does — so it can make a contract silent about
  decoration, never wrong about it.
- **Check 13 · keys `component.js` handles that no contract names.** Static, comments stripped, because
  comments are where a component argues about the key it deliberately did *not* bind.
- **Check 14 · factories on `global.AC` that no `api` claims.** Exempts the `create<Name>Page` suffix,
  turning an undocumented practice into a convention this check now enforces.
- **The `summary` → `useWhen` receipt.** An eight-character hash of each `summary` in
  `agents/index.json`, and a drift report that names the component and the field. The one edit the
  requirement literally names, and the only one no structural check can see.
- **The obligation as a table** in `CLAUDE.md` > **Component folder shape**, and the pre-commit list in
  `docs/authoring-a-component.md` extended with `npm run agents` and the `agent-surfaces` run.
- **`scripts/new-component.mjs` scaffolds a `contract` block** with the three required fields, and its
  printed steps say the suite will name whatever is missing rather than listing it up front.

**Rejected: fingerprinting every component file.** The plan carried it as the leading option — a hash of
`component.{html,css,js}` + `docs.md` per component, so any edit fails `check:agents` until someone
regenerates, putting both changes in one commit by construction. It was rejected once the three checks
above existed. It fires on a CSS tweak that changed no contract, and its fix is a regeneration nobody has
to read — which trains exactly the reflex the other three depend on people not having. The reverse checks
cover the agent-visible surface directly and stay quiet otherwise. A content hash as a **cache key** for
fetch-based agents is still worth having and is deferred with the MCP server, which is the consumer that
would justify it.

**Rejected: a static ARIA scan of `component.js`.** It would catch an attribute the component only
*reads* — `tabs` picks its arrow keys from an `aria-orientation` no demo sets. Measured: 16 hits, 12 of
them demo-page wiring, and cutting the `create*Page` factories removed only 2, because demo wiring lives
in dozens of top-level helpers (`say`, `out`, `watch`, `logAdd`) with no naming convention. All
exemption, no signal. `tabs` was fixed by hand instead and the limitation recorded under **Still open**.

**Rejected: a path-based CI check** — fail a PR that touches `src/library/components/` without touching
`agents/`. Rejected on first look and never revisited: it needs a base ref, so it does not work locally
or on a direct push, and touching any unrelated file under `agents/` satisfies it.

---

## Installing out

The three arrival paths — a checkout reads `AGENTS.md`, a fetcher reads `llms.txt`, Claude Code loads
the skill — all assume the agent is already at the library. The consuming case is an agent in a
different repo, where a committed `.claude/skills/` never loads. `scripts/install-skill.mjs` closes it.

| Decision | Choice | Why |
| --- | --- | --- |
| Install mechanism | junction (Windows) / symlink, `cpSync` fallback | a linked skill tracks `npm run agents` with no re-run; the fallback reports itself, because a copy is the install that goes stale |
| Read-path resolution | `repo` from the config, then `baseUrl` over HTTP | the clone is exact and needs no network; the URL survives a moved clone |
| Config | `~/.claude/a11y-library.local.json`, `{ repo, version, baseUrl, history[] }` | same idiom as `theme-service` — one install pattern across both repos |
| Shared constants | `SKILL_NAME`, `SKILL_OUT`, `CONFIG_FILE`, `readBaseUrl` exported by the generator | the skill *names* the config the installer *writes*; one owner means a rename cannot half-succeed |
| Non-Claude agents | `--into <dir>` writes a marked, idempotent block to `<dir>/AGENTS.md`; `--print` to stdout | `AGENTS.md` is the one cross-agent convention that exists; the block routes and defers to it for the tiers |
| Block trigger text | read from the generated `SKILL.md` frontmatter at install time | keeps it rendered from `docs/agents/preamble.md` — no fourth copy of Tier 0 |
| Skill budget | 2,831 → 2,918 B against 3,072 | unchanged |
| Rejected | `npx` from GitHub | needs the package published or a git-URL `bin`; the premise is a clone. `repository` and `homepage` are now set, which is what it would need first |

**The failure mode this is built against.** A renamed config leaves the skill naming a file nothing
writes. Nothing errors, and the HTTP fallback silently becomes the only path an installed skill has.
The shared constants prevent the rename; the spec check *the skill names the config the installer
actually writes* proves the sentence naming it is still rendered.

This section is a table where the phase records around it are prose. That is deliberate — it is a set
of decisions, not a narrative.

## Still open

Four things this work found and did not close.

**An attribute a component only *reads* is invisible to every check here.** `tabs` takes
`aria-orientation` as an input — nothing sets it, the JS branches on it — so check 12 cannot see it in
the DOM and the static scan that would catch it was rejected as all-exemption (see **Phase 7 — the
coupling, as built**). It was documented by hand, in `states`. Any future knob of that shape has to be
too: a configuration attribute the component consumes rather than produces has no mechanical trace, and
the honest position is that the coupling covers what a component *does*, not what it can be told.

**The shell's color transitions are not behind the motion gate.** `src/site/styles/site.css` transitions
`color`, `background-color` and `border-color` on `var(--dur)` directly — `.sidebar__link` and
`.code-tab` — rather than on `calc(var(--motion) * var(--dur))` the way every component does. So a
visitor who has asked for reduced motion still gets an animated theme change in the shell, and
`emulateMedia({ reducedMotion: 'reduce' })` does not stop it in a test. Phase 7 met this as a flaky
contrast failure and fixed the *measurement*, in `tests/shared/a11y.spec.mjs`; the stylesheet itself is a
human-facing page file and is left alone under the standing constraint. Two lines to fix in a session
that has reason to be in that file.

**A scaffold from `npm run new:component` publishes itself.** Found during phase 1. Neither
`src/site/pages/components/index.astro` nor `src/site/components/ComponentNav.astro` filters on
`status`, and `[slug].astro` builds a page per slug, so an untouched scaffold reaches the site as a
card and a sidebar row reading its own `TODO:` placeholder summary, plus an empty page — and the
shared a11y gate starts driving it as a real component.

This turned up because one was sitting in the tree when phase 1 started; deleting it was the fix that
session. Closing it properly means filtering `status !== 'draft'` out of the index, the nav and
`getStaticPaths`, which touches human-facing pages — so it waits for a session that has reason to be
in them.

The agent side is already covered: the generator carries `status` into `agents/index.{md,json}` and
marks any non-stable component on its index row, so a draft is disclosed rather than advertised.

**The `compositions` group is currently empty.** `groups.mjs` still declares it, and both the registry
and the generator drop empty groups, so it costs nothing and is ready for batch F.
