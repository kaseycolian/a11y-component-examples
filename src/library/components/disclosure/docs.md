## Before you copy

These files are a working reference, not a package. Move the markup into your own templates and the
state into your own code. What has to survive that move is the ARIA below, the keyboard behavior, and
where focus goes — those are the parts that make the component accessible, and the parts that are
usually dropped.

Every example on this page is numbered and separately copyable. The CSS and JS sections name which
examples need them.

## Required markup

A button and the region after it. The button carries `aria-expanded` and `aria-controls`; the panel
carries `hidden` and `aria-labelledby`. That is the entire pattern.

The trigger is a real `<button>`, which is where the role, the tab stop, <kbd>Enter</kbd>,
<kbd>Space</kbd> and the accessible name come from — there is no keyboard code in `component.js` and
none to write.

| Element | Attribute | What it does |
| --- | --- | --- |
| `.ac-disclosure` | `data-ac-disclosure` | What the auto-init block looks for. Drop it if you construct instances yourself. |
| `.ac-disclosure` | `data-ac-open` | Optional. Starts this one expanded. Read once, at startup. |
| `.ac-disclosure__heading` | — | Optional `<h2>`–`<h6>` around the trigger. See below. |
| `<button>` | `type="button"` | Required. The default is `submit`, and a disclosure inside a form would submit it. |
| `<button>` | `aria-expanded="true\|false"` | The only thing that says whether the panel is open. Without it the button announces as a plain button and the state is invisible. |
| `<button>` | `aria-controls="<panel id>"` | Points at what it operates. JAWS and NVDA offer a shortcut to jump to the controlled element. |
| `.ac-disclosure__panel` | `hidden` | Removes the panel from the accessibility tree, the tab order **and** the layout at the same moment. |
| `.ac-disclosure__panel` | `aria-labelledby="<trigger id>"` | Names the panel after its trigger, so a reader who lands inside it still hears which section it is. |

`component.js` mints the two ids and writes `aria-controls` from the panel's real id, so the pair
cannot come apart later. Set your own ids in the markup and it leaves them alone.

### The heading level is yours, not the component's

The wrapper exists because screen-reader users navigate by heading far more often than by tabbing, and
a disclosure that is a *section of a page* should be reachable that way. Which level it is comes from
your document outline — this page runs `h1`, `h2`, `h3`, `h4`, so the demo headings are `h5`.

`.ac-disclosure__heading` sets `font-size: inherit` and `font-weight: inherit` for that reason: the
level has to be free to change without the control changing size.

When the disclosure is not a section — a "Show 2 more recipients" toggle inside a paragraph, which is
example 3 — drop the wrapper and leave the bare button. A heading there puts "Show 2 more recipients"
in the reader's heading list, which is worse than having no heading at all.

## Keyboard

A native `<button>` supplies all of this.

| Key | What it does |
| --- | --- |
| <kbd>Tab</kbd> / <kbd>Shift</kbd> + <kbd>Tab</kbd> | Moves to the trigger, then past it into the panel when the panel is open. |
| <kbd>Enter</kbd> | Toggles. |
| <kbd>Space</kbd> | Toggles. |

**Keys deliberately not bound.** <kbd>Esc</kbd> closes the things that trap you — dialogs, drawers,
menus, popovers — and a disclosure traps nothing. Focus is wherever the reader put it and
<kbd>Tab</kbd> always leaves. Binding it here takes the key away from whatever surrounds the
disclosure, which is often one of those dialogs.

There is no <kbd>Enter</kbd> or <kbd>Space</kbd> handler either, and adding one is a bug rather than
a redundancy: a native button already fires a *click* for both, so a keydown handler beside it toggles
twice.

## States

| State | Signaled by | Never signaled by |
| --- | --- | --- |
| collapsed | `aria-expanded="false"` on the trigger and `hidden` on the panel. | The chevron. It is `aria-hidden` and it is decoration. |
| expanded | `aria-expanded="true"`, the panel back in the flow, plus a rotated chevron and a tinted trigger. | The tint on its own (SC 1.4.1) — hence the rotation. |
| hover | The label moves toward the accent. | — |
| focus | A 3px `:focus-visible` ring, inset by 3px so it stays inside the rounded box. | — |

Under `forced-colors: active` the tint and the hover fill are dropped, so the expanded trigger is
repainted in `Highlight` / `HighlightText`. The chevron survives untouched, because a rotation is not
a color.

## Screen reader behavior

Expected: `"Order 462, button, collapsed"` on reaching the trigger, `"expanded"` after it is pressed,
and — for a reader who arrives inside the open panel by some other route — the trigger's own text as
the panel's name.

**Not yet verified against real assistive technology.** Until `docs/at-support.md` has a row for this
component, treat the above as intent, not measurement.

## Progressive enhancement

The panel is **open in the HTML source** and closed by the script during initialization. Two
consequences:

- Without JavaScript the content is still readable. It cannot be collapsed, and nothing is lost.
- Nothing flashes open before the script runs, because the close happens synchronously during
  initialization rather than after a paint.

To ship it closed instead, put `hidden` on the panel and `aria-expanded="false"` on the trigger in
your own markup — and then plan for the no-JavaScript case yourself, because the content is now
unreachable there.

## Disclosure or `<details>`

`<details>` and `<summary>` are less code and accessible by default. Reach for them first.

This version is what to use when you need the open state in JavaScript, an animated height, a trigger
that is not the first child, or markup between the trigger and the panel. It is also the more
predictable of the two to a screen reader: `<summary>` is announced differently across NVDA, JAWS and
VoiceOver, while a `<button>` with `aria-expanded` is a button with a state everywhere.

## API

```js
const d = AC.createDisclosure(root, {
  open: true,                                     // overrides data-ac-open
  onToggle: (open) => console.log(open),
});

d.open();
d.close();
d.toggle();
d.isOpen();   // -> boolean
d.destroy();  // unbinds, and leaves the panel visible
```

`root` is the `.ac-disclosure` element. `createDisclosure` is idempotent: calling it twice on the same
element returns the existing instance rather than doubling up the listeners.

`destroy()` restores the panel to visible rather than to its starting state, so the no-JavaScript
result is what is left behind.

## Using it in a framework

Delete the auto-init block at the bottom of `component.js` and call the factory from your own
lifecycle. In React:

```jsx
const ref = useRef(null);

useEffect(() => {
  const d = AC.createDisclosure(ref.current);
  return () => d.destroy();
}, []);
```

In Angular, call it in `ngAfterViewInit` and `destroy()` in `ngOnDestroy`.

## Common mistakes

- **`aria-expanded` on the panel.** It is the control's state, and nobody is standing on the panel to
  hear it. Example 4.
- **Hiding the panel with CSS.** `height: 0`, `opacity: 0` and `transform: scale(0)` leave the content
  in the accessibility tree and the tab order. Example 5 is a closed panel with a link still in it.
- **A `<div>` as the trigger.** No role, no tab stop, no <kbd>Enter</kbd> or <kbd>Space</kbd>, no
  accessible name. Example 6.
- **`aria-controls` naming an id nobody built.** Silent, invisible, and it survives a rename. Example
  7. Write it from the panel's real id.
- **Animating the height.** Animate `grid-template-rows` on a wrapper rather than `height: auto`, and
  gate it behind `--ac-motion` the way the chevron rotation already is. Never animate `hidden` — it is
  not a transitionable property, and removing it so you can animate reintroduces exactly the problem it
  solves.
- **The panel inside the button.** Interactive content nested in a button is not reachable by keyboard,
  and the button's accessible name becomes the whole panel's text.
- **One region, several triggers.** That is a tabs pattern, not a disclosure.

## Related

- [Tabs](../tabs/) — several panels where only one is shown at a time.
- [Drawer](../drawer/) — the same show-and-hide, but modal, and it owes you focus management.
- [Modal](../modal/) — where <kbd>Esc</kbd> does belong.
