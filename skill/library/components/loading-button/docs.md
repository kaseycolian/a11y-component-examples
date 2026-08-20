## Before you copy

These files are a working reference, not a package. Move the markup into your own templates and the
state into your own code. What has to survive that move is the ARIA below, the keyboard behavior, and
where focus goes — those are the parts that make the component accessible, and the parts that are
usually dropped.

Every example on this page is numbered and separately copyable. The CSS and JS sections name which
examples need them.

## Required markup

A spinner is a picture. It says nothing to a screen reader, so the pending state has to be written
somewhere a screen reader reads: `aria-busy` on the button, and a message in a live region beside it.

| Element | Attribute | What it does |
| --- | --- | --- |
| `<button>` | `class="ac-btn ac-btn-loading"` | Both classes. The base is [Button](../button/)'s, copied. |
| `<button>` | `aria-busy="true"` | The machine-readable half of the state. It is also the CSS selector that draws the spinner, so you cannot show a spinner without setting it. |
| `<button>` | `aria-disabled="true"` | Set while busy, so a second press does nothing and the control announces "unavailable". **Never `disabled`.** |
| `<button>` | `type="button"` | Required unless it is submitting a form. The default is `submit`. |
| `<span>` spinner | `aria-hidden="true"` | Keeps the spinner out of the accessible name. It has nothing to say. |
| A sibling `<p>` | `role="status"` | The spoken half of the state. Rendered **empty**, before anything happens. |
| The accessible name | — | **Never changes.** Not while busy, not when done. |

### `aria-busy` is not enough on its own

It is a global ARIA state and it is well-formed on a button, but screen readers announce it
inconsistently — some read "busy", some say nothing at all. So it is the machine-readable half of the
state, and the live region is the half that actually speaks. Ship both.

Example 2 puts two spinners side by side. The **spinner-only** one is drawn by a private `data-`
attribute instead of `aria-busy`; it animates identically and its readout never moves. Nothing about
it is invalid, and no automated check reports it.

## Keyboard

A native `<button>` supplies all of this. There is no key handler in `component.js`.

| Key | What it does |
| --- | --- |
| <kbd>Tab</kbd> / <kbd>Shift</kbd> + <kbd>Tab</kbd> | Moves to and from the button. The stop survives going busy, because the busy state uses `aria-disabled` and never `disabled`. |
| <kbd>Enter</kbd> | Activates the button, or does nothing while it is busy. |
| <kbd>Space</kbd> | Activates the button, or does nothing while it is busy. |

**Keys deliberately not bound.** None, and the click guard needs none either. A native button fires a
*click* for both <kbd>Enter</kbd> and <kbd>Space</kbd>, so `preventDefault` on the click covers the
keyboard.

## States

| State | Signaled by | Never signaled by |
| --- | --- | --- |
| busy | The spinner appearing, `aria-busy="true"`, and the status text. | The rotation alone. |
| busy, to a pointer | `cursor: progress`. | — |
| unavailable while busy | `aria-disabled` plus the click guard. | `disabled`, and no dimming — that is opacity over a color nobody chose. |
| focus | A 3px `:focus-visible` ring at 2px offset. | The border. |

Under `forced-colors: active` the ring itself survives, because it is a `border` on `currentColor` —
it becomes `ButtonText` with the label. **Its gap does not.** Forced colors replaces `border-color`
wholesale, and `transparent` comes back *opaque*, so the ring closes into a full circle and stops
reading as turning. The gap has to be repainted in the button's own forced-colors background
(`ButtonFace`, and `Highlight` on hover). A `box-shadow` or gradient spinner would have been dropped
outright, with nothing that brings it back.

## Screen reader behavior

Expected: "Save changes, button" on the way in, then "Saving…" from the status region, then "Changes
saved." The name is the same at all three points.

`aria-busy` announcements vary, and that variance is the argument for the region rather than against
the attribute — it is still what a scripted check and any future assistive technology will read.

**Not yet verified against real assistive technology.** Until `docs/at-support.md` has a row for this
component, treat the above as intent, not measurement.

## Never `disabled` while loading

`disabled` removes the tab stop the instant it is set, so the browser drops focus to the document
body. Three things break at once:

- The reader loses their place — <kbd>Tab</kbd> starts again from the top of the page.
- The status they just caused is announced somewhere they are no longer standing.
- Nothing explains why the control went away, because a disabled button announces nothing at all.

`aria-disabled="true"` plus a click guard gives you the lock without any of that. The guard is one
capture-phase listener on a container, lifted from [Button](../button/) — capture matters, because a
handler bound on the button itself only wins if it was registered first.

Example 3 prints `document.activeElement` right after each press.

## The name has to stay still

Swapping "Save" for "Saving…" renames the control mid-operation. A screen reader announces the name
of the thing under the cursor, so a reader parked on the button hears a *different button arrive*,
and a voice-control user who says "click Save" a second later finds nothing (SC 2.5.3). The status
goes in the region; the button keeps its name. [Switch](../switch/) and
[Input Group](../input-group/) follow the same rule for their confirmations.

Example 4 records the accessible name at each phase. The **renames itself** button ends with three.

## API

```js
const c = AC.createLoadingButton(container);

c.setBusy(button, true, 'Saving…', region);   // the component
c.setBusy(button, false, 'Saved.', region);
c.refresh();                                  // re-run this page's readouts
c.destroy();
```

Idempotent: calling it twice on the same element returns the existing instance. `setBusy` is the only
part worth lifting — everything else in `component.js` is this page checking its own claims.

## Using it in a framework

Delete the auto-init block at the bottom of `component.js` and call the factory from your own
lifecycle. In React:

```jsx
const ref = useRef(null);

useEffect(() => {
  const c = AC.createLoadingButton(ref.current);
  return () => c.destroy();
}, []);
```

## Common mistakes

- **A spinner and nothing else.** It is a picture. Nothing announces it.
- **`disabled` while loading.** Focus is gone, and so is the explanation.
- **A label that becomes the status.** One control, three names.
- **A region created when there is something to say.** It has to already be in the accessibility
  tree — see [Live Region](../live-region/).
- **The same message twice.** Setting a region to the string it already holds announces nothing;
  clear it a frame first.
- **A pending cue that is only an animation.** It disappears under reduced motion. The spinner here
  is gated on `--ac-motion` like every other animation, so at `--ac-motion: 0` it stops turning — and
  it still has to show that something is pending. Two things make that work: the ring **appears**
  when the button goes busy (`visibility: hidden` → `visible`), which is a change with or without
  motion, and the status line says "Saving…" either way. Example 5's dot is the counter-example:
  always visible, pending signaled only by the pulse.
- **A button that resizes when it goes busy.** Reserve the spinner's box with `visibility: hidden`,
  not `display: none`. Without the kept box the button grows when it goes pending and moves out from
  under the pointer that just pressed it.
- **A spinner that runs past five seconds with no way out.** SC 2.2.2 is a separate obligation from
  reduced motion. See [Reduced Motion](../motion-preferences/).

## Related

- [Button](../button/) — the base, and the `aria-disabled` click guard.
- [Live Region](../live-region/) — why the region has to exist before it has anything to say.
- [Reduced Motion](../motion-preferences/) — the gate the spinner reads.
