# The agent layer

Why the agent-facing side of this library is shaped the way it is, and what it is made of.

**Status: being built.** Phases 0 and 1 are done — the generator runs, Tier 0 and Tier 1 ship, and
`npm run check:agents` gates them in CI. Phases 2–6 are ahead. The checklist at the bottom is the
source of truth for how far it got; update it as each phase lands, and record what surprised you in
**What phase 1 cost** below.

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
| 0 | `AGENTS.md` / `llms.txt` | ~2.5 KB | What this is, the read path, and the one rule: never read `BUILD-STATUS.md` or `CLAUDE.md` |
| 1 | `agents/index.md` | ~3.5 KB | Route to one component — slug, group, `useWhen`, tags, WCAG, files |
| 2 | `agents/components/<slug>.md` | ~800 B | The answer: ARIA, keyboard, states, failure modes, API |
| 3 | `library/components/<slug>/component.*` | as needed | The code to copy. Already served, unchanged |
| 4 | `docs.md`, `agents/pitfalls.md` | as needed | The *why*, and the cross-cutting traps |

Tier 1 uses a new one-line `useWhen`, deliberately **not** `meta.json`'s `summary`: the summaries run
~50 words and are written as ledes for a human page.

Cross-cutting, reachable from Tier 0:

- **`agents/pitfalls.md`** (+ `.json`) — the transferable accessibility findings, grouped by topic
  (names and labels · live regions · focus · forced colors · targets · CSS cascade · tables) and tagged
  with the SC. This is the highest-value unique artifact in the repo: every item was paid for once by
  a real failure.
- **`agents/conventions.md`** — the copy-paste contract. The token chain, the motion gate, the
  forced-colors block, the `ac-` prefix, IIFE + `destroy()`. Currently tangled together with
  contributor instructions in `CLAUDE.md`.
- **`agents/verify.md`** — how to check the result, distilled from `tests/shared/a11y.spec.mjs`: the
  ten checks, and the exceptions that make a naive sweep wrong.
- **`agents/testing.md`** — the Playwright and axe harness findings, for an agent writing a11y tests.

---

## One manifest, many renderings

The requirement is that the surfaces can never drift apart. So they are not separate documents. They
are renderings of one in-memory manifest, and **no file is ever half hand-written and half generated**
— that is the property that makes a `--check` mode possible at all.

```
HAND-WRITTEN — the only places to edit
  src/library/components/<slug>/meta.json    + a new `contract` block
  docs/agents/preamble.md                    Tier 0 prose
  docs/agents/pitfalls.src.md                one block per transferable finding
  docs/agents/testing.src.md                 harness findings
  docs/agents/conventions.src.md             the copy-paste contract
        |
        v
  scripts/build-agent-surfaces.mjs   ->  one manifest  ->  every surface below
        |
        +--> AGENTS.md                                                    committed
        +--> agents/index.md, agents/index.json                           committed
        +--> agents/components/<slug>.md                                  committed
        +--> agents/{pitfalls,testing,conventions,verify}.md, pitfalls.json  committed
        +--> .claude/skills/a11y-library/SKILL.md                         committed
        +--> public/llms.txt, public/agents/**       generated at build, gitignored
```

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

1. **Schema** — every `meta.json` has a well-formed `contract`, and every rendered Tier 2 file is
   under its byte budget.
2. **The ARIA is real** — every role and `aria-*` a contract names appears in that component's
   `component.html`, *outside* any `data-ac-demo-broken` subtree. Catches a rename or a removal.
3. **The keyboard map is tested** — every key a contract names is referenced in that component's
   `tests/<slug>.spec.mjs`. A documented key is a tested key.
4. **The API is real** — the `api` signature names a factory that exists in `component.js`. Skipped
   for the CSS-only components, via `meta.json` `files`.
5. **Failure modes reconcile by count** — the number of `failureModes` entries equals the number of
   `BROKEN ON PURPOSE` comments in `component.html`. Deliberately a count and not a prose match: it
   catches a broken example added without documenting it, in both directions, and needs no parser.
6. **Every index row resolves** — fetch each served `meta.json` during the Playwright run, assert 200.
7. **`--check` is clean.**

---

## Phases

- [x] **0 · Persist the design.** This file, plus pointers from `BUILD-STATUS.md` and `CLAUDE.md`, so
      an interrupted or compacted session resumes from the repo rather than from memory.
- [x] **1 · Generator, Tier 0 and Tier 1.** `scripts/build-agent-surfaces.mjs`,
      `docs/agents/preamble.md`, `AGENTS.md`, `agents/index.{md,json}`, `agents/llms.txt`, the
      `sync-library.mjs` job, `.gitignore`, `check:agents` in `package.json` and `ci.yml`. Renders only
      from `meta.json` fields that already exist, so it lands working before any component is touched.
- [ ] **2 · Contract blocks.** One `meta.json` edit per component, plus accuracy tests 1–6. Seed each
      from the existing `component-specs.md` entry — median 626 B, already the right size — and the
      `docs.md` `## The contract` section, then let test 2 prove it against the markup. Backfill
      `disclosure`, `dropdown` and `field`, which have no spec entry at all.
- [ ] **3 · Split the gotchas.** The transferable accessibility findings move to
      `docs/agents/pitfalls.src.md`, the harness findings to `testing.src.md`, the build trivia stays
      in `BUILD-STATUS.md`, and the duplicated stale-cache entry collapses to one. Then
      `conventions.src.md` and `verify.md`.
- [ ] **4 · The Claude Code skill.** `.claude/skills/a11y-library/SKILL.md`, generated, a router only.
      Its `description` triggers on accessibility work; its body is the read path and the budgets, and
      it holds no duplicated content, so it cannot go stale. (`.gitignore` excludes only
      `.claude/settings.local.json`, so this commits cleanly.)
- [ ] **5 · Split the entry docs by audience.** `CLAUDE.md` states the two contracts up front —
      contributing to the library versus consuming it — and `README.md` points agents at `AGENTS.md`.
- [ ] **6 · Close the record.** Update this file from plan to built state: what shipped, the measured
      token cost per tier against the budgets above, and anything that cost more than ten minutes.
      Tick the item in `BUILD-STATUS.md` with what was *found*, not just that it passed.

**Deferred: an MCP server.** Files work for every agent with no runtime, and a server would be a
second thing to keep accurate. The manifest the generator already builds is the natural backing for
one when it is wanted.

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

## Rules for the generated surfaces

Two conventions from `CLAUDE.md` are easy to break here and worth restating, because the generator
writes prose:

- **Never count the components.** No "34 components", no derived totals, in `AGENTS.md`, `llms.txt` or
  the index header. The roster changes; the copy should not need editing when it does. Say what the
  library *is*.
- **American English**, and say it once. The budgets are the point — a Tier 2 file that explains itself
  twice has spent an agent's context on nothing.

---

## Resolved during phase 1

**`src/library/components/app-url-maker/` was a draft scaffold about to reach the human pages.** Six
untouched files from `npm run new:component`, created when batch F was started and then halted. It was
not inert: `meta.json` carried `"status": "draft"` and a `TODO:` placeholder summary, and neither
`src/site/pages/components/index.astro` nor `src/site/components/ComponentNav.astro` filters on
`status`, so the next build would have published a Compositions card reading *"App Frame: URL Maker —
TODO: two or three sentences of prose…"*, an empty page, and a 35th component for the a11y gate to
drive.

**Deleted**, since batch F is not resuming immediately. It had never been committed, so nothing was
lost — re-scaffold it when batch F starts. The underlying gap is still open and worth closing when
someone next has reason to touch the human pages: `npm run new:component` can publish a `TODO` string,
because nothing filters `status !== 'draft'` out of the index, the nav or `getStaticPaths`. The agent
side is covered — the generator carries `status` into `agents/index.{md,json}` and marks any
non-stable component on its index row.

The `compositions` group now has no components. `groups.mjs` still declares it, and both the registry
and the generator drop empty groups, so it costs nothing and is ready for batch F.
