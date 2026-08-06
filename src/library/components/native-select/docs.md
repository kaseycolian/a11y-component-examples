## Before you copy

These files are a working reference, not a package. Move the markup into your own templates and the
state into your own code. What has to survive that move is the ARIA below, the keyboard behavior, and
where focus goes — those are the parts that make the component accessible, and the parts that are
usually dropped.

Here there is nothing to copy but CSS. This is a `<select>`, and every accessible thing about it is
already in the browser: the role, the value, the keyboard, type-ahead, the popup, and on a phone the
OS picker. **Pick it over a custom listbox unless you have a specific reason not to.**

Every example on this page is numbered and separately copyable. The CSS sections name which examples
need them.

## Required markup

| Element | Attribute | What it does |
| --- | --- | --- |
| `<label>` | `for` = the select's `id` | Names the control. The first option is never the label. |
| `<select>` | `aria-describedby` | Points at the hint, and at the error when there is one. A space-separated list — see [Form Field](../field/). |
| `<select>` | `required` | Rejects the empty-valued prompt option, with no script. |
| `<optgroup>` | `label` | Grouping is native and announced as a group. There is nothing to build and nothing to keep in sync. |
| `<option>` | `value` | What gets submitted. The prompt option carries `value=""`. |
| `<option>` | `disabled` | Keeps an unavailable choice in the list, announced as unavailable, skipped by the arrow keys. |

`appearance: none` restyles the closed control only. It is a paint change: the role, the value, and
the keyboard are untouched.

### The caret is two gradients, not an image

```css
background-image:
  linear-gradient(45deg, transparent 50%, currentColor 50%),
  linear-gradient(135deg, currentColor 50%, transparent 50%);
```

No file to ship, and it inherits `color`, so it follows the theme and the disabled state without a
second rule. The right padding is oversized to clear it, or a long option runs underneath it.

Under `forced-colors: active`, `background-image` is dropped — so the component sets `appearance: auto`
and hands the control back to the UA, which draws its own arrow. Losing the styling is the correct
trade: the arrow is what tells the user this is a select at all.

### The prompt option is not a label

```html
<label for="assignee">Assign to</label>
<select id="assignee" required>
  <option value="">Choose a person</option>
```

`value=""` so `required` rejects it. The `<label>` is still the accessible name — a "Choose a person"
first option used *as* the label disappears the moment something is chosen, leaving a control that
announces only its value.

## Keyboard

All of it is the browser's, and none of it is reimplemented here. The exact popup behavior differs by
platform; what follows holds everywhere.

| Key | What it does |
| --- | --- |
| <kbd>Tab</kbd> / <kbd>Shift</kbd> + <kbd>Tab</kbd> | Moves to and from the control. A `disabled` select is skipped. |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | <kbd>Space</kbd> opens the list. <kbd>Enter</kbd> submits the form from a closed select. |
| <kbd>↓</kbd> / <kbd>↑</kbd> | Moves through the options, skipping the disabled ones. |
| <kbd>Home</kbd> / <kbd>End</kbd> | Jumps to the first or last option. |
| <kbd>Shift</kbd> + <kbd>↓</kbd> / <kbd>↑</kbd> | Extends the selection. `multiple` only. |
| <kbd>Ctrl</kbd> + <kbd>↓</kbd> / <kbd>↑</kbd> | Moves without selecting. `multiple` only. |
| <kbd>Ctrl</kbd> + <kbd>Space</kbd> | Adds or removes the focused option. `multiple` only. |
| <kbd>Ctrl</kbd> + <kbd>A</kbd> | Selects every option. `multiple` only. |
| Any letter | Type-ahead: jumps to the next option whose **text** starts with it. |

**Keys deliberately not bound.** All of them. Every row above is free, and a component that intercepts
any of these has taken on the whole model — including the parts it did not notice, like type-ahead and
the platform popup.

## States

| State | Signaled by | Never signaled by |
| --- | --- | --- |
| hover | The border takes the blue accent. | — |
| focus | A 3px outline at 2px offset, via `:focus-visible`. | — |
| unavailable option | Dimmed, kept in the list, and announced as unavailable. The arrow keys skip it. | Removing it. The user then cannot tell the choice exists. |
| disabled control | A dashed border and reduced opacity. Skipped by <kbd>Tab</kbd>, and not submitted. | — |
| invalid | `aria-invalid="true"` on the control, **only while the error shows**. The border goes to 2px and there is a message to read. | Color alone (SC 1.4.1). Two cues, always. |

Under `forced-colors: active` the component hands the control back to the UA with `appearance: auto`,
because the gradient caret is dropped along with every other `background-image`.

### Disabled, and what it costs

A disabled **option** stays in the list, dimmed, and is announced as unavailable. Keep it: removing it
leaves the user wondering whether they missed something.

A disabled **select** is blunter. It is skipped by Tab and it explains nothing, and a native select has
no `readonly` to reach for instead. `aria-disabled` is not an option either — the browser will not
honor it, so the control stays operable while announcing that it is not.

So when the *reason* matters, do one of these instead:

- keep the select enabled and put the reason in the hint, letting validation reject the value; or
- render the value as text, with no control at all.

## Screen reader behavior

Expected: `"<label>, combobox, <selected option>"`, plus the group name when the options sit in an
`<optgroup>`, and `"unavailable"` on a disabled option. With `multiple` the role changes to listbox and
the announcement changes with it.

**Not yet verified against real assistive technology.** Until `docs/at-support.md` has a row for this
component, treat the above as intent, not measurement.

## Why this beats a custom dropdown

| Behavior | Native select | Custom listbox |
| --- | --- | --- |
| On a phone | the OS picker: full height, scrollable, platform gestures | a `div` you have to size, scroll and trap focus in |
| Keyboard | arrows, Home, End, type-ahead, page keys — free | reimplemented, and usually incompletely |
| Screen readers | the platform path, exercised by everything | your ARIA, exercised by your tests |
| Search on the page | the value is in the DOM | the value is in the DOM if you remembered |
| Cost | one element | a few hundred lines to maintain |

What you give up is the appearance of the *open* list. You cannot style the popup — no icons in rows,
no color swatches, no second line of text. That is the whole reason [Dropdown](../dropdown/) exists,
and it is the only reason to reach for it.

## `multiple` is left native on purpose

This is the one case where a styled listbox is a downgrade, which is why [Dropdown](../dropdown/)
refuses to enhance it. The keyboard model is genuinely different, browsers already implement it, and
the four modifier rows in the table above are what a replacement would have to rebuild.

Set `size` so several rows are visible; without it, a `multiple` select renders as a four-row box that
looks like a bug.

Be honest about the ceiling, though: none of those modifiers are discoverable, and on touch a
`multiple` select is close to unusable. For more than a handful of options, a group of checkboxes is
kinder — see [Fieldset Group](../fieldset-group/).

## Common mistakes

- **`appearance: none` with no caret drawn back.** The control then looks like a text field, and
  nothing says it opens.
- **A custom listbox where this would have done.** You take on the keyboard model, the mobile
  behavior and every screen reader difference, and the only thing you gain is styled rows.
- **The first option used as the label.** "Choose a person" is a value, not a name, and it vanishes
  the moment someone chooses.
- **Options left unstyled.** Windows and some Linux builds inherit the control's colors into the
  dropped list, which is how you end up with light text on a light background. Set `background-color`
  *and* `color` on `option` and `optgroup`.
- **Styling options beyond color.** The OS picker ignores it, so the effort buys nothing and the two
  renderings drift apart.
- **An unavailable option removed instead of disabled.** The choice silently stops existing.
- **`aria-disabled` on a select.** The browser does not honor it: the control stays operable while
  announcing that it is not.
- **`overflow: hidden` on a wrapper**, expecting to clip the popup. The popup is not part of your
  layout, and the attempt only clips the focus ring.
- **`height` used to size it.** Use `min-height` plus padding, so the control still grows with a
  page-level font-size preference.
- **`multiple` with no `size`.** It renders as a four-row box that reads as a bug.

## Related

[Dropdown](../dropdown/) is the styled-rows version, and says plainly what it costs.
[Form Field](../field/) is the canonical home for `.ac-field*`, repeated here so this file stands alone.
