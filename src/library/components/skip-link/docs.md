## Before you copy

These files are a working reference, not a package. Move the markup into your own templates and the
state into your own code. What has to survive that move is the ARIA below, the keyboard behavior, and
where focus goes — those are the parts that make the component accessible, and the parts that are
usually dropped.

There is no ARIA here and no JavaScript at all. What you are copying is a link, a target, and eight
lines of CSS, and it satisfies **SC 2.4.1 Bypass Blocks** — a Level A criterion that a single element
can meet outright.

Every example on this page is numbered and separately copyable. The CSS sections name which examples
need them.

## Required markup

```html
<body>
  <a class="ac-skip-link" href="#main">Skip to main content</a>
  <header>…</header>
  <main class="ac-skip-main" id="main" tabindex="-1">…</main>
</body>
```

| Element | Requirement | What it does |
| --- | --- | --- |
| the link | first focusable element in `<body>` | Anything focusable before it is something the user has to Tab through to reach the thing that saves them Tabbing. |
| the link | clipped, never `display: none` | Hidden three of the four ways and it cannot be focused, so it can never appear. |
| the link | reveals on `:focus` | Not `:focus-visible` — see below. |
| the target | `tabindex="-1"` | A fragment scrolls the page. It does not move focus. |
| the target | `scroll-margin-top` | SC 2.4.11, so a sticky header is not sitting on what you jumped to. |
| a list of destinations | `aria-label` on the list | Only when there are several. Not a `<nav>` — see below. |
| ARIA | none | It is a link to a fragment. Nothing about it needs describing. |

### `tabindex="-1"` is not optional

Following `#main` scrolls the page to the target. It does **not** put focus on the target unless the
target is focusable. Without `tabindex="-1"`:

- a screen reader's cursor may stay where it was, so the user hears nothing move
- in some browsers the next <kbd>Tab</kbd> resumes from the top of the document, walking the user
  straight back into the navigation they just asked to skip

Example 5 has that failure live. Follow its link and press <kbd>Tab</kbd>.

Modern Chrome and Firefox set the *sequential focus navigation starting point* on fragment
navigation, which fixes the second symptom on its own. Safari has been inconsistent about it, and it
never fixes the first. Add the attribute.

A link pointing at something already focusable — a search input, a button — needs no `tabindex`.
Example 2 does that.

### `:focus`, not `:focus-visible`

Everywhere else in this library the rule is `:focus-visible`, because a ring on a mouse click is
noise. Here it is the plain `:focus`:

```css
.ac-skip-link:focus { /* un-clip */ }
```

A skip link is reached by <kbd>Tab</kbd>, so in practice the two agree. But if anything ever focuses
it programmatically — a router restoring focus, a test, a browser extension — `:focus-visible` may not
match, and the link is then focused and still invisible. That failure is silent, and it is the whole
component.

## Keyboard

| Key | What it does |
| --- | --- |
| <kbd>Tab</kbd> | From the address bar, reaches the skip link before anything else on the page. |
| <kbd>Enter</kbd> | Follows it. Focus moves into the target, and the ring there is the only confirmation. |

**Keys deliberately not bound.** All of them. This is a link, and a skip link that needs a key handler
is one that stops working when the script fails.

Press <kbd>Tab</kbd> once more *after* following the link. If the next stop is back at the top of the
page, the target is missing its `tabindex="-1"`. That is the whole test.

## States

| State | Signaled by | Never signaled by |
| --- | --- | --- |
| clipped | A 1px box with `overflow: hidden` and `white-space: nowrap`. It stays in the tab order. | `display: none`, `visibility: hidden`, or the `hidden` attribute. All three make it unfocusable. |
| focused | Un-clipped, pinned to the top of the page, above the sticky header at `z-index: 1000`. | — |
| always visible | The `--visible` modifier, which never clips at all. | — |
| landed | A focus ring on the target itself. | — |

There is no transition on the reveal. There is nothing to animate from — it was 1px a moment ago — and
an animated skip link is one that is still arriving when <kbd>Enter</kbd> is pressed.

### The ring on the target is deliberate

Landing on `<main tabindex="-1">` draws a focus ring around the region. It looks like a mistake and it
is not: it is the only confirmation a sighted keyboard user gets that the jump landed. This is the
exact place `outline: none` gets added, and adding it means the link now does nothing visible for
anyone who is not using a screen reader.

If the full-width ring is genuinely too much, make it smaller or move it to a heading inside the
target. Do not remove it.

## Screen reader behavior

Expected: the link announced as a link on focus, then the target's content read from the top after
activation, because focus really moved.

**Not yet verified against real assistive technology.** Until `docs/at-support.md` has a row for this
component, treat the above as intent, not measurement.

## Always visible is a legitimate choice

Example 3 is one modifier, and it removes every failure mode this component has: nothing to clip
wrong, no `z-index` to lose, no sticky header to disappear beneath, and mouse and touch users can use
it too. It costs one line of chrome.

Reach for it on a documentation site, on an app with long repeated navigation, or any time you cannot
test the hidden version properly on real assistive technology. A visible skip link is never wrong; a
hidden one that never appears is.

## More than one, and skipping something other than "main"

Two or three destinations is the useful range — main content, search, sometimes a primary nav.
Example 2 reveals the group together on `:focus-within` so the set is discoverable rather than found
one <kbd>Tab</kbd> at a time. **No landmark around them:** a `<nav>` there adds a region to the
landmark list for the sake of two links that nobody reaches by landmark.

SC 2.4.1 is about *blocks*, and "main content" is only the most common one. A visible link before a
long list that lands after it (example 4) is the same criterion doing more work: 462 names is 462
<kbd>Tab</kbd> presses for someone who wanted the paragraph underneath.

## Common mistakes

- **`display: none`, `visibility: hidden`, or the `hidden` attribute** on the link. All three remove
  it from the tab order. This is the most common broken skip link there is, and the markup looks
  perfect.
- **No `tabindex="-1"` on the target.** The page scrolls, focus does not move, and the next
  <kbd>Tab</kbd> can walk the user back into what they skipped.
- **`:focus-visible` instead of `:focus`.** A programmatic focus then leaves the link focused and
  invisible.
- **`width: 0; height: 0`** instead of `1px`. Some browsers treat a zero-size box as not rendered.
- **A missing `white-space: nowrap`.** The text wraps inside the 1px box, and some screen readers then
  read it a letter at a time.
- **A border on the clipped state.** `border-box` cannot shrink below its own border, so a 1px box
  becomes 4px and the link is visible as a speck in the corner.
- **Anything focusable before it** — a cookie banner, a chat widget, a logo link. The banner in
  particular has to come after the skip link or the skip link is pointless.
- **A `z-index` that loses to your sticky header.** SC 2.4.11: the focused link must not be obscured.
  1000 here, against a header at 900.
- **`outline: none` on the target.** Covered above. Do not.
- **Skipping to a `<div>` that scrolls.** Focus lands on the container, and the container's own scroll
  position may not be at the top. Point at the first heading instead.
- **Text that names what you are leaving.** "Skip navigation" says what you avoid; "Skip to main
  content" says where you land, which is the half the user needs.

## Related

[Visually Hidden](../visually-hidden/) is the clipping technique on its own, as a utility.

The `.ac-skip-frame`, `.ac-skip-nav`, `.ac-skip-people` and `.ac-skip-input` rules in `component.css`
are marked `[FRAME]` and `[MOCK]` — they are the fake page each example needs in order to have
something to skip, and none of them is part of the component.
