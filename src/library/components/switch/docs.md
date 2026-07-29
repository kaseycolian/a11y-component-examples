## Before you copy

Your framework almost certainly has a nicer idiom for a toggle than this. The ARIA attributes and
their wiring are the same either way, and this is enough for a person — or an agent — to start from.
**Check two things** in whatever you use: that the real `<input>` is still there under the paint (not
`display: none` behind a styled `div`), and that the state is not carried by the track color alone.

Each example is separately copyable: the HTML sections are numbered, and the CSS and JS sections say
which examples need them.

## A switch is a promise

It says **the change is already applied**. That is the whole difference from a checkbox, and it is the
easiest thing here to get wrong.

| The setting… | Use |
| --- | --- |
| takes effect the instant it is flipped | a switch |
| takes effect when a **Save** button is pressed | a checkbox |
| is one of a set where any combination is allowed | checkboxes |
| is one of a set where exactly one applies | a radio group |

If you draw a switch and then ask for Save, people will leave believing the change is live. The shape
of a control is a claim about its behavior.

## Checkbox or `role="switch"`

Both are correct. This library defaults to a plain checkbox because support is uniform everywhere,
including the older JAWS versions that announce `switch` inconsistently — and "Stage lights, checkbox,
checked" is not ambiguous. Example 3 is the role version, one attribute added:

```html
<input type="checkbox" role="switch" checked />
```

The browser keeps every checkbox behavior — <kbd>Space</kbd> toggles, the label still works, the state
still comes from `checked` — and only the announced role changes: **on/off** instead of
**checked/unchecked**.

**Do not add `aria-checked` alongside it.** The browser maps `checked` for you, and a hand-written
value can only end up disagreeing. Reach for `role="switch"` when your audience is known, or when
"on/off" genuinely reads better than "checked" for the thing being switched.

## Keyboard

| Key | Action |
| --- | --- |
| <kbd>Tab</kbd> | one stop per switch — including the `aria-disabled` one |
| <kbd>Space</kbd> | toggles |
| <kbd>Enter</kbd> | nothing, and that is the native behavior; do not add it |

All of it comes from the input. There is no keydown handler in `component.js`.

## Two cues, never one

The track fills **and** the thumb moves. A switch whose only difference between states is the color of
the pill fails SC 1.4.1, and it is the most common way this component breaks — the thumb's position is
what someone reads when the two fills are indistinguishable to them. The label text also thickens when
on, which is a third, cheap cue.

Under `forced-colors: active` our accent is discarded entirely, so the fill is re-declared with
`forced-color-adjust: none` and system colors: our geometry, the user's palette.

## Labels

Name the **thing**, not the action:

```html
<span class="ac-switch__text">Stage lights</span>          <!-- yes -->
<span class="ac-switch__text">Turn stage lights on</span>  <!-- no -->
```

State is what `checked` is for. A label that changes with the state announces the state twice, and it
tells the person who just flipped it that a different control is now under their finger.

## Saying it out loud

Example 2 confirms through a polite `role="status"`. Three details:

- **Polite, not `role="alert"`.** Nothing has gone wrong, and an alert interrupts whatever is being
  read.
- **The region exists, empty, in the HTML.** A live region inserted along with its text gives a screen
  reader no change to notice.
- **It is clipped off screen, not `display: none`** — which would take it out of the accessibility tree
  and stop it announcing anything at all.

The visible line beside it is `aria-hidden` and carries the same words, so the state is readable on
screen without being spoken twice.

This is also why nothing here moves focus or navigates on toggle (SC 3.2.2). Applying the setting is
expected; rearranging the page around the control is not.

## Unavailable, two ways

| Behavior | `disabled` | `aria-disabled="true"` |
| --- | --- | --- |
| Tab | skipped | still reachable |
| Announced | nothing | "dimmed" / "unavailable" |
| Can explain itself | no | yes, via `aria-describedby` |
| Submitted | no | yes |
| Needs JS | no | **yes** |

Prefer `aria-disabled` whenever the user would want to know *why* — which is most of the time. A
control the keyboard cannot reach cannot tell anyone anything.

It buys an obligation, though: `aria-disabled` is an announcement, and the browser will still toggle
the checkbox underneath it. `component.js` prevents the click, which covers <kbd>Space</kbd> too, since
a checkbox turns Space into a click.

## Watch for

- **`display: none` on the input.** It removes the control from the accessibility tree and takes the
  keyboard with it. `opacity: 0`, kept over the track and at the same size, is the version that works.
- **A `<div role="switch">` with a keydown handler.** You then owe it <kbd>Space</kbd>, focusability,
  the label association, form submission and forced-colors — all of which the native input already has.
- **A tooltip as the only explanation** of why a switch is locked. Put it in `aria-describedby`.
- **Toggling in a loop.** Each flip replaces the live region's text rather than appending, so ten fast
  flips do not queue ten announcements.

## API

```js
const s = AC.createSwitch(el, { onChange: (on) => console.log(on) });

s.state();      // -> boolean
s.set(true);    // flip from code, and announce it
s.refresh();    // re-read the input after changing it yourself
s.input;        // the real checkbox
s.destroy();    // unbinds and empties the live region
```

Idempotent: calling it twice on the same element returns the existing instance.

`set()` exists because assigning `.checked` fires no `change` event, so the announcement would
otherwise never be painted.

## Using it in a framework

Delete the auto-init block at the bottom of `component.js` and call the factory from your own
lifecycle. In React:

```jsx
const ref = useRef(null);

useEffect(() => {
  const s = AC.createSwitch(ref.current);
  return () => s.destroy();
}, []);
```

If your framework owns the state, skip the factory — render the confirmation into a `role="status"`
that is already mounted, and keep the `aria-disabled` click guard.

## Related

`.ac-group` is canonical in `fieldset-group` and repeated here so this file stands alone — change one,
change both. [Checkbox](../checkbox/) is the same native input with the looser promise. The site
header's **Reduce motion** control is example 4 in production: it cannot honestly be changed when the
OS already asks for reduced motion, but the reason has to stay reachable.
