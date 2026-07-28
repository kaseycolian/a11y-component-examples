## Before you copy

There is nothing to copy but CSS. This is a `<select>`, and every accessible thing about it is
already in the browser: the role, the value, the keyboard, type-ahead, the popup, and on a phone the
OS picker.

So the useful content here is a recommendation rather than an implementation. **Pick this over a custom
listbox unless you have a specific reason not to.** Your framework's select component is fine if it is
a wrapper around this element; if it renders `<div role="listbox">` instead, it has taken on the
keyboard model, the mobile behavior, and every screen reader difference by hand.

Each example on this page is separately copyable: the HTML sections are numbered, and the CSS sections
say which examples need them.

## Why this beats a custom dropdown

| | Native select | Custom listbox |
| --- | --- | --- |
| On a phone | the OS picker: full height, scrollable, platform gestures | a `div` you have to size, scroll and trap focus in |
| Keyboard | arrows, Home, End, type-ahead, page keys — free | reimplemented, and usually incompletely |
| Screen readers | the platform path, exercised by everything | your ARIA, exercised by your tests |
| Search on the page | the value is in the DOM | the value is in the DOM if you remembered |
| Cost | one element | a few hundred lines to maintain |

What you give up is the appearance of the *open* list. You cannot style the popup — no icons in rows,
no color swatches, no second line of text. That is the whole reason [Dropdown](../dropdown/) exists,
and it is the only reason to reach for it.

`appearance: none` restyles the closed control only. It is a paint change: the role, the value, and
the keyboard are untouched.

## The caret is two gradients, not an image

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

## Groups are native

`<optgroup label="…">` is announced as a group. There is nothing to build and nothing to keep in sync.

## The placeholder option is not a label

```html
<label for="tour">Tour leg</label>
<select id="tour" required>
  <option value="">Choose a leg</option>
```

`value=""` so `required` rejects it. The `<label>` is still the accessible name — a "Choose a leg"
first option used *as* the label disappears the moment something is chosen, leaving a control that
announces only its value.

## Disabled, and what it costs

A disabled **option** stays in the list, dimmed, and is announced as unavailable. Keep it: removing it
leaves the user wondering whether they missed something. The browser skips it with the arrow keys.

A disabled **select** is blunter. It is skipped by Tab and it explains nothing, and a native select has
no `readonly` to reach for instead. `aria-disabled` is not an option either — the browser will not
honor it, so the control stays operable while announcing that it is not.

So when the *reason* matters, do one of these instead:

- keep the select enabled and put the reason in the hint, letting validation reject the value; or
- render the value as text, with no control at all.

## `multiple` is left native on purpose

This is the one case where a styled listbox is a downgrade, which is why [Dropdown](../dropdown/)
refuses to enhance it. The keyboard model is genuinely different, and browsers already implement it:

| Key | Action |
| --- | --- |
| <kbd>↑</kbd> / <kbd>↓</kbd> | Move and select one |
| <kbd>Shift</kbd> + <kbd>↑</kbd> / <kbd>↓</kbd> | Extend the selection |
| <kbd>Ctrl</kbd> + <kbd>↑</kbd> / <kbd>↓</kbd> | Move without selecting |
| <kbd>Ctrl</kbd> + <kbd>Space</kbd> | Add or remove the focused option |
| <kbd>Ctrl</kbd> + <kbd>A</kbd> | Select all |

Set `size` so several rows are visible; without it, a `multiple` select renders as a four-row box that
looks like a bug.

Be honest about the ceiling, though: none of those modifiers are discoverable, and on touch a
`multiple` select is close to unusable. For more than a handful of options, a group of checkboxes is
kinder — see `fieldset-group`.

## What to watch for

- **Style the options too.** Windows and some Linux builds inherit the control's colors into the
  dropped list, which is how you end up with light text on a light background. Set `background-color`
  *and* `color` on `option` and `optgroup`.
- **Do not put `overflow: hidden` on a wrapper** expecting to clip the popup. The popup is not part of
  your layout, and the attempt only clips the focus ring.
- **`height` is not the tool.** Use `min-height` plus padding, so the control still grows with a
  page-level font-size preference.

## Related

[Dropdown](../dropdown/) is the styled-rows version, and says plainly what it costs.
[Field](../field/) is the canonical home for `.ac-field*`, repeated here so this file stands alone.
