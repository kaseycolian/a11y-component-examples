## Before you copy

Your Markdown renderer or CMS theme probably ships something like this, and you should probably let
it. **The elements and the three attributes below are the same either way** — they are what the
renderer is or is not emitting, and checking that is the whole review. Take the CSS, keep the
contract, and let the pipeline own the content.

Each example is separately copyable: the HTML sections are numbered, and the CSS sections say which
examples need them. There is no JavaScript in this component.

## One sentence

A prose surface is a box you style by element, because the markup inside it arrives without classes —
which means the structure it arrives with is the only structure it will ever have.

## The contract

| Piece | Attribute | Why |
| --- | --- | --- |
| `.ac-prose` | `tabindex="0"`, `role="region"`, `aria-labelledby` | it scrolls, and a scroll container is a tab stop with no name (SC 2.1.1) |
| the label target | the surface's own first heading | so the name is written once |
| `.ac-prose__code` | `tabindex="0"`, `role="region"`, `aria-label` | a `<pre>` scrolls too, and it is a second stop inside the first |
| `.ac-prose__quote` | none | a `<figure>` holding a `<blockquote>` and a `<figcaption>` |

Nothing else. No `role="article"`, no `role="document"`, no `aria-label` on the paragraphs — the
elements carry all of it, and this component exists to make sure they are the right elements.

[Data Table](../data-table/) owns the three scroll-region attributes and the reasoning behind them.
This page is about what goes inside.

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
left — the ones on this page start at `<h4>`, because the page spent `h1`, `h2` and `h3` above them.
If you need a smaller heading than the outline allows, that is a class, and Typography owns it. Never
pick the level for the size (SC 1.3.1).

## A `<pre>` needs its own overflow

```html
<pre class="ac-prose__code" tabindex="0" role="region" aria-label="Setlist query">…</pre>
```

`<pre>` does not wrap. A long line either widens the surface — so a block of prose scrolls sideways,
which is exactly the thing the surface's `min-width: 0` was there to prevent — or it scrolls on its
own. It should scroll on its own, and that makes a second scroll container inside the first.

A second scroll container is a second tab stop: Chromium hands it one with no role, no name and a 1px
near-black ring, and Safari hands it none at all. The three attributes on the `<pre>` are the same
three on the surface, for the same reason. Example 2 has all three cases side by side.

The ring on the `<pre>` is inset (`outline-offset: -3px`), because the surface clips it — an outline
at a positive offset on a child of an overflow container is cut off on the edge it matters most on.
[Focus Ring](../focus-ring/) owns that variant.

`white-space: pre-wrap` is not the fix. Code that wraps wherever the box happens to end reads as
different code, and a screen reader gets no signal that the break was not the author's.

## The attribution is not the quotation

```html
<figure class="ac-prose__quote">
  <blockquote><p>…</p></blockquote>
  <figcaption>Ruby, on the door</figcaption>
</figure>
```

Put the attribution inside the `<blockquote>` and it is part of what the person said. The quotation
now ends *"…and the floor was still there in the morning. — Ruby, on the door"*, which is a sentence
nobody spoke. The `<figure>` is what holds the two together without merging them.

`cite` as an **attribute** on `<blockquote>` is not exposed by any browser to any screen reader — it
is a URL for machines. `<cite>` as an **element** names a work and is italic by default; it is not an
attribution either. The `<figcaption>` is.

A `<div>` with a left bar is the third case in example 3, and it is the most common of the three: it
looks identical, and nothing in it is quoted.

## Bullets and rules that are only drawn

A list typed as `• item` in three paragraphs announces *"bullet, Roots and radicals"* three times and
never says how many items there are — which is the one thing a list role is for. A `<div>` with a
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
examples 3 and 4 have none of the three, deliberately. One prose surface per page, not one per pull
quote.

## States

| State | Signaled by | Not by |
| --- | --- | --- |
| surface focused | the 3px ring at `+2px` | never the UA hairline |
| `<pre>` focused | the 3px ring, inset | never a positive offset the surface will clip |
| a link in prose | an underline, as well as the color | never color alone (SC 1.4.1) |
| a quote | the rule down its edge, and the `blockquote` role | never the rule alone |

Under `forced-colors: active` the rules and borders are real borders and survive; the mask in example
5 does not, and the platform has no way to put back text a fade is hiding.

## Keyboard

| Key | Where | Does |
| --- | --- | --- |
| <kbd>Tab</kbd> | the page | one stop on the surface, and one more on each `<pre>` that scrolls |
| <kbd>↑</kbd> <kbd>↓</kbd> | on the surface | scrolls the prose |
| <kbd>←</kbd> <kbd>→</kbd> | on a `<pre>` | scrolls the code |
| <kbd>Tab</kbd> | in the surface | links inside the prose are ordinary stops |

## Screen reader behavior

Not yet tested against a screen reader. What the markup asks for: arriving reads *"Notes from the
basement, region"*; the surface can be read as a document with browse-mode keys; the `<pre>` is a
second region named for what it contains; the quotation ends where the person stopped talking.

The roles are checked against Chromium's accessibility tree by the spec, which is what the readouts
on the page are showing — `blockquote`, `list`, `listitem`, `separator`, `region`, and the name each
region computes.

## What to watch for

- **A `<pre>` with no `overflow-x`.** It takes a block of prose sideways.
- **A `<pre>` with `overflow-x` and nothing else.** A silent tab stop in Chromium, no stop at all in
  Safari.
- **The attribution inside the `<blockquote>`.** The person is quoted introducing themselves.
- **A `<div>` with a left bar.** Nothing is quoted.
- **`•` typed into a paragraph.** Read as the character, and there is no count.
- **A `<div>` with a `border-top` where an `<hr>` belongs.**
- **`overflow: hidden` with a fade.** The text is announced and unreachable.
- **`tabindex="0"` and `role="region"` on a surface that fits.** A stop and a landmark that do
  nothing.
- **A heading level chosen for its size.** The surface styles by element, so the level is the size —
  and the outline is what pays for it (SC 1.3.1).
