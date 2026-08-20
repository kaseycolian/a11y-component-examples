## Before you copy

These files are a working reference, not a package. Move the markup into your own templates and the
state into your own code. What has to survive that move is the ARIA below, the keyboard behavior, and
where focus goes — those are the parts that make the component accessible, and the parts that are
usually dropped.

Two of them carry this component: the `<legend>` really being the first child, and a group-level error
being reachable from the control the person is standing on.

Every example on this page is numbered and separately copyable. The CSS and JS sections name which
examples need them. Only examples 4 and 5 need JavaScript.

## Required markup

| Element | Attribute | What it does |
| --- | --- | --- |
| `<fieldset>` | — | Is a group. It needs no `role`. |
| `<legend>` | **first child** | The group's accessible name. Anywhere else, it names nothing. |
| `<div class="ac-group__body">` | — | Holds the layout, because a `<legend>` cannot be a flex item. |
| each control | its own `<label for>` | Names the part, not the question. The legend already said the question. |
| each control | `aria-describedby` | Carries the group's error. A fieldset's own description is read inconsistently. |
| a group that cannot be a fieldset | `role="group"` + `aria-labelledby` | The fieldset's semantics without the element — see below. |
| the error | `role="alert"` | In the markup from the start, empty. |

Do not put `role="group"` on a fieldset — it already is one, and adding it replaces working semantics
with hand-written ones. Do not use `aria-label` on the fieldset instead of a legend: the group is then
named for a screen reader and untitled for everyone else.

### What a group is for

A checkbox labeled "Signature required" is a complete control and an incomplete thought. The legend
supplies the subject, so the announcement on the way in is "Delivery instructions, group" and every
answer inside inherits it.

Two situations need one:

- **Controls that share a question** — a set of checkboxes, or a radio group.
- **Controls that are parts of one answer** — hour and minute, day/month/year, the three lines of an
  address. This is the case people skip, and it is the one where the group is doing the most work.

A single control needs no fieldset. Its own `<label>` is already its name, and a group of one is noise
a screen reader user has to hear on the way past.

### The two fieldset quirks

They are the reason most teams quietly stop using the element:

- **`min-inline-size: min-content`.** A fieldset is the one box on a page that refuses to shrink below
  its widest child, which is where sideways scroll at 320px comes from (SC 1.4.10). `min-width: 0`
  fixes it and nothing else does.
- **A `<legend>` cannot be a flex or grid item**, and older Safari will not make a fieldset a flex
  container at all. Put the layout on an inner `<div>`. That is what `.ac-group__body` is.

Neither is a reason to reach for a `<div>` with a styled pseudo-legend. That trades two lines of CSS
for a group with no name.

## Keyboard

There is nothing to learn. A group adds no keys — the controls inside keep exactly the behavior they
had.

| Key | What it does |
| --- | --- |
| <kbd>Tab</kbd> / <kbd>Shift</kbd> + <kbd>Tab</kbd> | One stop per control. A fieldset is not one stop, though a radio group inside it is. |
| <kbd>Space</kbd> | Toggles a checkbox. |
| <kbd>↑</kbd> / <kbd>↓</kbd> / <kbd>←</kbd> / <kbd>→</kbd> | Move *and select* within a radio group. Nothing at all for checkboxes. |

**Keys deliberately not bound.** All of them. A fieldset that intercepts <kbd>Tab</kbd> to make itself
a single stop has invented a widget out of a label.

## States

| State | Signaled by | Never signaled by |
| --- | --- | --- |
| invalid | A 2px border on the **group**, an error with a drawn marker, and `aria-invalid="true"` on each control. | Color alone (SC 1.4.1). The border, the marker and the message are three cues. |
| locked, hard | `disabled` on the `<fieldset>`, which cascades to every control. A dashed border, and the legend at full strength. | — |
| locked, soft | `aria-disabled="true"` on the fieldset **and** on each control, with the reason in `aria-describedby`. | Dimming alone, which reads as "ignore this" rather than "you cannot change this". |

The error goes on the controls and the border goes on the group, because the answer is missing from the
question, and the question is the fieldset.

### Locked, two ways

| Behavior | `disabled` on the fieldset | `aria-disabled="true"` on the fieldset |
| --- | --- | --- |
| Cascades to the controls | **yes** — the one attribute that does | **no** — announces the group, changes nothing inside |
| Tab | every control skipped | everything still reachable |
| Submitted | no | yes |
| Can explain itself | no | yes, via `aria-describedby` |
| Needs JS | no | **yes**, per control |

`disabled` on a fieldset is genuinely useful: one attribute, no loop. The legend stays at full strength,
which is what tells someone what the locked group was for.

`aria-disabled` cascades to nothing, and that catches people out. To soft-lock a group you mark **each
control** as well and prevent its clicks — `component.js` does, and <kbd>Space</kbd> is covered because
a checkbox turns Space into a click. Prefer it whenever the user would want to know *why*: a control the
keyboard cannot reach cannot tell anyone anything.

One more trap in the hard version: **`input.disabled` reads `false`** for a control inside a disabled
fieldset. The IDL property reflects only the input's own attribute. Test and style on `:disabled`.

## Screen reader behavior

Expected on entering the group: `"<legend>, group"`, then each control by its own label. The legend is
the subject, never part of the control's name. In example 3 the same announcement comes from the
heading `role="group"` points at, and that heading also appears in the heading list.

**Not yet verified against real assistive technology.** Until `docs/at-support.md` has a row for this
component, treat the above as intent, not measurement.

## When the name has to be a heading

A `<legend>` is announced on entry, but it is **not a heading** — it never appears in the heading list
a screen reader user navigates a long form with. When a section is big enough that someone would want
to jump straight to it, name the group with a real heading (example 3):

```html
<div role="group" aria-labelledby="invoice-options">
  <h4 id="invoice-options">Invoice options</h4>
  …
</div>
```

The heading level comes from your page's outline, not from the component. Example 3 uses an `<h5>`
only because this demo page nests it under an `<h4>`.

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
- **`aria-invalid="true"` goes on the controls**, and the border goes on the group.
- **The error element ships empty, in the HTML, with `role="alert"`.** A live region inserted along
  with its text gives a screen reader no change to notice.
- **The check waits until the group has been touched.** An error on a question nobody has answered yet
  is a scolding. It runs on `change`, and `validate()` is there for your submit handler (SC 3.3.1).

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

## Common mistakes

- **A `<div>` with a bold first line** standing in for a legend. It names nothing, and the group is
  invisible to anyone not looking at it.
- **`aria-label` on the fieldset instead of a legend.** The group is named for a screen reader and
  untitled for everyone else.
- **The legend not the first child.** Anywhere else in the fieldset, it stops being the name.
- **`role="group"` added to a fieldset.** It already is one, and the role replaces working semantics
  with hand-written ones.
- **`role="group"` with no `aria-labelledby`.** There is no legend to fall back on, so the group has
  no name at all.
- **The question repeated in every label** ("Pickup time hour", "Pickup time minute"). The legend
  already said it, so it is now said twice per field.
- **A group error only at the top of the form.** Someone tabbing through will pass every control
  without hearing it. Put it in `aria-describedby` too.
- **`min-width: 0` left off.** A fieldset will not shrink below its widest child, and the page scrolls
  sideways at 320px.
- **A `<legend>` used as a flex item.** Older Safari refuses. Put the layout on an inner `<div>`.
- **Styling `[disabled]` instead of `:disabled`.** The attribute is on the fieldset; the state is on
  the controls.
- **A nested fieldset three deep.** Legal, and announced as "group, group, group" with the innermost
  name last. One level of nesting is a structure; three is a maze.

## Related

This is the canonical home of `.ac-group`. [Radio Group](../radio-group/), [Checkbox](../checkbox/)
and [Switch](../switch/) each carry a copy so their files stand alone — change one, change all of
them.

- [Form Field](../field/) — the single-control version: a label, a hint and an error for one input,
  where no group is wanted.
