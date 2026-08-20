## Before you copy

These files are a working reference, not a package. Move the markup into your own templates and the
state into your own code. What has to survive that move is the ARIA below, the keyboard behavior, and
where focus goes — those are the parts that make the component accessible, and the parts that are
usually dropped.

If your design system already ships an `sr-only` class, check it against the nine declarations below.
The hand-rolled version is usually missing two of them, and each omission has its own failure.

Every example on this page is numbered and separately copyable. The CSS sections name which examples
need them.

## Required markup

There is almost none. The class does the work, and nothing about it needs a role or an attribute.

| Element | Attribute | What it does |
| --- | --- | --- |
| the hidden text | `class="ac-visually-hidden"` | Off the screen, still in the accessibility tree and still in the page's text. |
| inside a link or button | — | Put it **inside** the element it names, or it is separate page text and the name does not change. |
| a clipped live region | `role="status"` + `aria-live="polite"` | Gives an announcement somewhere to live when there is nowhere on screen for it. |
| a decorative `<svg>` | `aria-hidden="true"` + `focusable="false"` | The opposite tool: keeps the pixels, drops the node. |

### The nine declarations

```css
.ac-visually-hidden {
  position: absolute;
  box-sizing: border-box;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  border: 0;
  clip-path: inset(50%);
  white-space: nowrap;
}
```

| Declaration | Why it is there |
| --- | --- |
| `position: absolute` | Out of flow, so it cannot push layout around. |
| `width/height: 1px` | **Not `0`** — some browsers treat a zero-size box as not rendered and drop it from the accessibility tree. |
| `margin: -1px` | Pulls the 1px box back out of the parent's box, so a line of text does not gain a pixel. |
| `overflow: hidden` | Clips the content down to that 1px. |
| `clip-path: inset(50%)` | The actual removal; the modern replacement for the deprecated `clip: rect(…)`. |
| `white-space: nowrap` | Without it the text wraps inside the 1px box, and some screen readers read it one letter per line. |
| `padding: 0`, `border: 0` | `box-sizing: border-box` cannot shrink a box below its own borders, so a border makes the "1px" box bigger than 1px. |

## Keyboard

The class binds nothing. It matters to the keyboard in exactly one situation.

| Key | What it does |
| --- | --- |
| <kbd>Tab</kbd> | Reveals the `--focusable` variant when focus lands inside it. Everywhere else, hidden text is not a stop and Tab is unaffected. |

**Keys deliberately not bound.** All of them. Hidden text is text, not a widget.

## States

| State | Signaled by | Never signaled by |
| --- | --- | --- |
| clipped | A 1px box, clipped and pulled back out of the line. Present in the accessibility tree and in the page's text. | `display: none`, `visibility: hidden`, or the `hidden` attribute. All three take the text out of the tree with it. |
| revealed | The `--focusable` variant returning to the flow on `:focus-within`. | — |

There is no transition on the reveal. There is nothing to animate from, and an element still arriving
is one the user is already trying to press.

### The focusable variant

Hidden text containing a focusable element is a trap — a sighted keyboard user Tabs to something that
is not on screen, and the focus ring lands on nothing. `.ac-visually-hidden--focusable` un-hides on
`:focus-within` so it appears at the moment it is reached.

`:focus-within`, not `:focus`, because the focusable thing is usually *inside* the wrapper rather than
being it — and it matches both cases. [Skip Link](../skip-link/) is this same idea specialized: it
uses plain `:focus`, because a programmatic focus that fails to match `:focus-visible` there is a
silent failure of the entire component.

## Screen reader behavior

Expected: the hidden text read as part of the surrounding content, or as part of the accessible name
when it sits inside a link or button.

**Not yet verified against real assistive technology.** Until `docs/at-support.md` has a row for this
component, treat the above as intent, not measurement.

The thing to test first, on whatever you have: the four buttons in example 4. If all four announce a
name, your screen reader is guessing from something else; if only the first does, the class is doing
its job.

## Hiding is not one thing

This is the whole reason the class exists, and example 4 has it live: four icon-only buttons whose
only label is a span, hidden four different ways. Three of them have **no accessible name at all** — a
screen reader announces "button" and stops.

The third one is worth a second look even without a screen reader: `visibility: hidden` keeps the
element's *layout box*, so that button is visibly wider than the others — stretched by a label nobody
can read. It is the only one of these failures you can see with no tooling at all.

| Technique | On screen | In the accessibility tree |
| --- | --- | --- |
| `.ac-visually-hidden` | gone | **present** |
| `display: none` | gone | gone |
| `visibility: hidden` | gone, but **the layout box stays** | gone |
| `hidden` attribute | gone | gone (it is `display: none` from the UA stylesheet) |
| `aria-hidden="true"` | **visible** | gone |
| `opacity: 0`, `font-size: 0`, `color: transparent` | gone | present, but the box still takes space and can still be selected and clicked |

`aria-hidden="true"` is the exact opposite tool and the two get confused constantly: it hides from
screen readers and leaves the pixels. That is right for decoration — the `<svg>` glyphs in example 4
carry it — and catastrophic on anything focusable, because a focusable element with no accessible
name is a stop on the Tab route that announces nothing.

## `aria-label` is a different tool

On the buttons in example 4, `aria-label="Add a customer"` would work and would be shorter. Elsewhere
it quietly does not:

- **It needs a role that supports naming.** On a plain `<span>` or `<div>` with no role, `aria-label`
  is ignored. Example 5 has that failure live, and nothing in the markup hints at it.
- **It replaces the entire accessible name**, discarding visible text inside the element. If the
  replacement does not contain the visible label, speech-input users cannot activate the control by
  saying what they see — that is **SC 2.5.3 Label in Name**.
- **It is an attribute, not text.** Page translation tools often skip it, and browser find-in-page and
  select-to-copy never see it. Hidden *text* is real text.

Rule of thumb: use `aria-label` to name a control, and visually hidden text to add words to content.

## Common mistakes

- **The missing space.** `Read more<span class="ac-visually-hidden">about Invoice 99</span>` announces
  "Read moreabout Invoice 99". The space goes **inside** the span, or the two halves run together.
- **Hidden text as a sibling instead of a child.** Outside the `<a>`, it is separate page text and the
  link is still called "Read more". Inside, it is part of the name.
- **`display: none`, `visibility: hidden` or the `hidden` attribute** reached for instead. All three
  take the text out of the accessibility tree, which is the one thing this class exists to prevent.
- **`width: 0; height: 0`.** Common, and it is the one variant that can drop out of the accessibility
  tree entirely.
- **A missing `white-space: nowrap`.** The text wraps inside the 1px box and some screen readers read
  it a letter at a time.
- **A border or padding left on it.** `border-box` cannot shrink below its own borders, so the "1px"
  box is bigger than 1px.
- **Applying it to a `<div>` that contains focusable content** without the `--focusable` variant.
- **`:focus` instead of `:focus-within`** on that variant, when the focusable thing is inside the
  wrapper rather than being it.
- **A live region hidden with `display: none`.** It announces nothing. Use this class — and render it
  before you put text in it. [Live Region](../live-region/) owns that half.
- **Using it to hide things you would rather nobody saw.** It is not a way to remove content; a
  screen reader user hears all of it, and a long hidden block is a long detour they did not ask for.
- **Reaching for it when the design should just say the word.** Visible text serves everyone, and it
  is one fewer thing to keep in sync.

## Related

This is the canonical home for the technique. [Skip Link](../skip-link/), [Switch](../switch/),
[Textarea](../textarea/) and [Tooltip](../tooltip/) each carry their own copy of it on purpose: a
paste into a bare app has to work with no second file, so nothing here is imported anywhere. If you
change these declarations, change them there too.

- [Icon Button](../icon-button/) — the most common place this class earns its keep.
- [Live Region](../live-region/) — owns the half that puts text into the region example 3 renders.
