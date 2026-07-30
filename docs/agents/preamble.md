# Tier 0 prose

Hand-written source for `AGENTS.md`, `llms.txt` and the Claude Code skill — the three doors an agent
arrives through. `scripts/build-agent-surfaces.mjs` splits this file on the `<!-- slot: … -->` markers
and renders the read-path table itself, so the table always names the surfaces that actually exist, at
their real sizes.

Edit the prose only. Do not add a read-path table, a file list, or a component count here — those are
generated. Then run `npm run agents` and commit this file together with what it produced.

Tier 0 has a hard byte budget and the generator fails when prose pushes it over, so this is the one
place in the repo where cutting a good sentence is the right call. `copying` is the block under the
most pressure: it is compressed to the claims alone, and `agents/conventions.md` now holds every
reason, so a clause here that explains rather than states is the first thing to go. An unknown slot is
an error and so is a missing one; everything above the first marker is ignored, which is what lets
this note sit here.

`title` is the `<h1>` of all three, and `intro`'s first paragraph is both the `llms.txt` blockquote and
the whole of the skill's lede — so keep that paragraph able to stand on its own. `copying` is the one
block the skill leaves out, because its Tier 4 row reaches the same reasoning.

The two `skill-*` slots render into `SKILL.md` alone, so they cost the budgeted files nothing.
`skill-description` is the routing mechanism — Claude Code matches it against the request, which makes
it the one string in this project where keyword coverage beats brevity. Its pattern nouns are a trigger
net, not a roster: keep the ones the library has no component for, because the nearest component is
still worth the read, and do not sync the list to `agents/index.md`.

<!-- slot: title -->

Accessible component library

<!-- slot: intro -->

Accessible UI components as folders of plain files — no build step, no dependencies. Read, copy,
adapt.

Plausible ARIA markup is the easy part. What the browser ignores, and what vanishes in High Contrast,
is what this library hands over.

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

Three conventions fail silently if stripped: the `var(--ac-token, var(--theme-token, #literal))` color
chain, the closing `@media (forced-colors: active)` block, and
`calc(var(--ac-motion, var(--motion, 1)) * …)` on every duration. `agents/conventions.md` says what
each one is protecting.

<!-- slot: outro -->

No exact match? The nearest component still earns the read: the ARIA is pattern-specific, the traps
are not.

<!-- slot: skill-description -->

Reference library of WCAG 2.2 AA accessible UI components as copyable vanilla HTML, CSS and JS. Use it
when building or reviewing anything interactive — dialog, drawer, dropdown, combobox, tabs, accordion,
disclosure, tooltip, toast, live region, data table, form field, skip link — and whenever a request
mentions accessibility, a11y, WCAG, ARIA, roles, labels, screen readers, keyboard navigation, focus
order, focus trapping, high contrast or forced colors. Routes to the markup to copy, the ARIA contract
the pattern has to satisfy, and the traps that make correct-looking markup wrong.

<!-- slot: skill-audience -->

This is the consuming path: you are building an accessible component somewhere else and this library is
the reference. Working **on** the library instead changes one thing only — the conventions come from
`CLAUDE.md`, which the rule below otherwise excludes. It never changes where a component's behavior
comes from. That is `agents/` and the component's own files, for everyone.
