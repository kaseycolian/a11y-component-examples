## Before you copy

These files are a working reference, not a package. Move the markup into your own templates and the
state into your own code. What has to survive that move is the ARIA below, the keyboard behavior, and
where focus goes — those are the parts that make the component accessible, and the parts that are
usually dropped.

There is no JavaScript here, and there should not be in yours either. The arrow-key behavior that
custom radio components carefully reimplement is already in the browser, and it is the thing they most
often get wrong.

Every example on this page is numbered and separately copyable. The CSS sections name which examples
need them.

## Required markup

| Element | Attribute | What it does |
| --- | --- | --- |
| `<fieldset>` | — | The group itself. No `role="radiogroup"`: it already is one. |
| `<legend>` | — | The group's accessible name. First child of the fieldset, always. |
| `<input type="radio">` | `name` | Shared across the group. This one attribute is what makes it a group. |
| `<input type="radio">` | `value` | What gets submitted for the chosen option. |
| `<input type="radio">` | `required` | On every radio in the group. One is enough for the browser; all of them stays consistent when the markup is generated. |
| `<input type="radio">` | `aria-describedby` | On **every** radio, pointing at the hint and the error. Not on the fieldset alone — see below. |
| `<label>` | `for` = the input's `id` | One per radio. The whole row is the label, so the text is part of the 44px target (SC 2.5.8). |

### The shared `name` is the component

One attribute is doing almost everything:

- The browser treats the radios as **one control**, so Tab enters and leaves the group as a single
  stop rather than walking every option.
- The **arrow keys move between options and select as they go**. That is native radio behavior, and
  it is correct — for radios, moving *is* choosing.
- Only the checked radio is in the tab order, so returning to the form later lands on the answer.

Miss the `name` and you have three unrelated radios: Tab stops on each one, the arrow keys do nothing,
and the group is not a group to any screen reader.

### The `<legend>` is the group's name

A real `<legend>`, as the **first child** of the fieldset. Not a `<div>` styled to look like one, and
not `aria-label` on the fieldset.

Screen readers announce the legend when focus enters the group — "Refund method, group, Original
payment method, radio button, 1 of 3" — which is the only thing that makes the individual options make
sense. An option announced as "Store credit" alone tells the user nothing about the question.

And **no `role="radiogroup"`**. A fieldset with a legend already is one. Adding the role does not
improve anything and quietly signs you up for maintaining `aria-required` and the rest by hand.

### Per-option text belongs in the label

```html
<label for="growth">
  <span class="ac-choice__text">
    Growth
    <span class="ac-choice__note">Up to 462 orders, plus reporting.</span>
  </span>
</label>
```

Inside the `<label>`, the note is part of that radio's accessible name, so it is read in one pass and
cannot come apart from the option it explains. A separate `aria-describedby` also works, but
descriptions are skippable and verbosity settings vary.

Keep it to a line. It is announced every time the user arrows *past* the option, not only when they
settle on it.

### Two fieldset quirks

- **`min-width: 0`.** A fieldset's default `min-inline-size` is `min-content`, so one long unbreakable
  child pushes it wider than its container and the page scrolls sideways at 320px (SC 1.4.10).
- **Wrap the contents in a `<div>`.** A `<legend>` cannot be a flex item, and older Safari refuses to
  make a fieldset a flex container at all.

## Keyboard

All of it is the browser's. None of it is in this component.

| Key | What it does |
| --- | --- |
| <kbd>Tab</kbd> / <kbd>Shift</kbd> + <kbd>Tab</kbd> | Enters the group at the checked option, or the first if nothing is checked, and leaves the whole group in one press. |
| <kbd>Space</kbd> | Selects the focused option. |
| <kbd>↓</kbd> / <kbd>→</kbd> | Next option, selecting it, wrapping at the end. |
| <kbd>↑</kbd> / <kbd>←</kbd> | Previous option, selecting it, wrapping at the start. |

**Keys deliberately not bound.** All of them. The arrows selecting as they move is the behavior people
most often "fix" into a toolbar model, where the arrows only move focus. For radios that is wrong:
moving *is* choosing, and a screen reader user relies on it.

## States

| State | Signaled by | Never signaled by |
| --- | --- | --- |
| checked | The native dot, or the drawn one in example 5. | — |
| hover | The row's surface lifts. The whole label is the hit area. | — |
| focus | A 3px outline at 2px offset on the row, via `:focus-visible`. On a drawn control it is on the visible sibling, since the input is transparent. | — |
| invalid | `aria-invalid="true"` on **every** radio, only while the error shows. The border thickens on the **group**, and there is a message to read. | Color alone (SC 1.4.1). Two cues, always. |
| unavailable option | Dimmed, kept in the group, announced as unavailable. The reason is in its label. | Removing it. The user then cannot tell the option exists. |
| locked group | `disabled` on the `<fieldset>`, which disables every control inside it. The legend stays at full strength. | — |

The border thickens on the group rather than on each radio because the missing answer belongs to the
question, not to any one option.

### Do not pre-check a default

None of the options in example 1 is checked, on purpose. A pre-checked radio is an answer the user
never gave, and it is submitted as though they had. Check one only when it genuinely is the expected
choice — never on a question with money, permissions, or data retention attached.

If you need "no answer yet" to be selectable *back*, radios cannot do it: once one is chosen the group
cannot be cleared without a script. Add an explicit "No preference" option instead.

### Disabled

A disabled **radio** stays in the group and is announced as unavailable. Keep it, so the user learns
the option exists, and put the reason in its label, because a disabled control cannot explain itself.

`disabled` on the **`<fieldset>`** disables every control inside it. One attribute, no loop. Note that
`input.disabled` still reads `false` for those inputs: the IDL property reflects the control's own
attribute, while the fieldset's disabling is inherited. Test with `:disabled` — which is also what your
CSS has to select on.

## Screen reader behavior

Expected on entering the group: `"<legend>, group, <option>, radio button, 1 of 3"`, then each option
as focus moves, with `"selected"` and `"unavailable"` where they apply. A per-option note inside the
label is read as part of the option's name, every time.

**Not yet verified against real assistive technology.** Until `docs/at-support.md` has a row for this
component, treat the above as intent, not measurement.

## Errors go on every radio

```html
<input type="radio" name="invoice" required aria-invalid="true"
       aria-describedby="invoice-hint invoice-error" />
```

The error's id is repeated on **every** radio's `aria-describedby` rather than sitting on the fieldset
alone. A fieldset's own description is read inconsistently — NVDA and JAWS read it entering the group,
VoiceOver often skips it, and none of them read it again once focus is on the third option, which is
exactly where someone will be when they try to fix the error.

The error text lives in a `role="alert"` that is present in the markup from the start. Inserting an
alert element and its text together gives a screen reader nothing to notice.

## Drawing your own control

If `accent-color` is not enough, keep the real input and hide it with **`opacity: 0`** — never
`display: none` or `visibility: hidden`, either of which removes it from the accessibility tree and
takes the keyboard with it.

Everything visible is then a sibling reacting to `:checked` and `:focus-visible` on the real input, and
the focus ring has to be drawn on that sibling, since the input itself is transparent.

Under `forced-colors: active` the drawn dot loses `box-shadow` and `color-mix` and would go blank, so
this component re-declares it with `forced-color-adjust: none` and system colors — the user's palette,
our geometry.

Prefer `accent-color` where you can. It keeps the platform's dot, animation, and High Contrast
handling, and changes only the hue.

## Common mistakes

- **No shared `name`.** The radios are then unrelated: Tab stops on each one, the arrows do nothing,
  and no screen reader calls it a group.
- **`role="radiogroup"` on a fieldset.** It already is one, and the role commits you to maintaining
  the rest of the ARIA by hand.
- **A `<div>` styled to look like a legend.** It is not the group's name, so the options are
  announced without the question.
- **Arrows rebuilt to only move focus.** That is the toolbar model. For radios, moving is choosing.
- **An option pre-checked with no sensible default.** It submits an answer the user never gave, and
  hides that nothing was chosen.
- **The error only on the fieldset.** It is read inconsistently, and never again once focus is on the
  third option. Repeat it on every radio's `aria-describedby`.
- **The dot as the only target.** A 1rem circle is a 16px target and fails SC 2.5.8. Make the whole
  label row the target, at 44px.
- **`display: none` on the input to draw your own.** It leaves the accessibility tree and takes the
  keyboard with it. Use `opacity: 0`.
- **`min-width: 0` left off the fieldset.** Its default `min-inline-size: min-content` pushes the page
  sideways at 320px.

## Related

`.ac-group` and `.ac-group__legend` are canonical in [Fieldset Group](../fieldset-group/); `.ac-choice`
is canonical here and reused by [Checkbox](../checkbox/). Repeated where needed so each file stands
alone — change one, change both.

- [Native Select](../native-select/) — the same question when the list is long enough that showing
  every option stops helping.
