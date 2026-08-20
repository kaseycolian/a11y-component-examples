## Before you copy

These files are a working reference, not a package. Move the markup into your own templates and the
state into your own code. What has to survive that move is the ARIA below, the keyboard behavior, and
where focus goes — those are the parts that make the component accessible, and the parts that are
usually dropped.

Two of them matter more here than anywhere else: the real `<input>` has to stay under the paint, and
the state has to be readable without color.

Every example on this page is numbered and separately copyable. The CSS and JS sections name which
examples need them.

## Required markup

| Element | Attribute | What it does |
| --- | --- | --- |
| `<input>` | `type="checkbox"` | The real control. Everything drawn on top is decoration. |
| `<input>` | `role="switch"` | Optional. Changes the announcement to on/off — see below. |
| `<input>` | `aria-describedby` | Points at the reason a switch cannot be changed, and at the confirmation line where there is one. |
| `<label>` | `for` = the input's `id` | Names the switch and makes the whole row the target. |
| `.ac-switch__track` | `aria-hidden="true"` | The track and thumb are paint. Leaving them exposed adds an empty element to the name. |
| the confirmation | `role="status"` | Polite, and in the DOM from the start. Nothing has gone wrong, so it must not interrupt. |

### Name the thing, not the action

```html
<span class="ac-switch__text">Auto-archive orders</span>          <!-- yes -->
<span class="ac-switch__text">Turn on auto-archiving</span>       <!-- no -->
```

State is what `checked` is for. A label that changes with the state announces the state twice, and it
tells the person who just flipped it that a different control is now under their finger.

## Keyboard

All of it comes from the input. There is no keydown handler in `component.js`.

| Key | What it does |
| --- | --- |
| <kbd>Tab</kbd> / <kbd>Shift</kbd> + <kbd>Tab</kbd> | One stop per switch, including the `aria-disabled` one. The drawn track is not focusable. |
| <kbd>Enter</kbd> | Submits the form, if the switch is in one. It never toggles. |
| <kbd>Space</kbd> | Toggles the focused switch. |

**Keys deliberately not bound.** <kbd>Enter</kbd> as a second toggle key. It is not native checkbox
behavior, and adding it takes <kbd>Enter</kbd> away from the form it sits in.

## States

| State | Signaled by | Never signaled by |
| --- | --- | --- |
| on | The thumb slides to the far end, the track fills, and the label text thickens. | The track color alone (SC 1.4.1). |
| off | The thumb at the near end, an empty track. | — |
| focus | A 3px outline at 2px offset on the **track**, since the real input is transparent. | — |
| unavailable, soft | `aria-disabled="true"`: still focusable, still announced, and it explains itself through `aria-describedby`. | — |
| unavailable, hard | `disabled`: out of the tab order and not submitted. The track goes dashed. | Dimming alone. Low opacity reads as "ignore this" rather than "you cannot change this", and it is a contrast problem besides. |

### Two cues, never one

The track fills **and** the thumb moves. A switch whose only difference between states is the color of
the pill fails SC 1.4.1, and it is the most common way this component breaks — the thumb's position is
what someone reads when the two fills are indistinguishable to them.

Under `forced-colors: active` our accent is discarded entirely, so the fill is re-declared with
`forced-color-adjust: none` and system colors: our geometry, the user's palette.

### Unavailable, two ways

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

## Screen reader behavior

Expected: `"<label>, checkbox, checked"` or `"not checked"`. With `role="switch"` it becomes
`"<label>, switch, on"` or `"off"`. The locked switch in example 4 adds `"dimmed"` or `"unavailable"`
plus its description. The track and thumb are announced as nothing at all.

**Not yet verified against real assistive technology.** Until `docs/at-support.md` has a row for this
component, treat the above as intent, not measurement.

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

### Saying it out loud

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

## Checkbox or `role="switch"`

Both are correct. This library defaults to a plain checkbox because support is uniform everywhere,
including the older JAWS versions that announce `switch` inconsistently — and "Auto-archive orders,
checkbox, checked" is not ambiguous. Example 3 is the role version, one attribute added:

```html
<input type="checkbox" role="switch" checked />
```

The browser keeps every checkbox behavior — <kbd>Space</kbd> toggles, the label still works, the state
still comes from `checked` — and only the announced role changes: **on/off** instead of
**checked/unchecked**.

**Do not add `aria-checked` alongside it.** The browser maps `checked` for you, and a hand-written
value can only end up disagreeing. Reach for `role="switch"` when your audience is known, or when
"on/off" genuinely reads better than "checked" for the thing being switched.

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

## Common mistakes

- **A switch that waits for Save.** The shape of the control promised the change was already applied.
  Use a checkbox.
- **The track color as the only cue.** SC 1.4.1. The thumb has to move as well.
- **`display: none` on the input.** It removes the control from the accessibility tree and takes the
  keyboard with it. `opacity: 0`, kept over the track and at the same size, is the version that works.
- **A `<div role="switch">` with a keydown handler.** You then owe it <kbd>Space</kbd>, focusability,
  the label association, form submission and forced-colors — all of which the native input already has.
- **A label that changes with the state.** "Turn on X" becoming "Turn off X" renames the control the
  user just operated, and announces the state a second time.
- **`aria-checked` written alongside `role="switch"`.** The browser maps `checked`; the hand-written
  value can only disagree.
- **`disabled` where the person needs to know why.** A control the keyboard cannot reach cannot
  explain itself. Use `aria-disabled` and describe the reason.
- **`aria-disabled` with no click guard.** It is an announcement, not an enforcement — the checkbox
  underneath still toggles.
- **A tooltip as the only explanation** of why a switch is locked. Put it in `aria-describedby`.
- **Focus moved or the page navigated on toggle.** SC 3.2.2. Applying the setting is expected;
  rearranging the page is not.

## Related

`.ac-group` is canonical in [Fieldset](../fieldset-group/) and repeated here so this file stands
alone — change one, change both.

- [Checkbox](../checkbox/) — the same native input with the looser promise.
- [Reduced Motion](../motion-preferences/) — the site header's **Reduce motion** control is
  example 4 in production: it cannot honestly be changed when the OS already asks for reduced motion,
  but the reason has to stay reachable.
