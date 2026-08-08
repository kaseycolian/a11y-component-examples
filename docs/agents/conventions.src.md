# Conventions — source

Hand-written source for `agents/conventions.md`. Same marker format as `pitfalls.src.md`. Then
`npm run agents`.

This is the expanded form of Tier 0's "what a copied component needs" block, which is compressed to
claims with no reasoning because it is under a byte budget. The reasoning is the point of this file: a
rule with its reason attached is one a reader can decide *does not* apply to their codebase, and a rule
without one gets stripped by the next person who tidies up.

Written to whoever is pasting a component out, not to whoever is adding one in. `CLAUDE.md` is the
contributor version and says more — the deliberate deviations, the writing voice, the demo-content
rules — none of which belongs here.

<!-- lede -->

What a component in this library assumes about the page it lands in. Each of these is a convention
whose absence is silent: the component still renders, and the thing it was protecting is gone.

Tier 0 states them as rules. This is the same set with the reason attached, because the reason is what
tells you whether it applies to your codebase.

<!-- group: Color -->

<!-- item: Every color is a three-level fallback chain -->

`background: var(--ac-surface, var(--bg-panel, #110620))` — this library's token, then the host theme's
token, then a standalone literal. The chain is what lets one unmodified file work in three situations:
a page that sets `--ac-*` overrides, a page already running a theme system, and a bare page with
neither. Drop the middle level and the component stops following its host theme. Drop the last and it
renders unstyled in a bare page. Only `transparent`, `currentColor` and the CSS system colors are
written bare.

<!-- item: An accent used as *text* is mixed toward the text color -->

```css
color: color-mix(in srgb, var(--ac-accent-pink, var(--accent-pink, #ff2ec4)) 80%, var(--ac-text, var(--text, #f3ecff)));
```

Written inline in each component rather than pulled from a shared token, because a component has to
stand alone. Borders and tints keep the raw accent — they are decoration and have no contrast ratio to
clear. `agents/pitfalls.md` has what happens when they do not.

<!-- group: Motion -->

<!-- item: Every duration is gated, never hardcoded -->

```css
transition: color calc(var(--ac-motion, var(--motion, 1)) * var(--ac-dur, var(--dur, 150ms))) ease;
```

`--motion` resolves to `0` under `[data-motion="off"]` **or** `prefers-reduced-motion`, with the media
query written last so an in-page toggle can only *add* the restriction and never override the OS
preference. Multiplying by a token beats a `@media (prefers-reduced-motion)` block per component: the
OS preference and an in-page control then reach the same arithmetic, and there is one place to be wrong
rather than two.

<!-- group: Forced colors -->

<!-- item: Every component ends with a `@media (forced-colors: active)` block -->

Windows High Contrast drops `color-mix`, gradients and shadows, so every state cue painted with them
vanishes and the component looks identical in all of its states — pressed the same as unpressed,
invalid the same as valid. The block redraws those cues in system colors (`Highlight`, `ButtonBorder`,
`Canvas`, `CanvasText`), which is the one place bare colors are not merely allowed but required. A
component without this block is not finished, and nothing about it looks wrong until someone turns High
Contrast on.

<!-- group: JavaScript -->

<!-- item: A plain IIFE, no `export` -->

The file has to work pasted straight into a `<script>` tag, so there is no module syntax and no import
of any kind. It takes the global object as a parameter and registers a factory on `window.AC`.

<!-- item: Every factory is idempotent and returns `destroy()` -->

Calling it twice on the same root is a no-op rather than a second set of listeners, and `destroy()`
removes everything it added. That is what makes a component survivable inside a framework that
re-renders. Ids are minted by the component itself, because `aria-labelledby` needs one and a
hardcoded id breaks the second instance on the page.

<!-- item: Nothing is shared between components, deliberately -->

Each one repeats what it needs. A copy-paste library is better served by every file standing alone than
by being DRY, because one file is one paste — a shared helper module would be a second thing to find
and a second thing to get wrong.

<!-- group: Naming and targets -->

<!-- item: The `ac-` prefix is a collision guard -->

Classes `ac-<name>__<part>`, hooks `data-ac-<name>`, tokens `--ac-*`, globals `window.AC.*`. It exists
because the host page may already own `.btn`, `.input` and `.drop`, and a component that fights the
page it was pasted into is worse than no component.

<!-- item: Pointer targets clear 24×24, and 44 is the intent -->

SC 2.5.8's floor is 24×24 and this library aims at 44 where the layout allows it. `box-sizing:
border-box` counts the border into that number.

<!-- item: A landmark's name has to be unique on the page it lands in -->

A named `<section>` **is** a landmark — `region` — and so is any scroll container you gave
`role="region"` and a name. Two of them sharing a role and a name are two entries a reader cannot tell
apart, and axe's `landmark-unique` says so. Name each one for what it holds rather than for what it is:
`Invoice 99 as Markdown`, not `Preview` on every one. `jump-nav` is the precedent — its two navigation
landmarks were both called *On this page*, on the page whose whole subject is that. The inverse costs
the same: an *unnamed* `role="region"` is not a landmark at all, so it is a tab stop with nothing to
say.

<!-- item: Anything with an `id` needs `scroll-margin-top` -->

Otherwise a sticky header covers the element that a fragment link, or a focus move, just scrolled to
(SC 2.4.11). The value has to clear your own header. This library sets it globally in the site shell
rather than per component, so it is one of the few things a paste does **not** bring with it — if your
app has a sticky header, this is on you.

<!-- group: What is not part of a component -->

<!-- item: `ac-demo-*`, `ac-demo__*` and `data-ac-demo-broken` are page scaffolding -->

The demo grid, the two section headings that split correct examples from mistakes, the per-example
headings, the readouts, and the markers on the examples that are broken on purpose. They live in the
site's own stylesheet, never in a `component.css`, so that everything inside a component's own files is
real component code. Do not copy them — and never copy anything under the **Common mistakes** heading or
from inside an element carrying `data-ac-demo-broken`, which is wrong by design and labeled with what it
is wrong about.
