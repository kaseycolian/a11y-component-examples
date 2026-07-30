# Keeping the agent side in sync

You changed something. This says what to run and what the failures mean.

`CLAUDE.md` > **Component folder shape** is canonical for *which edit obliges which field* — this file
does not repeat that table. What is here is the other half: the commands, and how to read the errors.

---

## The one rule everything follows

**The generator only reads `meta.json` and `docs/agents/`.** It never opens `component.html`,
`component.css` or `component.js`.

That single fact splits the whole process in two:

- Edit something the generator **reads** → the generated files are now stale → `npm run check:agents`
  fails until you regenerate.
- Edit something it **cannot see** → nothing goes stale, but your contract may now be *silent* about
  real behavior → the Playwright suite fails, because it reads your markup and JS directly.

Generated files stay honest by a diff. Hand-written claims stay true by tests. Nothing is automatic —
no watcher, and **`npm run build` does not regenerate anything**; `prebuild` only copies the committed
`agents/` into `public/`.

---

## What did you change?

**The site shell** — `src/site/pages/`, `src/site/components/`, `src/site/styles/`

Nothing to do. The agent layer describes components, never the shell.

```sh
npm run check:tokens && npm run build
npx playwright test --project=chromium
```

**A component's `docs.md` only**

Nothing to do. It is served raw at Tier 4, so an agent reads your actual file. Build and test.

**A component's `meta.json`**

```sh
npm run agents          # re-renders every surface
npm run check:agents    # proves they match
```

Commit the regenerated `agents/`, `AGENTS.md` and `.claude/skills/` **in the same commit**.

**A component's `component.html`, `.css` or `.js`**

```sh
npx playwright test --project=chromium <slug>
npx playwright test --project=chromium agent-surfaces
```

If `agent-surfaces` reports something, fix the contract in `meta.json`, then run `npm run agents` and
`npm run check:agents` as above. You do not have to work out what is missing in advance — the failure
names the attribute, key or factory.

**Everything, before you push**

```sh
npm run verify
```

`check:tokens` → `check:agents` → `build` → the full suite. On a machine without the webkit browser
installed, run the suite as `npx playwright test --project=chromium` instead and note that you did.

---

## Reading the failures

### From `npm run check:agents`

| Message | Means | Do |
| --- | --- | --- |
| `stale <path>` | a source moved, the rendered file did not | `npm run agents` |
| `missing <path>` | the surface was never written | `npm run agents` |
| `orphan <path>` | a generated file nothing renders any more, usually a renamed or deleted component | `npm run agents` |
| `The summary changed on: <slug>` | the page lede moved | **reread `contract.useWhen`** for that component before regenerating — it is the agent-facing version of the same sentence, and nothing can check whether they still agree |
| `over budget` | a surface outgrew its byte limit | cut prose. Raising a budget needs a reason recorded in `docs/agent-layer.md` |
| `<slug>/meta.json "contract" -- ...` | the block is malformed | the message names the field and what it expected |

### From `agent-surfaces`

| Message | Means | Do |
| --- | --- | --- |
| `claimed by the contract, absent from the demo` | the contract names ARIA the markup does not have | remove it, or add it to the markup |
| `in the shipped markup, mentioned nowhere in the contract` | the component carries ARIA nobody documented | add it to `aria`, or to `states` if it only appears in one state |
| `contract.root selects nothing on the page` | you renamed a class and `root` did not follow | update `contract.root` |
| `contract.root matched N element(s), but none of the ARIA the contract names is inside it` | `root` is too narrow — it is missing the element the contract describes | widen `contract.root` |
| `handled in component.js, absent from the contract's keyboard map` | you bound a key and did not document it | add it to `contract.keyboard` — and then to the spec, or the next check catches you |
| `documented but never pressed in the component's own spec` | a documented key has no test | press it in `tests/<slug>.spec.mjs` |
| `registered on global.AC, claimed by no contract api` | a new public factory | add it to `contract.api`, or name it `create<Name>Page` if it only wires up the demo |

---

## Two things not to do

**Never hand-edit `AGENTS.md`, anything under `agents/`, or the generated skill.** They are output.
`check:agents` re-renders them and fails on any difference, so a hand-edit is reverted work. Edit a
`meta.json` or a file in `docs/agents/`, then regenerate.

**Never commit a component change without its contract change.** That is the whole point of this
layer: the two move together, or the agent-facing side quietly starts describing a component that no
longer exists.

---

Why the layer is shaped this way, and what each surface costs: `docs/agent-layer.md`.
