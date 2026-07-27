## How it works

You author a plain, labelled `<select>`. The script hides it &mdash; keeping it in the DOM as the
value store &mdash; and builds the styled listbox next to it.

That matters more than it sounds. Because the native element is still there and still holds the
value:

- `select.value` and `select.selectedIndex` read correctly
- existing `change` listeners fire, because the event is dispatched on the `<select>` itself
- the field submits with the form, with no hidden input to keep in sync
- server-rendered markup works before the script loads, and degrades to a normal select if it never does

You can drop this onto an existing form and nothing downstream needs to know.

## Keyboard

| Key | Closed | Open |
| --- | --- | --- |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | Open | Choose the focused option, close, return focus |
| <kbd>↓</kbd> / <kbd>↑</kbd> | Open | Move between options, wrapping at the ends |
| <kbd>Home</kbd> / <kbd>End</kbd> | Open at first / last | Jump to first / last |
| <kbd>Esc</kbd> | &mdash; | Close without changing the value, return focus |
| <kbd>Tab</kbd> | Move on | Close, then move on |
| Any character | Select the first match | Jump to the first match |

Type-ahead accumulates for 800ms, so typing `st` quickly lands on "Staging" rather than jumping to
the first `s` and then the first `t`. Disabled options are skipped by both the arrows and type-ahead.

## The focus model, and why it is this one

When the panel opens, **DOM focus moves onto the option itself** &mdash; a roving `tabindex` across
the rows &mdash; rather than staying on the button with `aria-activedescendant` pointing at the
active row.

Both are permitted by the APG. Real focus is used here because `aria-activedescendant` is
unreliable on **VoiceOver for iOS** and on **TalkBack**, where the active option is often not
announced as it changes. Since mobile screen-reader support is a requirement for this library and
not a nice-to-have, the model that works on phones wins.

The trade-off is that this is the *listbox* pattern rather than the *select-only combobox* pattern,
so the trigger is `aria-haspopup="listbox"` on a button rather than `role="combobox"`. If you need
a true combobox &mdash; one with a text input you can type into to filter &mdash; this is not that
component.

## ARIA contract

| Element | Attributes |
| --- | --- |
| Trigger | `aria-haspopup="listbox"`, `aria-expanded`, `aria-controls`, and `aria-labelledby` pointing at **both** the field label and the value element |
| Panel | `role="listbox"`, `aria-labelledby` pointing at the field label |
| Option | `role="option"`, `aria-selected`, `tabindex="-1"` |
| Disabled option | `aria-disabled="true"` and no `tabindex` |
| `<optgroup>` | `role="group"` with `aria-label`; the visible label text is `aria-hidden` so it is not announced twice |

The trigger's name is composed as *"&lt;label&gt;, &lt;current value&gt;"*, which is how a native
`<select>` announces. It references the value element rather than copying its text, so the name
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

There is a deliberate split here, and it is worth being precise about:

- **`data-ac-icon` and `data-ac-swatch` are decoration.** Both render `aria-hidden="true"` and
  `focusable="false"`, so no symbol name leaks into the option's accessible name. If an icon carries
  meaning the text does not, that is a bug in your content &mdash; put the meaning in the text.
- **`data-ac-secondary` is content.** It renders as ordinary text and *is* part of the accessible
  name, so the option above announces as "Production app.example.com". That is intended: which host
  a target deploys to is information a screen-reader user needs as much as a sighted one. Do not put
  purely visual filler in it.

`data-ac-swatch` is the one place a literal color belongs in this library: it comes from the
author's data rather than the stylesheet, which is why the token linter does not flag it.

## Positioning, and the bug this avoids

The panel is `position: fixed` and, where the browser supports it, promoted to the **top layer**
with the Popover API. This is the fix for the most common way a custom dropdown breaks in a real
layout: an absolutely-positioned panel is clipped the moment any ancestor has `overflow: hidden` or
a `transform`, and no amount of `z-index` rescues it.

It also re-anchors on `scroll` and `resize` rather than computing its position once at open time,
so it does not drift away from its trigger.

**Below 640px the panel becomes a bottom sheet** &mdash; full width, pinned to the bottom, with a
visible title and a large close button. That removes the "does it fit above or below" question on
phones entirely instead of fighting it, and gives much bigger touch targets. The breakpoint is
`SHEET_BREAKPOINT` in `component.js` and the matching `@media` block in `component.css`; change
both together.

Browsers without the Popover API fall back to a plain `position: fixed` panel. The only thing lost
is top-layer stacking.

## States

- **Disabled select** &mdash; reflected as `aria-disabled` on the trigger, not the `disabled`
  attribute, so the control stays focusable and a keyboard user can still reach it and hear why it
  is unavailable. A `disabled` button is skipped by Tab and announces nothing.
- **Disabled option** &mdash; kept in the list with `aria-disabled="true"` rather than removed, so
  a screen-reader user learns the option exists. Struck through, and skipped by arrows and
  type-ahead.
- **Empty** &mdash; shows the text from `data-ac-empty-text`, or "No options available".
- **Selected** &mdash; marked with a tick as well as color, so it never depends on color alone.
- **Focused option** &mdash; a solid border, not just a background tint. A 16% wash does not reach
  the 3:1 contrast SC 1.4.11 asks of a state indicator.

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

Idempotent: calling it twice on the same element returns the existing instance.

The wrapper mirrors the native element's `hidden` and `disabled` attributes via a
`MutationObserver`, so app code that toggles either keeps working without knowing this exists.

## Using it in a framework

Delete the auto-init block at the bottom of `component.js` and drive it yourself. In React:

```jsx
const ref = useRef(null);

useEffect(() => {
  const dd = AC.createDropdown(ref.current);
  return () => dd.destroy();
}, []);

// Options changed? dd.rebuild(). Value set from outside? dd.sync().
return <select ref={ref} onChange={handleChange}>…</select>;
```

Because the value lives on the native `<select>`, React's own `onChange` fires normally &mdash; you
do not need a separate binding.

## Not supported

`<select multiple>` is **left native on purpose**. Multi-select has a different keyboard model
(<kbd>Shift</kbd>+arrows to extend, <kbd>Ctrl</kbd>+arrows to move without selecting) and a
different ARIA contract. Enhancing it with this code would quietly break it, so the script warns
and skips it.

## What to watch for

- **Give it a real label.** `<label for>`, `aria-labelledby`, or `aria-label` &mdash; the script
  forwards whichever it finds onto the visible control. With none of them, the trigger announces as
  a bare button with only its value.
- **Call `rebuild()` after changing options.** The rows are built once; the script does not observe
  the option list.
- **`aria-describedby` is forwarded too**, so hint and error text attached to the `<select>` reaches
  the visible control.
