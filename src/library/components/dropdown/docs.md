## Before you copy

Your framework has a select component, and it may well be better integrated than this one. **Check
what it does with the four things below**, because these are what such components usually get wrong:
the accessible name of the trigger, whether focus is real or `aria-activedescendant`, whether the
panel is in the top layer, and whether a disabled option is still discoverable.

If you only take one idea from this file, take the first one.

Each example on this page is separately copyable: the HTML sections are numbered, and the CSS and JS
sections say which examples need them.

## It is a real `<select>` underneath

You author a plain, labeled `<select>`. The script hides it — keeping it in the DOM as the value
store — and builds the styled listbox beside it. Because the native element is still there and still
holds the value:

- `select.value` and `select.selectedIndex` read correctly
- existing `change` listeners fire, because the event is dispatched on the `<select>` itself
- the field submits with the form, with no hidden input to keep in sync
- server-rendered markup works before the script loads, and degrades to a normal select if it never does

You can drop this onto an existing form and nothing downstream needs to know. The site header's own
theme picker is exactly this: a native `<select>` with a `change` listener that predates the styling.

## Keyboard

| Key | Closed | Open |
| --- | --- | --- |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | Open | Choose the focused option, close, return focus |
| <kbd>↓</kbd> / <kbd>↑</kbd> | Open | Move between options, wrapping at both ends |
| <kbd>Home</kbd> / <kbd>End</kbd> | Open at first / last | Jump to first / last |
| <kbd>Esc</kbd> | — | Close without changing the value, return focus |
| <kbd>Tab</kbd> | Move on | Close, then move on |
| Any character | Select the first match | Jump to the first match |

Type-ahead accumulates for 800ms, so typing `st` lands on "Staging" rather than jumping to the first
`s` and then the first `t`. Disabled options are skipped by both arrows and type-ahead.

## The focus model, and why it is this one

When the panel opens, **DOM focus moves onto the option itself** — a roving `tabindex` across the
rows — rather than staying on the button with `aria-activedescendant` pointing at the active row.

Both are permitted by the APG. Real focus is used here because `aria-activedescendant` is unreliable
on **VoiceOver for iOS** and on **TalkBack**, where the active option is often not announced as it
changes. Mobile screen reader support is a requirement for this library, so the model that works on
phones wins.

The trade-off is that this is the *listbox* pattern rather than the *select-only combobox* pattern, so
the trigger is a button with `aria-haspopup="listbox"` rather than `role="combobox"`. If you need a
true combobox — a text input you type into to filter — this is not that component.

## ARIA contract

| Element | Attributes |
| --- | --- |
| Trigger | `aria-haspopup="listbox"`, `aria-expanded`, `aria-controls`, and `aria-labelledby` pointing at **both** the field label and the value element |
| Panel | `role="listbox"`, `aria-labelledby` pointing at the field label |
| Option | `role="option"`, `aria-selected`, `tabindex="-1"` |
| Disabled option | `aria-disabled="true"` and no `tabindex` |
| `<optgroup>` | `role="group"` with `aria-label`; the visible label text is `aria-hidden` so it is not announced twice |

The trigger's name is composed as *"&lt;label&gt;, &lt;current value&gt;"*, which is how a native
`<select>` announces. It **references** the value element rather than copying its text, so the name
updates itself whenever the selection changes.

## Decorating options

All optional, all authored on the `<option>`:

```html
<option value="prod"
        data-ac-icon="ac-icon-rocket"        <!-- <use href="#ac-icon-rocket"> from a sprite -->
        data-ac-swatch="#ff2ec4,#5bff3a"     <!-- a color strip; comma separated -->
        data-ac-secondary="app.example.com"  <!-- a muted second line -->
        >Production</option>
```

There is a deliberate split, and it is worth being precise about:

- **`data-ac-icon` and `data-ac-swatch` are decoration.** Both render `aria-hidden="true"`, so no
  symbol name leaks into the option's accessible name. If an icon carries meaning the text does not,
  that is a bug in your content — put the meaning in the text.
- **`data-ac-secondary` is content.** It renders as ordinary text and *is* part of the accessible
  name, so the option above announces as "Production app.example.com". Which host a target deploys to
  is information a screen reader user needs as much as a sighted one. Do not put visual filler in it.

`data-ac-swatch` is the one place a literal color belongs in this library: it comes from the author's
data rather than the stylesheet, which is why the token linter does not flag it.

## Positioning

The panel is `position: fixed` and, where the browser supports it, promoted to the **top layer** with
the Popover API. That is the fix for the most common way a custom dropdown breaks in a real layout: an
absolutely-positioned panel is clipped the moment any ancestor has `overflow: hidden` or a
`transform`, and no amount of `z-index` rescues it.

It re-anchors on `scroll` and `resize` rather than computing its position once at open time, so it
cannot drift away from its trigger. It matches the trigger's width, clamps itself inside the viewport,
and **flips above the trigger** when there is little room below and more room above — at which point
the wrapper gets `.ac-dropdown--up`, in case you want to square off the adjoining corners.

**This is deliberately the behavior at every viewport width.** Turning into a panel that rises from
the bottom of the screen on a phone is a different component with a different focus and dismissal
model, and it is the [Drawer](../drawer/), not this. An earlier version of this file did both; the
result was one component with two keyboard stories, which is harder to copy and harder to trust.

Rows get larger under `@media (pointer: coarse)` rather than at a width breakpoint, because a finger
needs a bigger target on a tablet in landscape too, and a mouse does not need one just because the
window is narrow.

Browsers without the Popover API fall back to a plain `position: fixed` panel. The only thing lost is
top-layer stacking.

## States

- **Disabled select** — reflected as `aria-disabled` on the trigger, not the `disabled` attribute, so
  the control stays focusable and a keyboard user can reach it and hear why it is unavailable. A
  `disabled` button is skipped by Tab and announces nothing.
- **Disabled option** — kept in the list with `aria-disabled="true"` rather than removed, so a screen
  reader user learns the option exists. Struck through, and skipped by arrows and type-ahead.
- **Empty** — shows `data-ac-empty-text`, or "No options available". Say what is missing rather than
  "no results".
- **Selected** — marked with a tick as well as color, so it never rests on color alone (SC 1.4.1).
- **Focused option** — a solid border, not just a background tint. A 16% wash does not reach the 3:1
  contrast SC 1.4.11 asks of a state indicator.

## API

```js
const dd = AC.createDropdown(selectEl, { emptyText: 'Nothing saved yet' });

dd.rebuild();   // re-read the <select> after you changed its options
dd.sync();      // re-read the value after setting select.value programmatically
dd.open();
dd.close();
dd.isOpen();    // -> boolean
dd.element;     // the wrapper, if you need to position something against it
dd.destroy();   // unbinds, unwraps, restores the native <select>
```

Idempotent: a second call on the same element returns the existing instance.

The wrapper mirrors the native element's `hidden` and `disabled` via a `MutationObserver`, so app code
that toggles either keeps working without knowing this exists.

To drive it from a framework lifecycle, delete the auto-init block:

```jsx
useEffect(() => {
  const dd = AC.createDropdown(ref.current);
  return () => dd.destroy();
}, []);

// Options changed? dd.rebuild(). Value set from outside? dd.sync().
return <select ref={ref} onChange={handleChange}>…</select>;
```

Because the value lives on the native `<select>`, React's own `onChange` fires normally — no separate
binding needed.

## Not supported

`<select multiple>` is **left native on purpose**. Multi-select has a different keyboard model
(<kbd>Shift</kbd>+arrows to extend, <kbd>Ctrl</kbd>+arrows to move without selecting) and a different
ARIA contract. Enhancing it with this code would quietly break it, so the script warns and skips it.

## What to watch for

- **Give it a real label.** `<label for>`, `aria-labelledby`, or `aria-label` — the script forwards
  whichever it finds onto the visible control. With none, the trigger announces as a bare button with
  only its value.
- **Call `rebuild()` after changing options.** The rows are built once; the script does not observe the
  option list.
- **`aria-describedby` is forwarded too**, so hint and error text attached to the `<select>` reaches
  the visible control.
- **A `<label for>` no longer focuses the control by clicking**, because its target is the hidden
  native `<select>`. The label is still the accessible name, which is what matters; if click-to-focus
  is important to you, bind it yourself.

## Related

`.ac-field`, `.ac-field__label` and `.ac-field__hint` are **canonical in the [Field](../field/)
component**. They are repeated here so this file stands alone — change one, change both.

[Drawer](../drawer/) is the same idea for a panel that comes from the edge of the screen.
`native-select` is the plainer option, and is the better default on mobile because it gets the OS
picker.
