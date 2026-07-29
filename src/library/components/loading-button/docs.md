## Before you copy

Your framework has a `<Button loading>` already and you should use it. **The four decisions on this
page are the same either way** — they are about which attributes carry the pending state, not about
how the component is built. Take the CSS, keep the contract, and let your framework own the state.
This is enough for a person or an agent to start from.

Each example is separately copyable: the HTML sections are numbered, and the CSS and JS sections say
which examples need them.

## One sentence

A spinner is silent. Its state has to live in `aria-busy` and in a live region, never in the
animation.

## The contract

| Piece | What it is | Why |
| --- | --- | --- |
| `.ac-btn .ac-btn-loading` | both classes | the base is [Button](../button/)'s, copied |
| `aria-busy="true"` | the state | it is also the CSS selector that draws the spinner, so you cannot show one without setting it |
| `aria-disabled="true"` | while busy | a second press does nothing and announces "unavailable". **Never `disabled`** |
| `aria-hidden="true"` on the spinner | keeps it out of the name | it has nothing to say |
| a sibling `role="status"` | the announcement | rendered and **empty** before anything happens |
| `type="button"` | not submitting a form | the default is `submit` |
| the accessible name | **unchanged**, always | see below |

## `aria-busy` is not enough on its own

It is a global ARIA state and it is well-formed on a button, but screen readers announce it
inconsistently — some read "busy", some say nothing at all. So it is the machine-readable half of
the state, and the live region is the half that actually speaks. Ship both.

Example 2 puts two spinners next to each other. The **spinner-only** one is drawn by a private
`data-` attribute instead of `aria-busy`; it animates identically and its readout never moves.
Nothing about it is invalid, and no automated check reports it.

## Never `disabled` while loading

`disabled` removes the tab stop the instant it is set, so the browser drops focus to the document
body. Three things break at once:

- The reader loses their place — <kbd>Tab</kbd> starts again from the top of the page.
- The status they just caused is announced somewhere they are no longer standing.
- Nothing explains why the control went away, because a disabled button announces nothing at all.

`aria-disabled="true"` plus a click guard gives you the lock without any of that. The guard is one
capture-phase listener on a container, lifted from [Button](../button/) — capture matters, because a
handler bound on the button itself only wins if it was registered first. `preventDefault` covers
<kbd>Enter</kbd> and <kbd>Space</kbd> for free.

Example 3 prints `document.activeElement` right after each press.

## The name has to stay still

Swapping "Save" for "Saving…" renames the control mid-operation. A screen reader announces the name
of the thing under the cursor, so a reader parked on the button hears a *different button arrive*,
and a voice-control user who says "click Save" a second later finds nothing (SC 2.5.3). The status
goes in the region; the button keeps its name. [Switch](../switch/) and
[Input Group](../input-group/) follow the same rule for their confirmations.

Example 4 records the accessible name at each phase. The **renames itself** button ends with three.

## The spinner is decoration

It is `aria-hidden`, and it is gated on `--ac-motion` like every other animation here — so at
`--ac-motion: 0` it stops turning. It must still show that something is pending. Two things make
that work:

- The ring **appears** when the button goes busy (`visibility: hidden` → `visible`), which is a
  change with or without motion. The gap in the ring is a shape the resting button does not have.
- The status line says "Saving…" either way.

Example 5's dot is the counter-example: always visible, pending signaled only by the pulse. Turn
motion off in that panel and its busy state is pixel-identical to its resting state.

**SC 2.2.2 is a separate obligation.** A spinner that runs past five seconds needs a way to stop or
a state that survives without it, whether or not anyone asked for reduced motion. See
[Motion Preferences](../motion-preferences/).

## Why `visibility: hidden` and not `display: none`

`visibility: hidden` keeps the layout box, so the button is the same width busy and idle. Without
it the button grows when it goes pending and moves out from under the pointer that just pressed it.
(That kept box is usually the bug — see [Visually Hidden](../visually-hidden/) — and here it is the
reason.)

## States

| State | Signaled by | Not by |
| --- | --- | --- |
| busy | the spinner appearing, `aria-busy`, and the status text | never the rotation alone |
| busy, to a pointer | `cursor: progress` | — |
| unavailable while busy | `aria-disabled` + the click guard | never `disabled`, and no dimming — that is opacity over a color nobody chose |
| focus | a 3px `:focus-visible` ring at 2px offset | never the border |

Under `forced-colors: active` the ring itself survives, because it is a `border` on `currentColor` —
it becomes `ButtonText` with the label. **Its gap does not.** Forced colors replaces `border-color`
wholesale, and `transparent` comes back *opaque*, so the ring closes into a full circle and stops
reading as turning. The gap has to be repainted in the button's own forced-colors background
(`ButtonFace`, and `Highlight` on hover). A `box-shadow` or gradient spinner would have been dropped
outright, with nothing that brings it back.

## Keyboard

Nothing to write. A native `<button>` arrives with a tab stop, and <kbd>Enter</kbd> and
<kbd>Space</kbd> both wired to a click — which is why the guard needs no key handler.

| Key | Result |
| --- | --- |
| <kbd>Tab</kbd> / <kbd>Shift</kbd> + <kbd>Tab</kbd> | move to and from the button, busy or not |
| <kbd>Enter</kbd> | activate, or nothing while busy |
| <kbd>Space</kbd> | activate, or nothing while busy |

## Screen reader behavior

Not yet tested against a screen reader. What the markup asks for: "Save set list, button" on the way
in, then "Saving…" from the status region, then "Set list saved." The name is the same at all three
points.

`aria-busy` announcements vary and that variance is the argument for the region, not against the
attribute — it is still what a scripted check and any future AT will read.

## API

```js
const c = AC.createLoadingButton(container);

c.setBusy(button, true, 'Saving…', region);   // the component
c.setBusy(button, false, 'Saved.', region);
c.refresh();                                  // re-run this page's readouts
c.destroy();
```

Idempotent: calling it twice on the same element returns the existing instance. `setBusy` is the
only part worth lifting — everything else in `component.js` is this page checking its own claims.

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

## What to watch for

- **A spinner and nothing else.** The whole component.
- **`disabled` while loading.** Focus is gone and so is the explanation.
- **A label that becomes the status.** One control, three names.
- **A region created when there is something to say.** It has to already be in the accessibility
  tree — see [Live Region](../live-region/).
- **The same message twice.** Setting a region to the string it already holds announces nothing;
  clear it a frame first.
- **A pending cue that is only an animation.** It disappears under reduced motion.
- **A button that resizes when it goes busy.** Reserve the spinner's box.
