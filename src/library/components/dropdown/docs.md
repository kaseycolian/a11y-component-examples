## Before you copy

These files are a working reference, not a package. Move the markup into your own templates and the
state into your own code. What has to survive that move is the ARIA below, the keyboard behavior, and
where focus goes — those are the parts that make the component accessible, and the parts that are
usually dropped.

Every example on this page is numbered and separately copyable. The CSS and JS sections name which
examples need them.

## Required markup

| Element | Attributes |
| --- | --- |
| Trigger | `aria-haspopup="listbox"`, `aria-expanded`, `aria-controls`, and `aria-labelledby` pointing at **both** the field label and the value element |
| Panel | `role="listbox"`, `aria-labelledby` pointing at the field label |
| Option | `role="option"`, `aria-selected`, `tabindex="-1"`, `data-value` |
| Disabled option | `aria-disabled="true"` and no `tabindex` |
| Group | `role="group"` with `aria-label`; the visible label text is `aria-hidden` so it is not announced twice |

The trigger's name is composed as *"&lt;label&gt;, &lt;current value&gt;"*, which is how a native
`<select>` announces. It **references** the value element rather than copying its text, so the name
updates itself whenever the selection changes — no JavaScript involved in keeping it right.

The `<label>`'s `for` points at the trigger. A `<button>` is a labelable element, so clicking the
label reaches it the way clicking a label reaches a native select, and `aria-labelledby` still wins
the name so the value survives.

**This needs JavaScript.** Without it you get a button that does nothing. That is the honest cost of
a custom listbox, and it is why [Native Select](../native-select/) exists alongside it — a real
`<select>` needs no script and gets the OS picker on a phone. Reach for this one when you need styled
rows.

### It is markup, not a script that writes markup

The trigger, the panel, every option, every group and every swatch are authored in `component.html`.
Nothing in the code panel is a preview of something the script assembles later, so the whole ARIA
contract is readable without opening a devtools inspector.

That is not only a copyability argument. A component that builds itself has two descriptions of
itself — the markup and the builder — and they drift. Here there is one. The script does what markup
cannot: opens the panel, keeps it anchored to its trigger, moves focus between options, and commits a
choice.

### Decorating an option

Three optional pieces, all authored inside the option:

```html
<div class="ac-dropdown__option" role="option" tabindex="-1" data-value="prod" aria-selected="true">
  <svg class="ac-dropdown__icon" aria-hidden="true" focusable="false"><use href="#ac-icon-rocket" /></svg>
  <span class="ac-dropdown__text">
    <span class="ac-dropdown__primary">Production</span>
    <span class="ac-dropdown__secondary">app.example.com</span>
  </span>
  <span class="ac-dropdown__check" aria-hidden="true">&check;</span>
</div>
```

There is a deliberate split, and it is worth being precise about:

- **The icon, the swatch and the tick are decoration.** All three are `aria-hidden="true"`, so no
  symbol name leaks into the option's accessible name. If an icon carries meaning the text does not,
  that is a bug in your content — put the meaning in the text.
- **`.ac-dropdown__secondary` is content.** It is ordinary text and *is* part of the accessible name,
  so the option above announces as "Production app.example.com". Which host a target deploys to is
  information a screen reader user needs as much as a sighted one. Do not put visual filler in it.

The tick is a real character in the markup rather than a `::before`, because CSS generated content
joins the accessible name and would rename the option.

Swatch colors are written inline in the HTML. That is the one place a literal color belongs in this
library: it comes from the author's data rather than the stylesheet, which is why the token linter has
nothing to say about it.

The trigger shows the option's `.ac-dropdown__primary` text — not the option's `textContent`, which
also carries the tick and any secondary line.

## Keyboard

| Key | Closed | Open |
| --- | --- | --- |
| <kbd>Tab</kbd> | Move on | Close, then move on |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | Open | Choose the focused option, close, return focus |
| <kbd>↓</kbd> / <kbd>↑</kbd> | Open | Move between options, wrapping at both ends |
| <kbd>Home</kbd> / <kbd>End</kbd> | Open at first / last | Jump to first / last |
| <kbd>Esc</kbd> | — | Close without changing the value, return focus |
| Any letter | Choose the first match | Jump to the first match |

Type-ahead accumulates for 800ms, so typing `st` lands on "Staging" rather than jumping to the first
`s` and then the first `t`. It matches on the option's `.ac-dropdown__primary` text. Disabled options
are skipped by both arrows and type-ahead.

**Keys deliberately not bound.** <kbd>Shift</kbd> and <kbd>Ctrl</kbd> with the arrows, which is the
next section.

### Multiple selection is not supported

It has a different keyboard model — <kbd>Shift</kbd>+arrows to extend, <kbd>Ctrl</kbd>+arrows to move
without selecting — a different dismissal model, and `aria-multiselectable` on top. Bolting it onto
this one would give the component two keyboard stories, and only one of them would have been reviewed.
[Native Select](../native-select/) has `multiple`, and the browser supplies the whole model.

## States

Every one of these is an attribute in the markup, so nothing has to be kept in sync with a class:

| State | Signaled by | Never signaled by |
| --- | --- | --- |
| open | `aria-expanded="true"` on the trigger, and the panel loses `hidden`. | — |
| selected | `aria-selected="true"`, drawn with a tick as well as a color (SC 1.4.1). | The color alone. |
| focused option | Real DOM focus, drawn with a solid border. | A background tint alone — a 16% wash does not reach the 3:1 SC 1.4.11 asks of a state indicator. |
| disabled | `aria-disabled="true"` on the trigger, never the `disabled` attribute, so the control stays focusable and a keyboard user can reach it and hear why. | Removing the tab stop. A `disabled` button is skipped and announces nothing. |
| disabled option | `aria-disabled="true"` and no `tabindex`, so it is announced and skipped rather than removed. | Deleting the row — then nobody learns the option exists. |
| empty | A message in the panel saying what is missing rather than "no results", and the trigger shows the same. | Silence. The panel keeps `role="listbox"` and takes focus itself, so opening it reads the message out. |

Under `forced-colors: active` every tint is dropped, so the `[FORCED]` block rebuilds each cue out of
system colors. The tick and the focused option's border survive, because neither was a fill.

## Screen reader behavior

Expected: `"Deploy target, Production, has popup listbox, collapsed"` on the trigger, `"expanded"`
after it opens, then `"Production app.example.com, selected, 1 of 3"` as focus lands on the first
option. A group announces its `aria-label` on the way in; a disabled option announces as
`"South America (at capacity), dimmed"` and cannot be reached with the arrows.

**Not yet verified against real assistive technology.** Until `docs/at-support.md` has a row for this
component, treat the above as intent, not measurement.

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

## Positioning

The panel is `position: fixed` and, where the browser supports it, promoted to the **top layer** with
the Popover API. That is the fix for the most common way a custom select breaks in a real layout: an
absolutely-positioned panel is clipped the moment any ancestor has `overflow: hidden` or a
`transform`, and no amount of `z-index` rescues it.

It re-anchors on `scroll` and `resize` rather than computing its position once at open time, so it
cannot drift away from its trigger. It matches the trigger's width, clamps itself inside the viewport,
and **flips above the trigger** when there is little room below and more room above — at which point
the root gets `.ac-dropdown--up`, in case you want to square off the adjoining corners.

**This is deliberately the behavior at every viewport width.** Turning into a panel that rises from
the bottom of the screen on a phone is a different component with a different focus and dismissal
model, and it is the [Drawer](../drawer/), not this. An earlier version of this file did both; the
result was one component with two keyboard stories, which is harder to copy and harder to trust.

Rows get larger under `@media (pointer: coarse)` rather than at a width breakpoint, because a finger
needs a bigger target on a tablet in landscape too, and a mouse does not need one just because the
window is narrow.

Browsers without the Popover API fall back to a plain `position: fixed` panel. The only thing lost is
top-layer stacking. The attribute is written in the markup, where it is inert on a browser that does
not know it.

## API

```js
const dd = AC.createDropdown(rootEl);   // the .ac-dropdown element

dd.value();            // -> the selected option's data-value, or null
dd.setValue('prod');   // select by value; fires nothing, because it is not a user choice
dd.refresh();          // re-read the option list after you changed it
dd.open();
dd.close();
dd.isOpen();           // -> boolean
dd.element;            // the root, if you need to position something against it
dd.destroy();          // unbinds; the markup is left as it was found
```

Idempotent: a second call on the same element returns the existing instance.

`data-value` on the root wins over the markup's `aria-selected` at startup, so a host page can write
the value before this script has run without caring which of the two lands first. The site header
sets the current theme that way.

### Where the value lives

The selected option is the one carrying `aria-selected="true"` — the same attribute a screen reader
reads, so there is no second copy to keep in sync. The root mirrors it as `data-value`, and choosing
an option dispatches a bubbling event:

```js
root.addEventListener('ac:dropdown:change', (event) => {
  event.detail.value;   // the chosen option's data-value
  event.detail.option;  // the option element itself
});
```

**In a form**, add one hidden input inside the root and the script mirrors the value into it:

```html
<div class="ac-dropdown" data-ac-dropdown>
  …
  <input type="hidden" name="speed" value="next-day" data-ac-dropdown-input />
</div>
```

That is the whole of form participation — `FormData` and a plain submit both read it like any other
field. Example 6 is this; examples 1 to 5 are not, and none of them ships the input.

## Using it in a framework

Delete the auto-init block at the bottom of `component.js` and call the factory from your own
lifecycle. In React:

```jsx
const ref = useRef(null);

useEffect(() => {
  const dd = AC.createDropdown(ref.current);
  ref.current.addEventListener('ac:dropdown:change', onChange);
  return () => dd.destroy();
}, []);

// Options changed? dd.refresh(). Value set from outside? dd.setValue(v).
```

The script does not observe the option list, so `refresh()` after you change it is yours to call.

## Common mistakes

- **Shipping it where JavaScript may not run.** With the script off, the trigger is a button that does
  nothing. [Native Select](../native-select/) is the answer then, and the better default on a phone
  regardless.
- **A trigger named by its label alone.** It never announces what is currently selected. Point
  `aria-labelledby` at the value element as well. The script appends the value element's id if you
  leave it out, but the markup is the better place to say it.
- **`aria-activedescendant` instead of real focus.** Legal, and unreliable on iOS VoiceOver and
  TalkBack. See the focus model above.
- **A hidden `<select>` behind the custom one.** One value now lives in two places and they drift. The
  hidden input in example 6 carries a value and nothing else — it has no options to disagree with.
- **A disabled option that keeps its `tabindex`.** The arrows then land on something inert. Leave the
  attribute off; that is what skips it.
- **A `<div>` as the trigger.** `aria-expanded` on something with no role announces nothing, and you
  owe the keyboard <kbd>Enter</kbd> and <kbd>Space</kbd> by hand.
- **Forgetting `refresh()` after changing options.** The row list is read at startup and when the panel
  opens; nothing observes it.
- **Duplicate ids.** They are written out in the markup so the wiring reads clearly. Paste a block
  twice and give the second copy its own, or the second trigger's `aria-controls` resolves to the first
  copy's panel.

Clicking the label opens the panel, because the click is forwarded to the trigger. That is the browser
doing what `<label for>` means, not a bug; drop the `for` if you would rather it only focused.

## Related

- [Native Select](../native-select/) — the plainer option. No script at all, and the better default on
  mobile because it gets the OS picker.
- [Drawer](../drawer/) — the same idea for a panel that comes from the edge of the screen.
- [Form Field](../field/) — `.ac-field`, `.ac-field__label` and `.ac-field__hint` are **canonical
  there**. They are repeated here so this file stands alone — change one, change both.
