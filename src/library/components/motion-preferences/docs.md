## Before you copy

These files are a working reference, not a package. Move the markup into your own templates and
the state into your own code. What has to survive that move is the ARIA below, the keyboard
behavior, and where focus goes — those are the parts that make the component accessible, and the
parts that are usually dropped.

The state can live wherever your app already keeps state — a store, a context, a class set on
`<html>` by the server. **The three CSS rules and the attribute contract are the same either way**,
and they are the part that decides whether a reader's system setting survives your page.

Every example on this page is numbered and separately copyable. The CSS and JS sections name which
examples need them. Example 2 sets the gate that the other four read, so copy that one first.

## Required markup

One token, resolving to `1` or `0`, that everything else multiplies by.

| Element | Attribute | What it does |
| --- | --- | --- |
| the scope — `<html>` in your app | `class="ac-motion-scope"` | Defines `--ac-motion`. It inherits, so one declaration reaches every component. |
| the same element | `data-motion="off"` | The page's opt-out, written by the toggle. An attribute, so CSS can see it without JavaScript running first. |
| the same element | *no* `data-motion` | "This page has no opinion." **Not** "on" — the difference is the whole component. |
| `<input type="checkbox">` | `aria-describedby` | Points at the sentence saying why the toggle cannot be changed. Only useful once the OS has spoken. |
| `<input type="checkbox">` | `aria-disabled="true"` | Set by the script when the OS asks for reduced motion. Keeps the tab stop, so it needs a click guard. |
| `.ac-switch__track` | `aria-hidden="true"` | The track and thumb are paint. The real control is the checkbox behind them. |
| the verdict line | `role="status"` | Announces the outcome politely. The checkbox already announces its own state. |

```css
.ac-motion-scope { --ac-motion: var(--motion, 1); }   /* 1  default */
[data-motion="off"] { --ac-motion: 0; }               /* 2  the page */
@media (prefers-reduced-motion: reduce) {             /* 3  the reader */
  .ac-motion-scope { --ac-motion: 0; }
}
```

Rules 2 and 3 have the same specificity, so the later one wins, and 3 is later. Keep them at equal
specificity or the mechanism becomes an accident of how you happened to write the selectors.

## Keyboard

The switch is a real checkbox, so the browser supplies all of this. There is no key handler in
`component.js`.

| Key | What it does |
| --- | --- |
| <kbd>Tab</kbd> / <kbd>Shift</kbd> + <kbd>Tab</kbd> | Reaches the switch and every button on the page. `aria-disabled` keeps the switch in the order, which is the point of using it. |
| <kbd>Space</kbd> | Toggles the checkbox behind the switch. |
| <kbd>Enter</kbd> | Activates a focused button, and never toggles the switch — a checkbox ignores it. |

**Keys deliberately not bound.** All of them. The click guard for `aria-disabled` needs no key handler
either: <kbd>Space</kbd> fires a *click* on a checkbox, so one `preventDefault` on the click covers
the keyboard as well.

## States

| State | Signaled by | Never signaled by |
| --- | --- | --- |
| reducing | `data-motion="off"` on the scope, or the OS media query. `--ac-motion` resolves to 0. | `data-motion="on"`. There is no such state, and example 5 is what adding one does. |
| not reducing | The **absence** of `data-motion`, which leaves the media query holding the field. | An attribute value. Absent and `"on"` would mean the same thing, and the toggle could not tell them apart. |
| the switch, on | The track fill **and** the thumb position — two cues. | Color alone (SC 1.4.1). |
| the switch, overruled by the OS | `aria-disabled="true"`, a dashed track, and a visible note it is described by. | `disabled`, which takes the tab stop and the explanation with it. |

### Reduced is not removed

`prefers-reduced-motion` is mostly about vestibular disorders: large movement across the viewport,
parallax, zoom, spin. Opacity is not that. So there are two knobs, and they are for different jobs.

| Gate the… | Under a reduced-motion preference | Use it for |
| --- | --- | --- |
| **duration** | the animation is gone outright | decoration — a loop with nothing to say |
| **distance** | the travel is 0 and the cross-fade survives | anything that tells the reader where a thing came from |

```css
/* duration gated — example 1 */
animation: spin calc(var(--ac-motion) * 4s) linear infinite;

/* distance gated — example 4 */
from { opacity: 0; transform: translateY(calc(var(--ac-motion) * 1.25rem)); }
```

Stripping every transition on the page is a heavier hand than the preference asked for. A panel that
jump-cuts into existence loses the reader who was looking somewhere else; a 320ms fade does not, and
does not move anything.

## Screen reader behavior

Expected: the switch announces as a checkbox, "Reduce motion on this page, checkbox, checked". When
the OS already asks for reduced motion it adds the description, "Your system already asks for reduced
motion, so animation stays off". The description is read because the note is visible text rather than
a `title`.

The readout table is deliberately **not** a live region. Three rows re-announced on every change
would bury the one sentence under it, which is a polite `role="status"` and carries the outcome
rather than repeating the state the checkbox already announced.

The ticker is not a live region either. `aria-live` on content that advances on a timer makes the
page unusable — SC 4.1.3 is about status changes the reader caused, not content moving on its own.

**Not yet verified against real assistive technology.** Until `docs/at-support.md` has a row for this
component, treat the above as intent, not measurement.

## The asymmetry

A page control can **add** the restriction and can never lift it. That is not a limitation to work
around; it is the feature. Someone who set reduced motion at the OS level did it once, for every site
they will ever visit, and a page that can switch it back off has taken that away from them.

Because the toggle can only agree with the OS and never contradict it, the control has nothing honest
to do once the OS has spoken. So it goes **`aria-disabled`, not `disabled`**: it keeps its tab stop,
and the sentence explaining why is announced with it. A `disabled` input is skipped and explains
nothing, which leaves the reader looking at a switch that does not respond and no reason given.

### There is no third state to write

"On" is the absence of an opinion, so turning motion back on means *removing* the attribute, which
leaves the media query holding the field. Example 5 adds the missing rule:

```css
[data-motion="on"] { --ac-motion: 1; }   /* after the media query. Don't. */
```

Same specificity, declared later, so it wins — and a reader who asked their system for reduced motion
now has it overruled by a button. Press it on that example and the readout says so while it is
happening.

The second cost is quieter. With three states the toggle can no longer describe the page: `off` means
reduced, `on` means not reduced, and *absent* also means not reduced — so the control has to pick a
box to show for two different situations. Turn the toggle on, then force the override, and watch the
switch uncheck itself. It is not wrong to; with `data-motion="on"` the page really is not reducing
anything. The reader's earlier answer is simply gone, and there is nothing left to restore it from.

### Persistence is your app's job

Deliberately not in this component. Your app already has a place for a setting; this library's own
site header keeps it in `localStorage` and writes the attribute before first paint, so the page never
flashes an animation it was told not to play. Read the OS preference at that point too, and start the
control checked for anyone who has it set.

## What the gate does not cover

The token covers CSS. It does not cover:

- `setInterval` / `setTimeout` carousels, tickers, auto-advancing anything
- `element.animate()` and the Web Animations API
- `scrollIntoView({ behavior: 'smooth' })` and `window.scrollTo`
- `<video autoplay>`, animated GIFs and APNGs, animated SVG
- scroll-linked and parallax libraries

`scroll-behavior: smooth` in CSS is the exception that is already handled for you: it responds to the
media query on its own in current browsers. `scrollIntoView` called from script does not.

### Ask the token, not `matchMedia`

For everything in that list the script has to ask, and what it asks matters:

```js
const allowed =
  getComputedStyle(scope).getPropertyValue('--ac-motion').trim() !== '0';
```

`matchMedia('(prefers-reduced-motion: reduce)')` only knows what the operating system thinks, so a
script that reads it directly ignores the page toggle and drifts out of step with every animation
around it. One token, read by both languages, cannot disagree with itself. You still want
`matchMedia` for its `change` event, because the setting can change while the page is open — reading
it once at load strands anyone who changes it in another window.

### SC 2.2.2 is a separate obligation

Anything that moves, blinks, scrolls or auto-updates, starts on its own, runs longer than five
seconds, and appears alongside other content needs a mechanism to pause, stop or hide it. That is
true **whether or not** motion is allowed. Reduced motion is a preference; Pause, Stop, Hide is a
criterion, and honoring the first does not discharge the second.

Example 1's disc turns for as long as the page is open, which is exactly the case. The toggle in
example 2 is its pause mechanism. Example 3's ticker has its own button.

That button changes its label between "Pause" and "Play" and carries **no `aria-pressed`**. A toggle
button that both renames itself and reports a pressed state announces the change twice, and the two
can contradict each other — "Play, pressed" is unreadable. Pick one, and the visible words are the
one a sighted reader is going by anyway.

## API

```js
const c = AC.createMotionPreferences(scopeEl);

c.allowed();      // -> boolean, the same answer the stylesheet has
c.set(true);      // write data-motion="off"
c.set(false);     // remove it — never write "on"
c.refresh();      // re-read every input and repaint
c.destroy();
```

Idempotent: calling it twice on the same element returns the existing instance. A `MutationObserver`
on `data-motion` keeps the control honest when something else writes the attribute — a second toggle,
a server-rendered value, or example 5's button.

## Using it in a framework

Delete the auto-init block at the bottom of `component.js` and call the factory from your own
lifecycle. In React:

```jsx
const ref = useRef(null);

useEffect(() => {
  const c = AC.createMotionPreferences(ref.current);
  return () => c.destroy();
}, []);
```

## Common mistakes

- **A `[data-motion="on"]` rule.** Any third state hands a page control the power to overrule an
  operating system setting. Example 5 is this, live.
- **`@media (prefers-reduced-motion: reduce) { * { animation: none !important } }`.** It works, and it
  is why so many reduced-motion pages feel broken — it takes the cross-fades too, and it reaches into
  a host app's own animations.
- **Reading `matchMedia` once at load.** The setting changes while the page is open. Listen for
  `change`.
- **Gating only the CSS.** The carousel, the smooth scroll and the autoplaying video are the motion
  people actually complain about, and no token touches them.
- **`disabled` on a control that cannot honestly be changed.** It leaves the tab order and the reason
  goes with it. `aria-disabled` plus a `preventDefault` on click keeps both.
- **A pause button that announces twice.** Changing label *and* `aria-pressed`. One or the other.
- **Assuming reduced motion means no animation.** It means no *vestibular* trigger. A fade is fine,
  and often kinder than a jump-cut.

## Related

- [Background Effects](../effects/) — the decorative animations this gate switches off.
- [Switch](../switch/) — the control in example 2, and where its markup is canonical.
- [Focus Indicator](../focus-ring/) — the one thing on the page that is never animated.
