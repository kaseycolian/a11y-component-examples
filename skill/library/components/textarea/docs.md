## Before you copy

These files are a working reference, not a package. Move the markup into your own templates and the
state into your own code. What has to survive that move is the ARIA below, the keyboard behavior, and
where focus goes — those are the parts that make the component accessible, and the parts that are
usually dropped.

A `<textarea>` with a `<label for>` is already accessible. Nothing on this page adds accessibility to
it. What the page is about is the three things that get bolted on and take it away: removing the
resize handle, capping length with `maxlength`, and wiring a character counter to a live region.

Every example on this page is numbered and separately copyable. The CSS and JS sections name which
examples need them. Examples 1, 4 and 5 need no JavaScript.

## Required markup

| Element | Attribute | What it does |
| --- | --- | --- |
| `<label>` | `for` = the textarea's `id` | Names the field. Clicking it focuses the textarea, with no ARIA involved. |
| `<textarea>` | `rows` | The starting height. Everything past it scrolls, and the handle is how the user gets more. |
| `<textarea>` | `aria-describedby` | Points at the hint, and at the error when there is one. A space-separated list — see [Form Field](../field/). |
| the visible count | `aria-hidden="true"` | It updates every keystroke, so it must never reach a screen reader. |
| the status | `role="status"` | The announcement channel. In the DOM and empty from the start, or the first update is not a change and is not read. |

### `resize: vertical`, never `none`

`resize: none` is the most common single change made to a textarea, and it is the one that hurts. A
four-line window onto a long value leaves the user scrolling a box instead of reading a page — the
problem SC 1.4.4 and 1.4.10 exist to prevent — and the handle is the only control they have over it.

Horizontal resize stays off, because widening past the column is what breaks a layout sideways.
`resize: vertical` is the pair that is safe for you and useful to them.

The one exception is `:disabled`, where the handle is inert anyway. Leaving it visible advertises
something that does not work.

## Keyboard

Everything here is a native `<textarea>`, so this component binds no keys.

| Key | What it does |
| --- | --- |
| <kbd>Tab</kbd> / <kbd>Shift</kbd> + <kbd>Tab</kbd> | Moves out of the field. It does not insert a tab character. |
| <kbd>Enter</kbd> | Inserts a line break. Unlike a single-line input, it does not submit the form. |

**Keys deliberately not bound.** <kbd>Ctrl</kbd> + <kbd>Enter</kbd> to submit is the common addition
and it is not here: a shortcut nobody can see is a shortcut nobody uses, and it is never a substitute
for a submit button. If you add it, keep the button and say so in the hint.

Nothing intercepts <kbd>Tab</kbd>. A textarea that captures it for indentation strands every keyboard
user inside the field (SC 2.1.2).

## States

| State | Signaled by | Never signaled by |
| --- | --- | --- |
| hover | The border takes the blue accent. Skipped when disabled or read-only. | — |
| focus | A 3px outline at 2px offset, via `:focus-visible`. | — |
| read-only | A flatter surface and a dotted border. It keeps its tab stop, its scrolling and its resize handle. | — |
| disabled | A dashed border, reduced opacity, and `resize: none`, since the handle would do nothing. | — |
| invalid | `aria-invalid="true"` on the control, **only while the error shows**. The border goes to 2px and there is a message to read. | Color alone (SC 1.4.1). Two cues, always. |
| over the limit | The visible count switches to "8 over", `aria-invalid` goes true, and the status says how far over on the next pause. | The visible count alone — it is `aria-hidden`, so nothing about it reaches a screen reader. |

Under `forced-colors` the accent collapses to the user's text color, so the invalid border widens and
read-only falls back to a `GrayText` border — both surfaces become `Canvas`.

### Read-only is not disabled

| Behavior | `readonly` | `disabled` |
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

## Screen reader behavior

Expected: `"<label>, edit text, multi line, <hint>"`, and `"invalid entry"` once `aria-invalid` is set.
The visible count is never spoken. The status is spoken on a pause, from 90% of the limit on, as
`"12 characters left."` and then `"Over the limit by 8 characters."`

**Not yet verified against real assistive technology.** Until `docs/at-support.md` has a row for this
component, treat the above as intent, not measurement.

## The counter is three separate things

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

### There is no `maxlength`

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

## Common mistakes

- **`resize: none`.** The single most common change, and a reflow failure (SC 1.4.4). Use
  `resize: vertical`.
- **A live region wired to `input`.** It reads the count over the top of the typing. Throttle it, and
  announce only near the limit.
- **`maxlength` as the whole limit story.** Keystrokes stop with no explanation (SC 3.3.1). State the
  limit in the hint, and report going over instead of preventing it.
- **The count as the only statement of the limit.** Someone has to know the limit before they reach
  it, so it belongs in the hint the field is described by.
- **A visible counter that is not `aria-hidden`.** It then updates in the accessibility tree on every
  keystroke, which is the same problem from the other direction.
- **`display: none` or `hidden` on the live region.** Both remove it from the accessibility tree, and
  a region that is not in the tree announces nothing. Position it off screen.
- **Autogrow without collapsing the height first.** `scrollHeight` reports the height the field
  already has, so it grows and never shrinks.
- **Autogrow that overrules a manual resize.** Once someone drags the handle, that height is theirs.
- **`disabled` where `readonly` was meant.** A disabled textarea cannot be scrolled by keyboard, so
  everything past the visible lines is gone.
- **`font: inherit` left off.** An unstyled textarea lands at 13px monospace, which also defeats a
  page-level font-size preference.
- **A placeholder used as the label.** It disappears on the first keystroke, and with a long value it
  was never visible anyway.

## Related

`.ac-field`, `.ac-field__hint` and `.ac-field__error` are canonical in [Form Field](../field/), repeated
here so this file stands alone — change one, change both.

- [Text Input](../text-input/) — the single-line case, and where `autocomplete` and `inputmode` are
  covered.
- [Live Region](../live-region/) — the announcement timing the counter depends on.
