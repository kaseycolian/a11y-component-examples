## Before you copy

Your framework or design system almost certainly ships one of these already — `sr-only`,
`visuallyHidden`, `<VisuallyHidden>`. Use it, and check it against the nine declarations below,
because the version people hand-roll is usually missing two of them. There is no ARIA here and no
JavaScript. This is enough for a person or an agent to start from.

Each example is separately copyable: the HTML sections are numbered, and the CSS sections say which
examples need them.

## The whole thing

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
| `position: absolute` | out of flow, so it cannot push layout around |
| `width/height: 1px` | **not `0`** — some browsers treat a zero-size box as not rendered and drop it from the accessibility tree |
| `margin: -1px` | pulls the 1px box back out of the parent's box, so a line of text does not gain a pixel |
| `overflow: hidden` | clips the content down to that 1px |
| `clip-path: inset(50%)` | the actual removal; the modern replacement for the deprecated `clip: rect(…)` |
| `white-space: nowrap` | without it the text wraps inside the 1px box, and some screen readers read it one letter per line |
| `padding: 0`, `border: 0` | `box-sizing: border-box` cannot shrink a box below its own borders, so a border makes the "1px" box bigger than 1px |

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

On the buttons in example 4, `aria-label="Add a date"` would work and would be shorter. Elsewhere it
quietly does not:

- **It needs a role that supports naming.** On a plain `<span>` or `<div>` with no role, `aria-label`
  is ignored. Example 5 has that failure live, and nothing in the markup hints at it.
- **It replaces the entire accessible name**, discarding visible text inside the element. If the
  replacement does not contain the visible label, speech-input users cannot activate the control by
  saying what they see — that is **SC 2.5.3 Label in Name**.
- **It is an attribute, not text.** Page translation tools often skip it, and browser find-in-page and
  select-to-copy never see it. Hidden *text* is real text.

Rule of thumb: use `aria-label` to name a control, and visually hidden text to add words to content.

## The focusable variant

Hidden text containing a focusable element is a trap — a sighted keyboard user Tabs to something that
is not on screen, and the focus ring lands on nothing. `.ac-visually-hidden--focusable` un-hides on
`:focus-within` so it appears at the moment it is reached.

`:focus-within`, not `:focus`, because the focusable thing is usually *inside* the wrapper rather than
being it — and it matches both cases. [Skip Link](../skip-link/) is this same idea specialized: it
uses plain `:focus`, because a programmatic focus that fails to match `:focus-visible` there is a
silent failure of the entire component.

## Where the copies live

This is the canonical home for the technique, and [Skip Link](../skip-link/),
[Switch](../switch/), [Textarea](../textarea/) and [Tooltip](../tooltip/) each carry their own copy of
it on purpose. A paste into a bare app has to work with no second file, so nothing here is imported
anywhere. If you change these declarations, change them there too.

## Screen reader behavior

**Not yet verified on real assistive technology** — this has passed a keyboard pass and the automated
gate, and nothing more. What it is built to produce: the hidden text read as part of the surrounding
content, or as part of the accessible name when it sits inside a link or button.

The thing to test first, on whatever you have: the buttons in example 4. If all four announce a name,
your screen reader is guessing from something else; if only the first does, the class is doing its job.

## Watch for

- **The missing space.** `Read more<span class="ac-visually-hidden">about Linoleum</span>` announces
  "Read moreabout Linoleum". The space goes **inside** the span, or the two halves run together.
- **Hidden text as a sibling instead of a child.** Outside the `<a>`, it is separate page text and the
  link is still called "Read more". Inside, it is part of the name.
- **Applying it to a `<div>` that contains focusable content** without the `--focusable` variant.
- **A live region hidden with `display: none`.** It announces nothing. Use this class — and render it
  before you put text in it. [Live Region](../live-region/) owns that half.
- **Using it to hide things you would rather nobody saw.** It is not a way to remove content; a
  screen reader user hears all of it, and a long hidden block is a long detour they did not ask for.
- **`width: 0; height: 0`.** Common, and it is the one variant that can drop out of the accessibility
  tree entirely.
- **Reaching for it when the design should just say the word.** Visible text serves everyone, and it
  is one fewer thing to keep in sync.
