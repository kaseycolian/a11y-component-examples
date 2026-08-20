## Before you copy

These files are a working reference, not a package. Move the markup into your own templates and the
state into your own code. What has to survive that move is the ARIA below, the keyboard behavior, and
where focus goes — those are the parts that make the component accessible, and the parts that are
usually dropped.

Every example on this page is numbered and separately copyable. The CSS and JS sections name which
examples need them.

## Required markup

| Element | Attribute | What it does |
| --- | --- | --- |
| trigger `<button>` | `type="button"` | Required. The default is `submit`. |
| trigger | `aria-expanded` | Whether the drawer is showing. The script keeps it in step. |
| trigger | `aria-controls="<drawer id>"` | Points at the panel it opens. |
| `.ac-drawer` | `role="dialog"` | Modal drawers. `role="region"` when not modal — see States. |
| `.ac-drawer` | `aria-modal="true"` | **Modal only.** A claim about the page, not a style. |
| `.ac-drawer` | `aria-labelledby="<title id>"` | Points at the visible `<h2>`, not an `aria-label` that can drift out of sync with it. |
| `.ac-drawer` | `hidden` | Closed. The panel leaves the accessibility tree and the tab order with the screen. |
| `.ac-drawer` | `data-ac-edge` | `bottom` (default), `top`, `left`, `right`. |
| `.ac-drawer` | `data-ac-modal="false"` | Opts out of the backdrop, the scroll lock and the focus trap. |
| close `<button>` | a real accessible name | The visible way out. Its content is an icon, so it carries `aria-label`. |

The close button is not optional. On touch there is no <kbd>Esc</kbd> key and a backdrop tap is not
discoverable, so a drawer without a visible close control is a trap (SC 2.1.2). It is 44×44.

### Edges

`data-ac-edge="bottom | top | left | right"`, default `bottom`. One attribute rather than four
components, because nothing but the geometry changes.

Bottom and top span the width and cap at `min(80vh, 34rem)`; left and right span the height at
`min(22rem, 92vw)`. Both groups set `width` and `height` explicitly — the UA stylesheet gives
`[popover]` `fit-content` for both, so a side drawer that leaves `height` alone shrinks to its content
instead of spanning the edge it is pinned to.

## Keyboard

| Key | What it does |
| --- | --- |
| <kbd>Tab</kbd> / <kbd>Shift</kbd> + <kbd>Tab</kbd> | Cycles inside while the drawer is modal. Moves on normally when it is not. |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | Activates the trigger, which toggles the drawer. Native to `<button>`. |
| <kbd>Esc</kbd> | Closes, and focus returns to the trigger. |

A non-modal drawer **ignores <kbd>Esc</kbd> when focus is outside it**, so it cannot swallow a key the
user aimed at something else.

**Keys deliberately not bound.** Arrows. A drawer is a container and does not own the keys of whatever
you put inside it — example 2 holds a `<nav>`, and its links behave like links.

## States

| State | Signaled by | Never signaled by |
| --- | --- | --- |
| closed | `hidden` on the panel and `aria-expanded="false"` on the trigger. | The slide transform alone. Something transformed off screen is still in the tab order. |
| open | The panel losing `hidden`, `aria-expanded="true"`, and focus moving inside. | Position alone. |
| modal | `role="dialog"` plus `aria-modal="true"`, a backdrop, a scroll lock and a focus trap — all five, or none of them. | Any subset. See below. |
| non-modal | `role="region"`, no `aria-modal`, and the page still operable. | Claiming `aria-modal` anyway. |

Under `forced-colors: active` the backdrop tint and the panel's shadow are dropped, so the `[FORCED]`
block gives the panel a real border. The edge it is pinned to is geometry and survives untouched.

### Modal or not is behavior, not a style flag

| What changes | Modal (default) | `data-ac-modal="false"` |
| --- | --- | --- |
| Role | `role="dialog"` | `role="region"` |
| `aria-modal` | `"true"` | **absent** |
| Backdrop | yes | no |
| Page scroll | locked | free |
| Focus trap | yes | no |
| <kbd>Esc</kbd> | always closes | closes only when focus is inside |

`aria-modal="true"` tells a screen reader to stop announcing everything outside the panel. Set it on a
drawer that leaves the page operable and you have described a modal while handing the user a page they
can still reach and can no longer hear. The role follows the behavior, so both are set in script from
one flag rather than trusted from the markup.

### Scroll lock

`:root[data-ac-drawer-lock]` sets `overflow: hidden` plus `scrollbar-gutter: stable`, so locking does
not shift the page sideways as the scrollbar disappears. The body carries `overscroll-behavior:
contain`, so scrolling inside does not chain to the page behind. Nested modal drawers are counted, so
an inner one closing does not unlock the page while the outer one is still open.

### The slide is motion-gated

Closed is `transform: translateY(calc(var(--motion, 1) * 100%))`. Under `prefers-reduced-motion` or
`[data-motion="off"]`, `--motion` is 0, the transform collapses, and the panel **appears** rather than
slides. Correct behavior, not degraded.

## Screen reader behavior

Expected: `"Filters, button, collapsed"` on the trigger, then `"Filters, dialog"` as focus moves
inside a modal drawer, with everything outside it no longer reachable. The non-modal one announces as
a region and leaves the rest of the page where it was.

**Not yet verified against real assistive technology.** Until `docs/at-support.md` has a row for this
component, treat the above as intent, not measurement.

## The focus story

| When | What must happen | Why |
| --- | --- | --- |
| On open | Focus moves to the first focusable element inside, or to the panel itself | Otherwise the user is told a panel opened and left standing outside it |
| While open, modal | <kbd>Tab</kbd> and <kbd>Shift</kbd>+<kbd>Tab</kbd> cycle inside | Tab must not wander behind a backdrop nobody can see past |
| On close | Focus returns to the trigger | Never dumped at `<body>`, which loses the user's place in the page |

Focus moves out **before** the panel is hidden. Hide the element holding focus and the browser drops
focus to `<body>`, which is the failure the third row exists to prevent.

The trap collects focusable elements by `getClientRects().length`, not `offsetParent`: `offsetParent`
is `null` for any `position: fixed` element, and this panel is fixed, so the usual visibility check
would find nothing.

## Top layer, and the backdrop's z-index

The panel is promoted to the top layer with the Popover API where available, so no ancestor with
`overflow: hidden` or a `transform` can clip it. `popover="manual"`, not `"auto"`: auto's light-dismiss
closes on any outside click before our own handlers see it, and it fights the Escape handling.

The **backdrop is not in the top layer**. Its `z-index: 900` is deliberately high and may still need
raising above your app's sticky chrome — if a sticky header outranks the backdrop, that header stays
clickable while a modal is open.

Browsers without the Popover API fall back to plain `position: fixed`. The only loss is top-layer
stacking.

## API

```js
const d = AC.createDrawer(el, { modal: true, edge: 'right', onOpen, onClose });

d.open();
d.close();
d.isOpen();    // -> boolean
d.isModal;     // backdrop, scroll lock and focus trap, or none of them
d.element;
d.destroy();   // closes, unlocks, drops its backdrop, unbinds, strips aria-expanded
```

Idempotent: calling it twice on the same element returns the existing instance.

## Using it in a framework

Delete the auto-init block at the bottom of `component.js` and call the factory from your own
lifecycle. In React:

```jsx
const ref = useRef(null);

useEffect(() => {
  const d = AC.createDrawer(ref.current, { edge: 'right' });
  return () => d.destroy();
}, []);
```

## Common mistakes

- **Focus left behind on the page.** The panel opens, the announcement says so, and the person is
  still standing outside it. The next <kbd>Tab</kbd> starts from the top of the document.
- **`aria-modal="true"` on a drawer that leaves the page usable.** A screen reader stops announcing
  everything outside the panel, and the panel is not actually holding anyone there.
- **No visible close control.** Touch has no <kbd>Esc</kbd> key and a backdrop tap is not
  discoverable, so the panel is a trap (SC 2.1.2).
- **`popover="auto"`.** Its light-dismiss closes on any outside click before your own handlers see it,
  and it fights a custom <kbd>Esc</kbd> handler. Use `manual`.
- **`overflow: hidden` alone for the scroll lock.** The scrollbar disappears and the whole layout
  jumps sideways. `scrollbar-gutter: stable` alongside it reserves the space.
- **`role="listbox"` on the drawer itself.** A drawer is a container. Whatever goes inside keeps its
  own semantics — example 2 holds a `<nav>` and it is still a `<nav>`.
- **A body without `min-height: 0`.** A flex item's default `min-height: auto` floors it at content
  height; leave it out and long content overflows the panel and is clipped with no way to scroll to it.
- **Expecting the trigger to close a modal drawer.** Its own backdrop covers it. That is correct —
  <kbd>Esc</kbd>, the close button and the backdrop are the ways out.

## Related

- [Modal](../modal/) — consider it first. A native `<dialog>` with `showModal()` gives you the top
  layer, `::backdrop`, <kbd>Esc</kbd> and the focus trap from the browser. This component exists for
  what `<dialog>` does not cover: a non-modal panel, an edge to slide from, and markup that reads
  before the script loads.
- [Custom Select](../dropdown/) — anchors to its trigger at every viewport width, on purpose. If you
  want a select that becomes a sheet on a phone, that is this component opened from the same button —
  two behaviors kept as two components, rather than one component with two keyboard stories.
- [Disclosure](../disclosure/) — the non-modal answer when the content belongs in the page rather than
  over it.
