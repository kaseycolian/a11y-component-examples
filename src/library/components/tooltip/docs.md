## Before you copy

Your framework almost certainly has a nicer idiom for this than `AC.createTooltip`. The ARIA
attributes and their wiring are the same either way, and this is enough for a person — or an agent —
to start from. **Check three things** in whatever you use: that the bubble appears on keyboard focus
and not only on hover, that <kbd>Esc</kbd> dismisses it, and that the pointer can travel onto the
bubble without it vanishing.

Each example is separately copyable: the HTML sections are numbered, and the CSS and JS sections say
which examples need them.

## First, do you want one at all?

| The information is… | Use |
| --- | --- |
| a short description of the control, useful but not required | a tooltip |
| the name of an icon-only control | a tooltip, referenced by `aria-labelledby` (example 2) |
| something the user must know to succeed | visible help text (example 5) |
| longer, and wanted only sometimes | a toggletip (example 4) or a [Disclosure](../disclosure/) |
| anything with a link, a button or a field in it | a [Modal](../modal/) or a Disclosure — never a tooltip |

A tooltip is the one surface a touch user cannot reach and a low-vision user at 400% zoom may not be
able to fit on screen. It is a place for *extra*, and treating it as a place for *essential* is the
mistake that makes this component an accessibility problem rather than an accessibility feature.

## SC 1.4.13 is the whole component

Content that appears on hover or focus must be all three of these, and the tooltip most codebases
already have is none of them:

| Requirement | What it means | How this does it |
| --- | --- | --- |
| **Dismissible** | removable without moving the pointer or focus | <kbd>Esc</kbd>, and the dismissal is remembered until the pointer leaves or focus moves |
| **Hoverable** | the pointer can travel onto the content and it stays | closing is delayed, and the bubble's own `pointerenter` cancels the pending close |
| **Persistent** | it does not disappear on a timer | nothing here times out; only leaving, blurring or <kbd>Esc</kbd> closes it |

The single most common failure is `pointer-events: none` on the bubble. It is the reflex fix for a
bubble that eats clicks, and it makes the content permanently unhoverable.

The second most common is a fade-out after a few seconds, which fails persistence and disproportionately
affects the people who read slowest.

## The contract

| Element | Attribute | Why |
| --- | --- | --- |
| trigger | `aria-describedby="<bubble id>"` | joins the two. The trigger must be a real `<button>` or link — a `<span>` is unreachable |
| trigger | `aria-labelledby` **instead**, if it has no text | a description cannot supply a missing name; example 2 |
| bubble | `role="tooltip"` | the role exists so AT can treat it as a description, not a region |
| bubble | `hidden` when closed | and never `tabindex` — there is nothing in it to operate |

**`aria-describedby` stays on the trigger whether the bubble is showing or not.** An element
referenced directly by `aria-describedby` is folded into the description even while it is hidden, so a
screen reader user hears the text on focus without waiting for anything to appear. Toggling the
attribute with visibility is a popular idea and it only takes the text away from the people who
depend on it most.

## Keyboard

| Key | Action |
| --- | --- |
| <kbd>Tab</kbd> | to the trigger, which shows the bubble. One stop — the bubble is never one |
| <kbd>Esc</kbd> | dismisses it, without moving focus |
| <kbd>Tab</kbd> again | leaves, and the bubble goes with it |

The bubble opens on `focus` only when the focus is *visible*, so clicking a button does not also fire a
tooltip at the person who clicked it. `Esc` is consumed in the capture phase so an enclosing dropdown
or drawer does not close on the same keystroke — a native `<dialog>` is the exception, since its Esc
handling is the UA's own `cancel` event; call `preventDefault()` on that while a tooltip is open if
you need the dialog to stay put.

## Toggletip, and why it is a different component

A tooltip **describes** its trigger. A toggletip is content the trigger **reveals**, so it opens on
click — which is the whole point, because click works on touch.

```html
<button type="button">What is a load-out?</button>
<span role="status"></span>   <!-- empty, and already in the DOM -->
```

On click, the text is inserted into the live region, and that insertion is the announcement. Three
things follow from that shape:

- **No `aria-expanded`.** This is not a disclosure. The revealed content is a message, not a region
  the button controls.
- **No `aria-describedby`.** The button is not described by what it opens; its name is the question.
- **The live region is present and empty from the start.** A live region inserted along with its text
  gives a screen reader no change to notice.

Removing the text again announces nothing, which is correct — there is no news in a message going
away. And focus never moves, so <kbd>Esc</kbd> has nothing to put back.

## Positioning

The bubble is `position: fixed` and `component.js` writes the coordinates. Absolute positioning inside
the trigger's wrapper is shorter and breaks the moment the trigger sits inside anything with
`overflow: hidden` — a toolbar, a table scroller, a card with a clipped corner — because the bubble is
clipped with it.

Fixed positioning has one hole: an ancestor with `transform`, `filter` or `contain` becomes the
containing block for fixed descendants, and the clipping comes back. There, use the popover API or CSS
anchor positioning.

It flips above the trigger only when there is no room below **and** there is room above; a bubble
squeezed off the top edge is worse than one below the fold, which the page can scroll to. It clamps
to the viewport horizontally, and the arrow's offset is recalculated after the clamp so it still
points at the trigger. `max-width` is `min(20rem, calc(100vw - 2rem))`, so a long tooltip cannot widen
the page at 320px (SC 1.4.10).

## Why `title` is not this

Example 3 keeps a native `title` on the page for comparison. It:

- never appears on keyboard focus, so it fails SC 1.4.13 by never appearing at all
- times out while you are still reading
- cannot be hovered, styled, wrapped, or read at 400% zoom
- is unreachable on touch
- is announced by some screen readers, ignored by others, and read *instead of* the label by a third
  group — because `title` is also the last fallback in the accessible name computation

Use it for nothing you need read. The one honest use left is a `<title>` on an `<iframe>`, which is a
different attribute doing a different job.

## Screen reader behavior

**Not yet verified on real assistive technology** — this component has passed the automated gate and a
keyboard pass, and nothing more. What it is *built* to produce:

- **Example 1** — "Advance the show, button", then the description, on focus, from the still-hidden
  bubble.
- **Example 2** — "Print the run sheet, button", with the bubble supplying the name and no second
  announcement when it appears.
- **Example 4** — the button's name, then the answer as a polite announcement after the click.

The combination to distrust is touch. TalkBack and iOS VoiceOver have no hover, so assume the visible
bubble never appears there and make sure its text is not the only copy of anything. `docs/at-support.md`
is where verified results go once there are any.

## Watch for

- **`pointer-events: none` on the bubble.** Fails hoverable. If the bubble is eating clicks, move it
  instead.
- **A tooltip on a `disabled` control.** A disabled button is not focusable and fires no pointer
  events in most browsers, so the explanation for why it is disabled is the one thing nobody can
  reach. Use `aria-disabled="true"` and a click guard — see [Switch](../switch/) example 4 — or put the
  reason in visible text.
- **A `<div>` or `<span>` as the trigger.** No focus, no tooltip, for anyone on a keyboard.
- **Both `aria-label` and `aria-labelledby` on an icon-only trigger.** `aria-labelledby` wins, and if
  you meant the other one the visible words are the ones nobody hears.
- **A tooltip that appears on click and stays.** That is a toggletip; give it the toggletip's shape,
  not `role="tooltip"`.
- **Hover-only on a `<label>` or a table cell.** Wrap the actual control, not the text near it.

## API

```js
const t = AC.createTooltip(el, { openDelay: 120, closeDelay: 180 });

t.isOpen();   // -> boolean
t.show();     // for a walkthrough or a test
t.hide();
t.trigger;    // the control
t.tip;        // the bubble
t.destroy();

const g = AC.createToggletip(el);   // example 4, same shape
```

Both are idempotent: calling either twice on the same element returns the existing instance. Both mint
the bubble's `id` if the markup has none, and `destroy()` removes only the wiring the factory added —
markup that already declared `aria-describedby` keeps it.

`closeDelay` is a grace period, not an animation, so it is not gated on reduced motion. Setting it to
`0` breaks the hoverable half of SC 1.4.13.

## Using it in a framework

Delete the auto-init block at the bottom of `component.js` and call the factory from your own
lifecycle. In React:

```jsx
const ref = useRef(null);

useEffect(() => {
  const t = AC.createTooltip(ref.current);
  return () => t.destroy();
}, []);
```

If your framework owns the open state, keep three things it will not give you for free: the delay
before closing, the remembered <kbd>Esc</kbd> dismissal, and `aria-describedby` pointing at the bubble
the whole time rather than only while it shows.

## Related

`.ac-tooltip-btn` and `.ac-tooltip-field*` are local copies so this file stands alone; `button`,
[Form Field](../field/) and [Text Input](../text-input/) own the canonical versions. [Disclosure](../disclosure/)
is the pattern when the content is a region and belongs in the tab order.
