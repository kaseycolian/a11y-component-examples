## How it works

A disclosure is one button and one panel. The button owns two attributes and the panel owns one:

| Element | Attribute | Why |
| --- | --- | --- |
| Trigger | `aria-expanded="true\|false"` | The only thing that tells a screen reader whether the panel is open. Without it the button announces as a plain button and the state is invisible. |
| Trigger | `aria-controls="<panel id>"` | Points at what it operates. JAWS and NVDA offer a shortcut to jump to the controlled element. |
| Panel | `hidden` | Removes it from the accessibility tree *and* the layout when closed. |

The trigger is a real `<button>`, which is the whole reason there is no keyboard code in
`component.js`. `Enter` and `Space` come free, it is in the tab order automatically, and it
announces as a button in every assistive technology.

The trigger sits inside an `<h3>`. That is not decoration &mdash; screen-reader users navigate by
heading far more often than by tabbing, and a disclosure that is a section of a page should be
reachable that way. Change the level to match your document outline. If the disclosure is *not* a
section heading, drop the wrapper and leave the bare button.

## Keyboard

| Key | Action |
| --- | --- |
| <kbd>Tab</kbd> | Move to the trigger, then past it into the panel if it is open |
| <kbd>Enter</kbd> | Toggle |
| <kbd>Space</kbd> | Toggle |

There is deliberately no <kbd>Escape</kbd> handler. Escape closes things that trap you &mdash;
dialogs, menus, popovers. A disclosure does not trap focus, so binding Escape would take a key away
from whatever surrounds it.

## Screen reader behaviour

Announced as `"<label>, button, collapsed"` / `"expanded"` in NVDA, JAWS, and VoiceOver. TalkBack
says `"double tap to expand"`, which is why the state has to live in `aria-expanded` rather than in
the visible chevron.

The panel carries `aria-labelledby` pointing at its trigger, so a user who lands inside the panel
by other means still hears which section they are in.

## Progressive enhancement

The panel is **open in the HTML source** and closed by the script on startup. Two consequences worth
knowing:

- Without JavaScript the content is still readable. It cannot be collapsed, but nothing is lost.
- Nothing flashes open before the script runs, because the closing happens synchronously during
  initialisation rather than after a paint.

If you would rather ship it closed, add `hidden` to the panel in your markup and set
`aria-expanded="false"` on the trigger &mdash; but then plan for the no-JS case yourself.

## Options

```js
// Auto-init reads this from the markup:
<div data-ac-disclosure data-ac-open>   // starts expanded

// Or drive it yourself:
const d = AC.createDisclosure(el, {
  open: true,
  onToggle: (open) => console.log(open ? 'opened' : 'closed'),
});

d.open();
d.close();
d.toggle();
d.isOpen();   // -> boolean
d.destroy();  // unbinds, restores the panel to visible
```

`createDisclosure` is idempotent: calling it twice on the same element returns the existing instance
rather than doubling up the listeners.

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

In Angular, call it in `ngAfterViewInit` and `destroy()` in `ngOnDestroy`. The pattern is the same
everywhere &mdash; the factory returns a handle, and the handle cleans up after itself.

## What to watch for

- **Animating the height.** If you want a slide, animate `grid-template-rows` on a wrapper rather
  than `height: auto`, and gate it behind `--ac-motion` the way the chevron rotation already is.
  Do not animate `hidden` &mdash; it is not a transitionable property, and removing it to animate
  reintroduces the accessibility-tree problem it solves.
- **Do not put the panel inside the button.** Interactive content nested in a button is not
  reachable by keyboard, and the button's accessible name becomes the entire panel's text.
- **One trigger, one panel.** If several triggers control one region, that is a tabs pattern, not a
  disclosure.
