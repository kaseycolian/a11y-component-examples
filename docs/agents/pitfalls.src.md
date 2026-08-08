# Pitfalls — source

Hand-written source for `agents/pitfalls.md`. `scripts/build-agent-surfaces.mjs` splits this file on
its `<!-- lede -->`, `<!-- group: … -->` and `<!-- item: … -->` markers and renders the rest verbatim;
everything above the first marker is this note and is dropped. Then run `npm run agents`.

An item marker is `Title · <SC> <SC>`, where the success criteria are optional and ` · ` is the
separator. Tag one only when the trap *is* a failure of it. Several of these are mechanisms — how a
failure gets introduced — and inventing a criterion for those would make the tags worthless. Keep a
body to one paragraph unless a second one carries a different fact.

The bar for an entry: a fact about the platform that a careful developer would get wrong on the first
try, plus the fix, and it cost a real failure here. A success criterion restated is not one. Anything
about working *on* this repo — Node's PATH, Astro's config, the screenshot recipe — belongs in
`docs/BUILD-STATUS.md` instead, and anything about writing a test belongs in `testing.src.md`.

<!-- lede -->

Traps a plausible-looking implementation falls into. Each one cost a real failure here — something
that shipped wrong, or a test that went red for a reason nobody predicted — so none of them is a
success criterion restated back to you. Where a component in this library has the fix live it is
named, and `agents/components/<slug>.md` is the next hop.

An entry with no `WCAG` tag is a mechanism rather than a failure: it is how a failure gets introduced.

<!-- group: Names and labels -->

<!-- item: A live region is not part of an ancestor's accessible name · 4.1.2 -->

Name-from-contents folds in a child only when the child's own role also takes its name from its
contents, and no live-region role does. So `role="status"` on a count nested inside a button *removes*
the count from the button's name: Chromium computes `Inbox` where the identical-looking specimen
beside it computes `Inbox 98 unread messages`. The attribute added to make a change more audible is
what makes the control silent on arrival. Two consequences — a component that composes a name out of
real text has to know which roles are inside it, and any code that walks the DOM to predict a name has
to skip `status`, `alert`, `log`, `marquee` and `timer` children or it will confidently contradict the
browser. `badge`'s `[NAME]` block is a walk that models it.

<!-- item: CSS generated content is part of the accessible name · 1.4.1 2.5.3 -->

accname folds `::before` and `::after` into the name of anything named from its contents, and Chromium
implements it: a button reading "Matinee" with `::before { content: "✓" }` announces **"✓ Matinee"**.
So the obvious non-color state cue renames the control every time the state changes — SC 1.4.1's fix
landing on SC 2.5.3. Draw the shape instead: `content: ""` plus borders contributes nothing to the
name and, on `currentColor`, survives forced colors with no rule of its own. `chip-toggle`'s example 2
has both live.

<!-- group: Live regions -->

<!-- item: A live region has to be in the tree before the text arrives · 4.1.3 -->

An element is announced when its contents *change*, so a `role="alert"` created and inserted with its
message already inside it has changed nothing anyone was observing. Not `hidden`, not `display: none`,
not built on demand: render the container empty and write into it later. `field` keeps its error
element rendered and empty for exactly this reason and pays one flex `gap` for it. `live-region` has
the rest of the ways an announcement gets lost.

<!-- item: `<output>` is a live region nobody declared · 4.1.3 -->

`<output>` has an implicit `role="status"`, so the element that sounds most correct for a computed
value announces the whole value on every change — a hundred-character URL, once per keystroke of the
field feeding it. An audit that greps for `role=` or `aria-live` misses it, so any selector meant to
find every region on a page needs `output` in it. It also cannot be detected with `el.role`; see
`agents/testing.md` for what does work. `result-panel` is the precedent.

<!-- item: No live-region role is allowed on a list element · 4.1.2 -->

`<ol role="log">` is invalid ARIA-in-HTML. The role goes on a wrapping `<div>` and the `<ol>` stays a
list inside it. axe reports this as `aria-allowed-role`, which is easy to read as a false positive and
is not.

<!-- group: Focus -->

<!-- item: `el.disabled` is false for a control inside `<fieldset disabled>` -->

The IDL property reflects only the control's own attribute, so controls inside a disabled fieldset
report as focusable and ringless when they are correctly neither — it produced eight of them here on
the first run of a sweep. Anything iterating "the things a keyboard can reach" has to filter on
`el.matches(':disabled')`, which is the CSS pseudo-class and does account for the ancestor.

<!-- item: Chromium hands a free tab stop to any user-scrollable box · 2.1.1 2.4.3 2.4.7 4.1.2 -->

A box with `overflow: auto` or `scroll` becomes a tab stop with no `tabindex`, and it arrives with no
role, no accessible name, and the UA's own focus indicator — `rgb(16, 16, 16) auto 1px`, a black
hairline invisible on a dark page. So a scroll region is reachable and silent by default, and
`tabindex="0"` plus `role="region"` plus a name is still required, because Safari does not do this at
all and the ring has to be supplied either way.

The rule is *user*-scrollable, so `hidden` and `clip` get nothing. That makes an `overflow: hidden`
box of text worse than the silent stop everyone worries about: the content is in the DOM and fully
announced, and there is no route to it at all — no scrollbar, no wheel, no keyboard. `clip` is still
the right choice for "cut this off", for a different reason — it creates no scroll container, so a
focused descendant cannot be scrolled out from under the clamp. `effects`' `[PATCH]` is the block to
lift.

<!-- item: `document.body.focus()` is a no-op, not a blur · 2.4.3 -->

Chrome ignores `focus()` on an element that cannot take focus rather than moving focus to it, so the
usual "save `document.activeElement`, focus something, put it back" shape silently fails at page load,
where `activeElement` is `<body>`. Code that probes two controls to find out which one the keyboard
reaches then leaves focus parked on the last one it tried, and a keyboard reader arrives in the middle
of the page. Call `el.blur()` first and only then restore.

<!-- item: An unfocusable fragment target does not leave focus on the link · 2.4.3 -->

Following `<a href="#x">` where `#x` cannot take focus does not fail quietly by leaving the keyboard
where it was. The browser runs the focusing steps for the document's viewport, so
`document.activeElement` comes back as `<body>` and the next Tab starts at the **top of the page** — a
keyboard reader who asked to be moved down the page is moved to the beginning of it. `tabindex="-1"`
on the target is the whole fix. `jump-nav` is the precedent.

<!-- group: Forced colors -->

<!-- item: Forced colors hands `transparent` back opaque · 1.4.11 -->

`border-top-color: transparent` — the standard way to cut the gap into a CSS ring spinner — computes
to `rgb(0, 0, 0)` under `forced-colors: active` in Chromium, so the ring closes into a full circle and
the rotation stops being visible at all. `border-color` is forced wholesale and `transparent` is not
exempt. Repaint the gap in whatever system color the element's own background became (`ButtonFace` on
a button, `Highlight` on hover) rather than assuming it survived. `loading-button`'s `[FORCED]` block
is the precedent.

<!-- item: Forced colors drops gradients and every `box-shadow` · 1.4.11 -->

Anything painted as a gradient `background-image`, and every glow or elevation shadow, is gone in
Chromium with no rule written. `background-image` is not on the spec's forced list, so declare `none`
yourself rather than relying on the platform to do it — and remember that whatever the decoration was
distinguishing is now undistinguished. This is why every component here ends with a
`@media (forced-colors: active)` block: it is where the state cues get redrawn in system colors.

<!-- group: Targets and pointers -->

<!-- item: SC 2.5.8 has three exceptions, and a check written without them reports the spec rather than the page · 2.5.8 -->

It applies to *pointer* targets, so a focusable heading or scroll region is not one. A link inside a
sentence is exempt, because its size is constrained by the line-height around it. And a native
checkbox or radio is user-agent sized. Without all three, a sweep flags perfectly fine elements — 60
of them, on the first run here. A link *alone* in a paragraph gets no inline exception, though: there
is no surrounding sentence, so it is just a 16px target.

<!-- item: `box-sizing: border-box` counts the border into a target's measured size · 2.5.8 -->

A 20px glyph with a 2px border on each side measures exactly 24×24 — on the floor rather than under it
— so `min-width` and `min-height` are not the only numbers involved in clearing it, or in failing it
on purpose. `icon-button`'s `--tiny` is the precedent.

<!-- item: A wrapped tab strip must not carry one rail across the whole strip · 1.4.10 2.5.8 -->

A `border-bottom` on the tablist belongs to the last row, so at 320px the first row of a wrapped strip
hangs over nothing and the leftover tabs read as stray text. Put the selected cue on each tab instead
— and declare that `border-bottom` at its full width in *both* states, transparent when unselected, so
selecting a tab cannot reflow the row and shift the next tab out from under a pointer already heading
for it. The general rule: a non-color state cue has to occupy its space in both states.

<!-- group: Color and contrast -->

<!-- item: An accent color used as text fails on a light background · 1.4.3 -->

A palette drawn to be vivid against a dark page lands at 2.7–4.2:1 on a light surface, and worse on a
tint of itself — measured here, the raw accents failed 7 of 40 theme×accent combinations. Mix the
accent toward the theme's own text color, `color-mix(in srgb, var(--accent) 80%, var(--text))`, which
raises contrast in *both* modes because the text color is the one color a theme guarantees contrasts
with its own background. 80% clears a 12% tint and 65% clears a 16% one. Borders and tints keep the
raw accent; they are decoration and have no ratio to clear.

<!-- item: A tint mixed out of the text color needs a text color of its own · 1.4.3 -->

`background: color-mix(in srgb, var(--text) 10%, transparent)` pulls the surface *toward* the text, so
inherited muted text inside it measured 2.28:1 in every theme. Whatever sets a tint from the text
color has to set a color too.

<!-- item: A misspelled token in a `var()` chain goes quiet · 1.4.3 -->

`var(--ac-x, var(--typo, #literal))` resolves to the literal in every theme, forever — no error, no
warning, nothing in a diff. On a dark page it is invisible, because the standalone literals *are*
dark-theme colors: `--bg-elev`, where the real token is `--bg-elevated`, sat in a tooltip unnoticed
until an axe run in a light theme reported **1.01:1**. A fallback chain needs its middle name checked
against the list the theme actually defines; nothing else will tell you.

<!-- group: CSS and the cascade -->

<!-- item: The UA's `[hidden] { display: none }` loses to any author `display` -->

A component that declares `display: inline-flex` on its root has silently disabled the `hidden`
attribute, so `el.hidden = true` leaves the thing on screen and in the accessibility tree. Declare
`.thing[hidden] { display: none }` explicitly. It costs one line, and there is nothing in the failing
markup to suggest a cause.

<!-- item: `hidden` does nothing at all on an `<svg>` -->

The rule that implements it lives in the UA's HTML stylesheet and never reaches the SVG namespace, so
`<svg hidden>` still lays out: inline in flow, and blockified to a 300x150 box inside a flex or grid
parent. An icon sprite marked that way draws nothing, which is why it survives review — it is a silent
hole in the layout. `dropdown`'s was 150px tall. Add `style="display: none"`; the attribute is the
intent, the declaration is what carries it out.

<!-- item: A host page's own `h1`–`h6` rules cascade into anything you put a class on -->

A class beats a bare element selector only for the properties it actually declares; everything it
stays quiet about still comes from the host. `.ac-t-h2` on an `<h4>` inherited a shell's
`text-transform: uppercase`, its `text-shadow` and its `letter-spacing`, while the same class on a
`<div>` got none of them — so a demo whose whole argument was that the two are indistinguishable
quietly stopped being true. A utility class that claims to own appearance has to declare the
properties a host is likely to set, not only the ones it cares about. This is the hazard that comes
free with copy-paste: the component is correct and the page it landed in changed it.

The same hazard reaches an element you ship with **no** class at all. A `<pre><code>` block takes the
host's whole `code` rule — this library's shell gives it a tint, a radius and padding — so a component
that ships one has to reset what it never asked for.

<!-- item: A modifier written below the specificity of its base rule does nothing at all -->

No warning, no visible cause, and the base rule looks innocent because it is the one everybody writes
first. Three ways it happened here. Two single-class rules that both set `padding` are resolved by
*source order*, so an icon button declared above its own size modifier keeps the text button's padding
and stops being square. Two modifiers setting the same custom property, likewise. And a base written
`.thing th, .thing td` is (0,1,1), so `.thing__num` at (0,1,0) loses and a column's alignment is
simply dead. Write a modifier at the same specificity as the base it has to beat —
`.thing .thing__num` — and never reason about it, because a computed-style assertion is what actually
finds it.

<!-- item: `[popover]` needs a UA-style reset -->

`inset: auto; margin: 0; border: 0; padding: 0`, or the browser centers the popover in the viewport
instead of putting it where the CSS says.

<!-- item: A message container should not be `display: flex` -->

Every inline element inside becomes a flex item, so a `<code>` or a link in the text breaks onto its
own line. Position the marker instead.

<!-- group: Tables and reflow -->

<!-- item: `display: block` on a `<table>` keeps its role and announces the column twice · 1.3.1 1.4.10 -->

Chromium still reports `table`, `row`, `rowheader` and `cell` for a table restyled into stacked cards,
so the reason usually given for not doing it is out of date and an axe run on the restyle comes back
clean. Two reasons survive and both are measurable. The cells of a row stop sharing a top edge, so the
column is gone for everyone who could see it. And the `td::before { content: attr(data-label) }` that
always comes with the pattern is folded into the cell's accessible name while a clipped `<thead>`
keeps the real columnheader in the tree — so the column is announced twice. Wrap and scroll rather
than restyle; just do not argue it from the role.

<!-- item: Chromium demotes a plain `<table>` out of being a table at all · 1.3.1 -->

A `<table>` with no `<caption>`, no `<th>` and no borders is exposed as `LayoutTable`: no table
navigation, no row or column announcements, and cells that come back as `LayoutTableCell`. A
`<caption>` on its own promotes it. A `<th>` alone promotes it but leaves it unnamed. **`aria-label`
does not promote it** — the attribute people reach for is the one that does not work. Ordinary cell
borders also defeat the heuristic, so a styled table is a data table whatever the markup says; the
trap is the unstyled one.

<!-- item: A `<caption>` inside a `display: block` table shrink-wraps -->

The parent is no longer a table box, so the caption gets an anonymous one of its own and a four-word
caption renders as four lines of one word. Every card restyle carries a `caption { display: block }`
line for this and nobody says why.

<!-- item: `overflow-wrap: break-word` does not shrink a box's min-content width · 1.4.10 -->

It breaks a word that has *already* overflowed, so the text wraps and the box looks fixed — but a flex
or grid item's automatic minimum size is its min-content width, so the box still refuses to go under
the longest unbreakable run and the page cannot reflow to 320px. `overflow-wrap: anywhere` and
`word-break: break-all` both do shrink it; prefer `anywhere`, which only breaks where it has to.
Measured on a URL with a 40-character token: **479px** minimum under `break-word`, **32px** under
`anywhere`, and the two are pixel-identical on screen. `result-panel`'s example 2 has all three side
by side, and the number is the only thing that tells them apart.
