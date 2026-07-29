## Before you copy

Your framework almost certainly has a nicer idiom for a form section than this. The ARIA attributes
and their wiring are the same either way, and this is enough for a person — or an agent — to start
from. **Check two things** in whatever you use: that the `<legend>` is really the first child of the
fieldset, and that a group-level error is reachable from the control the person is standing on.

Each example is separately copyable: the HTML sections are numbered, and the CSS and JS sections say
which examples need them.

## What a group is for

A checkbox labeled "Two clean towels" is a complete control and an incomplete thought. The legend
supplies the subject, so the announcement on the way in is "Rider, group" and every answer inside
inherits it.

Two situations need one:

- **Controls that share a question** — a set of checkboxes, or a radio group.
- **Controls that are parts of one answer** — hour and minute, day/month/year, the three lines of an
  address. This is the case people skip, and it is the one where the group is doing the most work.

A single control needs no fieldset. Its own `<label>` is already its name, and a group of one is
noise a screen reader user has to hear on the way past.

## The contract

| Element | Attribute | Why |
| --- | --- | --- |
| `<fieldset>` | — | is a group; needs no `role` |
| `<legend>` | **first child** | the group's accessible name |
| `<div class="ac-group__body">` | — | holds the layout, because a `<legend>` cannot be a flex item |
| each control | its own `<label for>` | names the part, not the question |
| the error | id on **every** control's `aria-describedby` | a fieldset's description is read inconsistently |

Do not put `role="group"` on a fieldset — it already is one, and adding it replaces working semantics
with hand-written ones. Do not use `aria-label` on the fieldset instead of a legend: the group is then
named for a screen reader and untitled for everyone else.

## The two fieldset quirks

They are the reason most teams quietly stop using the element:

- **`min-inline-size: min-content`.** A fieldset is the one box on a page that refuses to shrink below
  its widest child, which is where sideways scroll at 320px comes from (SC 1.4.10). `min-width: 0`
  fixes it and nothing else does.
- **A `<legend>` cannot be a flex or grid item**, and older Safari will not make a fieldset a flex
  container at all. Put the layout on an inner `<div>`. That is what `.ac-group__body` is.

Neither is a reason to reach for a `<div>` with a styled pseudo-legend. That trades two lines of CSS
for a group with no name.

## When the name has to be a heading

A `<legend>` is announced on entry, but it is **not a heading** — it never appears in the heading list
a screen reader user navigates a long form with. When a section is big enough that someone would want
to jump straight to it, name the group with a real heading (example 3):

```html
<div role="group" aria-labelledby="tech-name">
  <h4 id="tech-name">Technical rider</h4>
  …
</div>
```

`role="group"` is the fieldset's semantics without the element, so it **must** have `aria-labelledby`
or `aria-label` — there is no legend to fall back on. Two things you give up: `disabled` does not
cascade from it, and the form-data grouping a `<fieldset>` implies is gone. Prefer the fieldset unless
the heading is the point.

## Pick at least one

HTML cannot say it. `required` on a checkbox means **that box** must be checked, so "any one of these
will do" has no markup and needs a script. Example 4 is `data-ac-min="1"`, and the wiring matters more
than the rule:

- **The error id is on every checkbox's `aria-describedby`.** A fieldset's own description is
  announced inconsistently between NVDA, JAWS and VoiceOver, and never again once focus is on the
  third box. The control the person is standing on is the only place certain to be read.
- **`aria-invalid="true"` goes on the controls**, and the red border goes on the group. The answer is
  missing from the question, and the question is the fieldset.
- **The error element ships empty, in the HTML, with `role="alert"`.** A live region inserted along
  with its text gives a screen reader no change to notice.
- **The check waits until the group has been touched.** An error on a question nobody has answered yet
  is a scolding. It runs on `change`, and `validate()` is there for your submit handler (SC 3.3.1).

## Locked, two ways

| Behavior | `disabled` on the fieldset | `aria-disabled="true"` on the fieldset |
| --- | --- | --- |
| Cascades to the controls | **yes** — the one attribute that does | **no** — announces the group, changes nothing inside |
| Tab | every control skipped | everything still reachable |
| Submitted | no | yes |
| Can explain itself | no | yes, via `aria-describedby` |
| Needs JS | no | **yes**, per control |

`disabled` on a fieldset is genuinely useful: one attribute, no loop. The legend stays at full
strength, which is what tells someone what the locked group was for.

`aria-disabled` cascades to nothing, and that catches people out. To soft-lock a group you mark **each
control** as well and prevent its clicks — `component.js` does, and Space is covered because a
checkbox turns Space into a click. Prefer it whenever the user would want to know *why*: a control the
keyboard cannot reach cannot tell anyone anything.

One more trap in the hard version: **`input.disabled` reads `false`** for a control inside a disabled
fieldset. The IDL property reflects only the input's own attribute. Test and style on `:disabled`.

## Keyboard

There is nothing to learn. A group adds no keys — the controls inside keep exactly the behavior they
had.

| Key | Action |
| --- | --- |
| <kbd>Tab</kbd> | one stop per checkbox; a radio group is one stop for the whole set |
| <kbd>Space</kbd> | toggles a checkbox |
| <kbd>↑</kbd> <kbd>↓</kbd> <kbd>←</kbd> <kbd>→</kbd> | move *and select* within a radio group; nothing for checkboxes |

## Watch for

- **A nested fieldset three deep.** Legal, and announced as "group, group, group" with the innermost
  name last. One level of nesting is a structure; three is a maze.
- **The question repeated in every label** ("Doors open hour", "Doors open minute"). The legend already
  said it, so it is now said twice per field.
- **A `<div>` with a bold first line** standing in for a legend. It names nothing, and the group is
  invisible to anyone not looking at it.
- **A group error only at the top of the form.** Someone tabbing through will pass every control
  without hearing it. Put it in `aria-describedby` too.
- **Styling `[disabled]` instead of `:disabled`.** The attribute is on the fieldset; the state is on
  the controls.

## API

```js
const g = AC.createFieldsetGroup(el, { min: 1, message: 'Pick at least one.' });

g.count();          // -> how many are checked
g.validate();       // -> boolean, and shows the error
g.validate(false);  // -> boolean, silently: for enabling a submit button
g.inputs;           // the controls it found
g.destroy();        // clears the error and the describedby ids it added
```

Idempotent: calling it twice on the same element returns the existing instance. `min` and `message`
can come from `data-ac-min` / `data-ac-message` instead, so a server-rendered group needs no
per-instance script.

## Using it in a framework

Delete the auto-init block at the bottom of `component.js` and call the factory from your own
lifecycle. In React:

```jsx
const ref = useRef(null);

useEffect(() => {
  const g = AC.createFieldsetGroup(ref.current, { min: 1 });
  return () => g.destroy();
}, []);
```

If your framework owns validation, skip the factory and keep three things: the error id on every
control's `aria-describedby`, `aria-invalid` per control, and an error element that was already
mounted and empty.

## Related

This is the canonical home of `.ac-group`. [Radio group](../radio-group/), [checkbox](../checkbox/)
and [switch](../switch/) each carry a copy so their files stand alone — change one, change all of
them. [Field](../field/) is the single-control version: a label, a hint and an error for one input,
where no group is wanted.
