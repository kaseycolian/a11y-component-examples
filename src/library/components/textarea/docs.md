## Before you copy

A `<textarea>` with a `<label for>` is already accessible. Nothing here adds accessibility to it —
this page is about the three things people bolt on that take it away: removing the resize handle,
capping length with `maxlength`, and wiring a character counter to a live region.

Your framework's textarea component probably does at least one of them. **Check those three** and take
whatever else you like from your own library.

Each example on this page is separately copyable: the HTML sections are numbered, and the CSS and JS
sections say which examples need them. Examples 1, 4 and 5 need no JavaScript.

## resize: vertical, never none

`resize: none` is the most common single change made to a textarea, and it is the one that hurts. A
four-line window onto a long value leaves the user scrolling a box instead of reading a page — the
problem SC 1.4.4 and 1.4.10 exist to prevent — and the handle is the only control they have over it.

Horizontal resize stays off, because widening past the column is what breaks a layout sideways.
`resize: vertical` is the pair that is safe for you and useful to them.

The one exception is `:disabled`, where the handle is inert anyway; leaving it visible advertises
something that does not work.

## The counter, and why it is three separate things

| Piece | Updated | Announced |
| --- | --- | --- |
| The hint (`aria-describedby`) | never — it states the limit | with the field, on focus |
| The visible count (`aria-hidden="true"`) | every keystroke | never |
| `role="status"` (off screen) | after a 1s pause | only from 90% of the limit |

Wire a live region straight to `input` and a screen reader reads "1 character. 2 characters. 3
characters." over the top of what the person is typing. Debouncing alone is not enough either: an
announcement at 12 of 462 changes no decision. Announce what does — running out of room, and being
over.

Below the threshold the status is **cleared** rather than left alone, so that crossing back over it
later is a change the screen reader notices.

The live region is positioned off screen, not `display: none` or `hidden`. Either of those takes it
out of the accessibility tree, and a live region that is not in the tree announces nothing.

## No `maxlength`

`maxlength` stops accepting keystrokes at the limit and says nothing about why. On a phone, where the
field is half covered by the keyboard, the effect is that typing simply stops working. That is a
failure of SC 3.3.1 — the error is never identified.

So over-typing is allowed, and reported: the counter switches to "8 over", the field gets
`aria-invalid="true"` (which thickens the border, so the cue is never color alone), and the status
says how far over. Your validation then rejects it the way it would reject any other bad value.

If you must use `maxlength`, put the limit in the hint so it is knowable in advance, and expect a
proportion of your users to never work out why the field stopped responding.

## Autogrow that does not argue

Height is set inline from `scrollHeight`, with the cap in CSS so a long value scrolls instead of
growing the page without end.

Two details that are easy to get wrong:

- **Collapse before measuring.** `height: auto` first, then `scrollHeight` — otherwise `scrollHeight`
  can only report the height it already has, and the field grows but never shrinks.
- **Stop once the user resizes.** A `ResizeObserver` watches for a height change the script did not
  make; after that it leaves the height alone. Growing back over a size someone chose by hand is the
  component overruling them, and they cannot win the argument.

## Read-only is not disabled

| | `readonly` | `disabled` |
| --- | --- | --- |
| Tab reaches it | yes | no |
| Keyboard can scroll it | yes | **no** |
| Selectable, copyable | yes | no |
| Submitted with the form | yes | no |

The scrolling row is why this matters more on a textarea than on an input: anything past the visible
lines of a `disabled` textarea is unreachable for a keyboard user. If the value is there to be read,
it is `readonly`.

Read-only keeps its resize handle for the same reason — a long read-only value is exactly the case
someone needs more lines for.

## API

```js
const t = AC.createTextarea(el, { limit: 462, idleMs: 1000 });

t.count();     // -> { used, over }
t.refresh();   // re-measure after setting .value from code
t.element;
t.destroy();   // unbinds, drops the inline height, restores aria-invalid
```

Idempotent: calling it twice on the same element returns the existing instance.

`refresh()` is not optional if you set values programmatically — assigning `.value` fires no `input`
event, so neither the count nor the height would know.

## Using it in a framework

Delete the auto-init block at the bottom of `component.js` and call the factory from your own
lifecycle. In React:

```jsx
const ref = useRef(null);

useEffect(() => {
  const t = AC.createTextarea(ref.current);
  return () => t.destroy();
}, []);
```

## Related

`.ac-field`, `.ac-field__hint` and `.ac-field__error` are canonical in [Field](../field/), repeated
here so this file stands alone — change one, change both. [Text Input](../text-input/) is the
single-line case, and covers `autocomplete` and `inputmode`.
