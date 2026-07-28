## Before you copy

Your framework probably has an idiom for putting this at the top of every page — a root layout, a
shell component. Use it. There is no ARIA here and no JavaScript at all, so what you are copying is a
link, a target, and eight lines of CSS. It is the smallest accessibility fix with the largest return,
and this is enough for a person or an agent to start from.

Each example is separately copyable: the HTML sections are numbered, and the CSS sections say which
examples need them.

## The whole thing

```html
<body>
  <a class="ac-skip-link" href="#main">Skip to main content</a>
  <header>…</header>
  <main class="ac-skip-main" id="main" tabindex="-1">…</main>
</body>
```

| Part | Requirement | Why |
| --- | --- | --- |
| the link | first focusable element in `<body>` | anything focusable before it is something the user has to Tab through to reach the thing that saves them Tabbing |
| the link | clipped, never `display: none` | hidden three of the four ways and it cannot be focused, so it can never appear |
| the link | reveals on `:focus` | not `:focus-visible` — see below |
| the target | `tabindex="-1"` | a fragment scrolls the page; it does not move focus |
| the target | `scroll-margin-top` | SC 2.4.11, so a sticky header is not sitting on what you jumped to |
| ARIA | none | it is a link to a fragment. Nothing about it needs describing |

This satisfies **SC 2.4.1 Bypass Blocks**, which is a Level A criterion and one of the few that a
single element can satisfy outright.

## `tabindex="-1"` is not optional

Following `#main` scrolls the page to the target. It does **not** put focus on the target unless the
target is focusable. Without `tabindex="-1"`:

- a screen reader's cursor may stay where it was, so the user hears nothing move
- in some browsers the next <kbd>Tab</kbd> resumes from the top of the document, walking the user
  straight back into the navigation they just asked to skip

Example 5 has that failure live. Follow its link and press <kbd>Tab</kbd>.

Modern Chrome and Firefox set the *sequential focus navigation starting point* on fragment
navigation, which fixes the second symptom on its own. Safari has been inconsistent about it, and it
never fixes the first. Add the attribute.

## `:focus`, not `:focus-visible`

Everywhere else in this library the rule is `:focus-visible`, because a ring on a mouse click is
noise. Here it is the plain `:focus`:

```css
.ac-skip-link:focus { /* un-clip */ }
```

A skip link is reached by <kbd>Tab</kbd>, so in practice the two agree. But if anything ever focuses
it programmatically — a router restoring focus, a test, a browser extension — `:focus-visible` may not
match, and the link is then focused and still invisible. That failure is silent, and it is the whole
component.

## The ring on the target is deliberate

Landing on `<main tabindex="-1">` draws a focus ring around the region. It looks like a mistake and it
is not: it is the only confirmation a sighted keyboard user gets that the jump landed. This is the
exact place `outline: none` gets added, and adding it means the link now does nothing visible for
anyone who is not using a screen reader.

If the full-width ring is genuinely too much, make it smaller or move it to a heading inside the
target. Do not remove it.

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

## Keyboard

| Key | Action |
| --- | --- |
| <kbd>Tab</kbd> from the address bar | the skip link, before anything else |
| <kbd>Enter</kbd> | follows it; focus moves into the target |
| <kbd>Tab</kbd> again | continues **inside** the target — that is the test |

## Screen reader behavior

**Not yet verified on real assistive technology** — this has passed a keyboard pass and the automated
gate, and nothing more. What it is built to produce: the link announced as a link on focus, then the
target's content read from the top after activation, because focus really moved.

The thing to test first, on whatever you have: press <kbd>Tab</kbd> *after* following the link. If the
next stop is back at the top of the page, the target is missing its `tabindex="-1"`.

## Watch for

- **`display: none`, `visibility: hidden`, or the `hidden` attribute** on the link. All three remove
  it from the tab order. This is the most common broken skip link there is, and the markup looks
  perfect.
- **`width: 0; height: 0`** instead of `1px`. Some browsers treat a zero-size box as not rendered.
- **A missing `white-space: nowrap`.** The text wraps inside the 1px box, and some screen readers then
  read it a letter at a time.
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

[Visually Hidden](../visually-hidden/) is the clipping technique on its own, as a utility. The
`.ac-skip-frame`, `.ac-skip-nav`, `.ac-skip-lineup` and `.ac-skip-input` rules in `component.css` are
marked `[FRAME]` and `[MOCK]` — they are the fake page each example needs in order to have something
to skip, and none of them is part of the component.
