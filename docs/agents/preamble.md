# Tier 0 prose

Hand-written source for `AGENTS.md` and `llms.txt`. `scripts/build-agent-surfaces.mjs` splits this
file on the `<!-- slot: … -->` markers and renders the read-path table itself, so the table always
names the surfaces that actually exist, at their real sizes.

Edit the prose only. Do not add a read-path table, a file list, or a component count here — those are
generated. Then run `npm run agents` and commit this file together with what it produced.

Tier 0 has a hard byte budget and the generator fails when prose pushes it over, so this is the one
place in the repo where cutting a good sentence is the right call. `copying` is the block under the
most pressure: it is deliberately compressed to claims without their reasoning, because a reader who
wants the reasoning is one hop from a component's `docs.md`. An unknown slot is an error and so is a
missing one; everything above the first marker is ignored, which is what lets this note sit here.

`title` is the `<h1>` of both files, and `intro`'s first paragraph is also the `llms.txt` blockquote —
so keep that paragraph able to stand on its own.

<!-- slot: title -->

Accessible component library

<!-- slot: intro -->

Accessible UI components as folders of plain files — no build step, no dependencies. Read, copy,
adapt.

Plausible ARIA markup is the easy part. Which attribute the browser ignores, which state cue vanishes
in Windows High Contrast, which focus move a screen reader never announces — that is what this
library hands over.

<!-- slot: rules -->

**Read down the path.** Each tier names the next; stop when one answers you.

**Never read `docs/BUILD-STATUS.md` or `CLAUDE.md`** — a build log and a style guide, tens of thousands
of tokens for nothing about accessibility. `docs/` is for people working *on* the library.

**The files are the answer.** Copy from `component.html`, `component.css` and `component.js`, not from
anything written about them.

**Deliberate failures are labeled.** Most components ship a broken example; anything carrying
`data-ac-demo-broken` is wrong by design. Never copy from inside one.

<!-- slot: copying -->

Each component stands alone: CSS scoped to `.ac-<slug>`, an IIFE registering `window.AC.create<Name>`
returning `destroy()`, no imports. A paste into a bare page works.

Three conventions fail silently if stripped. Colors are `var(--ac-token, var(--theme-token, #literal))`,
or the component stops following its host theme. Every component ends with
`@media (forced-colors: active)`, which restores the state cues High Contrast deletes. Transitions
gate through `calc(var(--ac-motion, var(--motion, 1)) * …)`, which is how `prefers-reduced-motion`
reaches them.

<!-- slot: outro -->

No exact match? The nearest component still earns the read: the ARIA is pattern-specific, the traps
are not.
