## Before you copy

These files are a working reference, not a package. Move the markup into your own templates and the
state into your own code. What has to survive that move is the ARIA below, the keyboard behavior, and
where focus goes — those are the parts that make the component accessible, and the parts that are
usually dropped.

Every example on this page is numbered and separately copyable. The CSS sections name which examples
need them, and there is no JavaScript in this component at all.

## Required markup

This is a box you style by element, because the markup inside it arrives without classes — which
means the structure it arrives with is the only structure it will ever have.

| Piece | Attribute | What it does |
| --- | --- | --- |
| `.ac-prose` | `tabindex="0"`, `role="region"`, `aria-labelledby` | It scrolls, and a scroll container is a tab stop with no name (SC 2.1.1). |
| the label target | the surface's own first heading | So the name is written once. |
| `.ac-prose__code` | `tabindex="0"`, `role="region"`, `aria-label` | A `<pre>` scrolls too, and it is a second stop inside the first. |
| `.ac-prose__quote` | none | A `<figure>` holding a `<blockquote>` and a `<figcaption>`. |

Nothing else. No `role="article"`, no `role="document"`, no `aria-label` on the paragraphs — the
elements carry all of it, and this component exists to make sure they are the right elements.

[Data Table](../data-table/) owns the three scroll-region attributes and the reasoning behind them.
This page is about what goes inside.

The class prefix is `.ac-prose`, and it stays that way — this component's display name changed, its
slug did not.

### A `<pre>` needs its own overflow

```html
<pre class="ac-prose__code" tabindex="0" role="region" aria-label="Export request">…</pre>
```

`<pre>` does not wrap. A long line either widens the surface — so a block of prose scrolls sideways,
which is exactly the thing the surface's `min-width: 0` was there to prevent — or it scrolls on its
own. It should scroll on its own, and that makes a second scroll container inside the first.

A second scroll container is a second tab stop: Chromium hands it one with no role, no name and a 1px
near-black ring, and Safari hands it none at all. The three attributes on the `<pre>` are the same
three on the surface, for the same reason. Example 2 has all three cases side by side.

The ring on the `<pre>` is inset (`outline-offset: -3px`), because the surface clips it — an outline
at a positive offset on a child of an overflow container is cut off on the edge it matters most on.
[Focus Indicator](../focus-ring/) owns that variant.

`white-space: pre-wrap` is not the fix. Code that wraps wherever the box happens to end reads as
different code, and a screen reader gets no signal that the break was not the author's.

### The attribution is not the quotation

```html
<figure class="ac-prose__quote">
  <blockquote><p>…</p></blockquote>
  <figcaption>Priya Patel, Billing</figcaption>
</figure>
```

Put the attribution inside the `<blockquote>` and it is part of what the person said. The quotation
now ends *"…and finance reconciled it in an afternoon. — Priya Patel, Billing"*, which is a sentence
nobody spoke. The `<figure>` is what holds the two together without merging them.

`cite` as an **attribute** on `<blockquote>` is not exposed by any browser to any screen reader — it
is a URL for machines. `<cite>` as an **element** names a work and is italic by default; it is not an
attribution either. The `<figcaption>` is.

A `<div>` with a left bar is the third case in example 3, and it is the most common of the three: it
looks identical, and nothing in it is quoted.

## Keyboard

| Key | What it does |
| --- | --- |
| <kbd>Tab</kbd> | One stop on the surface, one more on each `<pre>` that scrolls, and one for each link in the prose. |
| <kbd>↑</kbd> / <kbd>↓</kbd> | Scrolls the prose, from the surface. |
| <kbd>←</kbd> / <kbd>→</kbd> | Scrolls the code, from a `<pre>`. |

**Keys deliberately not bound.** All of them. Every row above is the browser's own scrolling, and a
box of prose has no behavior of its own to add — which is why there is no JavaScript in this
component.

## States

| State | Signaled by | Never signaled by |
| --- | --- | --- |
| surface focused | The 3px ring at `+2px`. | The UA hairline, which is 1px and near-black. |
| `<pre>` focused | The 3px ring, inset. | A positive offset, which the surface clips. |
| a link in prose | An underline, as well as the color. | Color alone (SC 1.4.1). |
| a quote | The rule down its edge, and the `blockquote` role. | The rule alone. |

Under `forced-colors: active` the rules and borders are real borders and survive; the mask in example
5 does not, and the platform has no way to put back text a fade is hiding.

## Screen reader behavior

Expected: arriving reads *"Exporting a report, region"*; the surface can be read as a document with
browse-mode keys; the `<pre>` is a second region named for what it contains; the quotation ends where
the person stopped talking.

**Not yet verified against real assistive technology.** The roles *are* checked against Chromium's
accessibility tree by the spec, which is what the readouts on the page are showing — `blockquote`,
`list`, `listitem`, `separator`, `region`, and the name each region computes. Until
`docs/at-support.md` has a row for this component, the announcements above are intent rather than
measurement.

## Style by element, not by class

```css
.ac-prose h2 { … }        /* not .ac-prose__heading */
```

The markup comes from a CMS, an editor or a Markdown renderer, so there is nothing to put a class on.
That is the one place a descendant selector is the right tool rather than a shortcut.

It has a consequence worth writing down. **A host page's own `h1`–`h6` rules cascade into every
property your rule stays quiet about**, so a surface that only sets `font-size` inherits the host's
`text-transform`, `letter-spacing` and `text-shadow` and renders in whatever the app's headings look
like. [Typography](../typography/) found that; here it is not an edge case but the normal condition,
which is why every heading rule declares all three.

It also means the level *is* the size. The surface takes whatever heading levels the host page has
left — the ones on this page start at `<h5>`, because the page spent `h1`, `h2`, `h3` and the example
title above them. If you need a smaller heading than the outline allows, that is a class, and
Typography owns it. Never pick the level for the size (SC 1.3.1).

### Bullets and rules that are only drawn

A list typed as `• item` in three paragraphs announces *"bullet, Order number and date"* three times
and never says how many items there are — which is the one thing a list role is for. A `<div>` with a
`border-top` is a box with a line on it; an `<hr>` is a `separator` in the accessibility tree.

Both arrive this way from real editors constantly, and both look finished. Example 4 has them beside
the real thing.

## Scrolling, and when not to

The surface uses `max-height` and `overflow-y: auto`. Two things follow.

**`overflow: hidden` is not a shorter way to write it.** The text past the fold is still in the DOM
and still announced, and there is now no route to it at all: no scrollbar, no wheel, and no keyboard
stop either — Chromium's free stop for scroll containers is given only to a box a person could
already scroll, and `hidden` is scrollable by script and by nothing else. Example 5 has both boxes
with the same content at the same height.

**A region with nothing to scroll is a stop that does nothing**, and a named region is also a
landmark. If the surface fits its content, drop `tabindex`, `role` and the name — the surfaces in
examples 3 and 4 have none of the three, deliberately. One of these per page, not one per pull quote.

## Common mistakes

- **A `<pre>` with no `overflow-x`.** It takes a block of prose sideways. Example 2.
- **A `<pre>` with `overflow-x` and nothing else.** A silent tab stop in Chromium, no stop at all in
  Safari. Example 2.
- **The attribution inside the `<blockquote>`.** The person is quoted introducing themselves.
  Example 3.
- **A `<div>` with a left bar.** Nothing is quoted. Example 3.
- **`•` typed into a paragraph.** Read as the character, and there is no count. Example 4.
- **A `<div>` with a `border-top` where an `<hr>` belongs.** Example 4.
- **`overflow: hidden` with a fade.** The text is announced and unreachable. Example 5.
- **`tabindex="0"` and `role="region"` on a surface that fits.** A stop and a landmark that do
  nothing.
- **A heading level chosen for its size.** This component styles by element, so the level is the size
  — and the outline is what pays for it (SC 1.3.1).

## Related

- [Data Table](../data-table/) — where the three scroll-region attributes and their reasoning live.
- [Typography](../typography/) — the same scale applied to markup you *can* put classes on, and where
  the host-page cascade finding comes from.
- [Focus Indicator](../focus-ring/) — the inset ring variant a clipping ancestor forces.
