## Before you copy

Your framework almost certainly has a dialog or sheet component, and it probably handles the layout
better than this one. **Check what it does with the four things below**, because these are what such
components usually get wrong: where focus goes on open, whether focus can escape while it is open,
where focus lands on close, and whether it claims `aria-modal` while leaving the page usable.

If you take nothing else from this file, take the focus story. Everything visual here is ten lines of
CSS; the rest decides whether a keyboard or screen reader user can use the panel at all.

Each example on this page is separately copyable: the HTML sections are numbered, and the CSS and JS
sections say which examples need them.

Consider `<dialog>` first. It gives you the top layer, `::backdrop`, Escape, and a focus trap from the
browser. This component exists for what `<dialog>` does not cover — a non-modal panel, an edge to slide
from, markup that reads before the script loads — and because the focus rules below are the same either
way.

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

## Keyboard

| Key | Action |
| --- | --- |
| <kbd>Enter</kbd> / <kbd>Space</kbd> on the trigger | Toggle |
| <kbd>Esc</kbd> | Close, return focus to the trigger |
| <kbd>Tab</kbd> / <kbd>Shift</kbd>+<kbd>Tab</kbd> | Cycle inside (modal); move on normally (non-modal) |

A non-modal drawer **ignores Escape when focus is outside it**, so it cannot swallow a key the user
aimed at something else.

## Modal or not — behavior, not a style flag

| What changes | Modal (default) | `data-ac-modal="false"` |
| --- | --- | --- |
| Role | `role="dialog"` | `role="region"` |
| `aria-modal` | `"true"` | **absent** |
| Backdrop | yes | no |
| Page scroll | locked | free |
| Focus trap | yes | no |
| Escape | always closes | closes only when focus is inside |

`aria-modal="true"` tells a screen reader to stop announcing everything outside the panel. Set it on a
drawer that leaves the page operable and you have described a modal while handing the user a page they
can still reach and can no longer hear. The role follows the behavior, so both are set in script from
one flag rather than trusted from the markup.

## Edges

`data-ac-edge="bottom | top | left | right"`, default `bottom`. One attribute rather than four
components, because nothing but the geometry changes.

Bottom and top span the width and cap at `min(80vh, 34rem)`; left and right span the height at
`min(22rem, 92vw)`. Both groups set `width` and `height` explicitly — the UA stylesheet gives
`[popover]` `fit-content` for both, so a side drawer that leaves `height` alone shrinks to its content
instead of spanning the edge it is pinned to.

## The slide is motion-gated

Closed is `transform: translateY(calc(var(--motion, 1) * 100%))`. Under `prefers-reduced-motion` or
`[data-motion="off"]`, `--motion` is 0, the transform collapses, and the panel **appears** rather than
slides. Correct behavior, not degraded.

## Scroll lock

`:root[data-ac-drawer-lock]` sets `overflow: hidden` plus `scrollbar-gutter: stable`, so locking does
not shift the page sideways as the scrollbar disappears. The body carries `overscroll-behavior:
contain`, so scrolling inside does not chain to the page behind. Nested modal drawers are counted, so
an inner one closing does not unlock the page while the outer one is still open.

## Top layer, and the backdrop's z-index

The panel is promoted to the top layer with the Popover API where available, so no ancestor with
`overflow: hidden` or a `transform` can clip it. `popover="manual"`, not `"auto"`: auto's light-dismiss
closes on any outside click before our own handlers see it, and it fights the Escape handling.

The **backdrop is not in the top layer**. Its `z-index: 900` is deliberately high and may still need
raising above your app's sticky chrome — if a sticky header outranks the backdrop, that header stays
clickable while a modal is open.

Browsers without the Popover API fall back to plain `position: fixed`. The only loss is top-layer
stacking.

## What to watch for

- **The close button is not optional.** On touch there is no Escape key and a backdrop tap is not
  discoverable, so a drawer without a visible close control is a trap (SC 2.1.2). It is 44×44 and
  carries `aria-label`, because its content is an icon — a bare X announces as "button" and nothing
  more.
- **Name the panel** with `aria-labelledby` pointing at the visible `<h2>`, not an `aria-label` that
  can drift out of sync with the title on screen.
- **The header sits outside the scrolling body**, so the title and close button stay reachable however
  far down you are.
- **The body needs `min-height: 0`.** A flex item's default `min-height: auto` floors it at content
  height; leave it out and long content overflows the panel and is clipped with no way to scroll to it.
- **A modal drawer's backdrop covers its own trigger**, so the trigger cannot be clicked again to
  close. That is correct — Escape, the close button, and the backdrop are the ways out.

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

## Related

[Dropdown](../dropdown/) anchors to its trigger at every viewport width, on purpose. If you want a
select that becomes a sheet on a phone, that is this component opened from the same button — two
behaviors kept as two components, rather than one component with two keyboard stories.
