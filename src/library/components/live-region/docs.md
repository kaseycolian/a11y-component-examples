## Before you copy

These files are a working reference, not a package. Move the markup into your own templates and
the state into your own code. What has to survive that move is the ARIA below, the keyboard
behavior, and where focus goes — those are the parts that make the component accessible, and the
parts that are usually dropped.

Every example on this page is numbered and separately copyable. The CSS and JS sections name which
examples need them.

## Required markup

The whole component in the common case is one empty element, rendered with the page beside the thing
it describes:

```html
<p class="ac-lr-clipped" role="status"></p>
```

and then, when something happens:

```js
region.textContent = 'Changes saved.';
```

| Element | Attribute | What it does |
| --- | --- | --- |
| `<p>` or `<div>` | `role="status"` | Polite. The message is queued and read at the next natural break. Implies `aria-live="polite"` and `aria-atomic="true"`. |
| `<p>` or `<div>` | `role="alert"` | Assertive. Interrupts whatever is being read, mid-word. Implies `aria-live="assertive"` and `aria-atomic="true"`. |
| `<div>` | `role="log"` | Append-only and polite. Each new child is read as it arrives. Deliberately carries no `aria-atomic`. |
| `[role="log"]` | `aria-label` | Names the log. No live-region role takes a name from its own content, so without this it is an unnamed region. |
| `[role="log"]` | `tabindex="0"` | Only when the log scrolls. A box a mouse can scroll and a keyboard cannot is unreachable content (SC 2.1.1). |
| any of the three | `class="ac-lr-clipped"` | Takes the region off screen while leaving it in the accessibility tree. Never `hidden`, `display: none` or `visibility: hidden`. |

Prefer the role to a bare `aria-live` attribute. The role carries `aria-atomic` with it, and it gives
the element a name in the accessibility tree that someone can navigate to and read back.

`aria-atomic="true"` means read the whole region, not just the part that changed. That is what a status
wants — "3 of 99" makes no sense read as "3". It is wrong for a log, which is why `role="log"` does not
set it.

### Choosing between status and alert

`role="alert"` cuts across whatever is being read, and the person loses their place. It is the right
call for a session about to expire or a payment that failed, and the wrong call for almost everything
else — including most things labeled "error", because an error that is still on screen is not an
interruption.

The test is not how important the message is. It is **whether it stops being useful in a few
seconds**. If it survives until the next pause, it is polite.

## Keyboard

A live region binds nothing. It is text, not a control, and it takes no tab stop — with one exception.

| Key | What it does |
| --- | --- |
| <kbd>Tab</kbd> | Reaches the `role="log"` scroller, which is a tab stop only because it scrolls. A `role="status"` or `role="alert"` is not a stop and Tab is unaffected. |
| <kbd>ArrowDown</kbd> / <kbd>ArrowUp</kbd> | Scroll the focused log. This is the browser's own scrolling, and it is the reason for the `tabindex="0"`. |

**Keys deliberately not bound.** All of them. Nothing on this page is activated by a key, and a live
region that needed one would be a control wearing the wrong role.

**A region that scrolls needs the tab stop, and one that does not must not have it.** `tabindex="0"`
on a `role="status"` puts an unactionable stop in the tab order for no benefit. Add it to a log once
its content overflows, and to nothing else (SC 2.1.1).

## States

| State | Signaled by | Never signaled by |
| --- | --- | --- |
| empty | Nothing. This is how the region ships and how it spends most of its life. | Removing it from the DOM. A region that is not there is not being watched. |
| holding a message | The text inside it. A screen reader reads it at the next pause, or immediately for `role="alert"`. | An attribute. There is no state flag here — the text is the state. |
| off screen | `.ac-lr-clipped`, which keeps the region in the accessibility tree. | `hidden`, `display: none` or `visibility: hidden`. All three take it out of the tree, and then nothing announces. |

The region is left in place empty rather than cleared away, because the next message is announced
only if there is something already being watched to change.

## Screen reader behavior

Announcement timing, queueing, and how much of a region is read differ between NVDA, JAWS, VoiceOver
and TalkBack, and none of it is fully specified. The rules on this page hold everywhere; anything
finer does not. Assume a message can be dropped when another arrives on top of it, and never make a
live region the only way to learn something.

Nothing here can be evaluated by looking at it, and none of it can be caught by axe. Turn on a screen
reader.

## Why a region stays silent

Every failure below leaves the correct text in the DOM. That is what makes them expensive: the element
inspector, axe, and every other automated check say the page is fine, and the code reads correctly.
Example 5 has the first three live, and example 6 has the fourth.

### The region was not being watched

| Written as | Why nothing is announced |
| --- | --- |
| the region is created **and filled** in one go | a screen reader announces a *change* to a region it is already watching, and an element that arrives with its text already in it never changed |
| the region is present but `display: none`, `visibility: hidden` or `hidden` | it is not in the accessibility tree, so nothing is watching it — and unhiding it and filling it together is the first failure again |
| cleared and re-set in the **same tick** | the change is measured against the state the browser last reported, and the empty one was never reported |

The first is the one frameworks cause without anybody writing it: a conditionally rendered
`{error && <p role="alert">{error}</p>}` mounts the element and the text together, every time. Render
the element unconditionally and put the condition on its **contents**.

### The same message was written twice

Setting a region to the string it already holds is not a change, so nothing is announced. Press a Copy
button twice and the second press is silent — the confirmation the user asked for again is exactly the
one they do not get.

Do not force a difference by appending a counter or a zero-width space; the region then lies to anyone
who navigates to it and reads it directly. Clear it, let a frame pass, then write:

```js
function speak(el, text) {
  el.textContent = '';
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      el.textContent = text;
    });
  });
}
```

**Two frames, not one.** `requestAnimationFrame` runs *before* the next paint, so a single one can
still leave the clear and the write inside the same reported state. Waiting for the frame after that
guarantees the empty state was observed. In a hidden tab `rAF` does not run at all, so a message sent
from a background tab is announced when the tab comes back — which is when there is anyone to hear it.

## Placement and timing

### Next to the control it describes

The region goes beside the control, in the DOM — not in a tray at the bottom of the page. A screen
reader user who arrows past the control then finds the message; one parked in a global container is
announced once and is unreachable afterwards.

That is what the components here do, and each keeps its own: [Switch](../switch/) confirms a flip,
[Input Group](../input-group/) confirms a copy, [Textarea](../textarea/) counts characters,
[Tooltip](../tooltip/) announces a toggletip by inserting text into one.

Two exceptions. A message with no component of its own goes to the announcer. And a live region
**inside an open modal dialog** is the only one that can announce while the dialog is open — the rest
of the page is inert — so a message about the outcome of a dialog has to be written after it closes.
[Modal](../modal/) does that.

### Two clocks for a value that changes fast

A region wired to a value that changes on every keystroke reads a stream over the top of itself and
drowns out the rest of the page. Write the value twice, on two different clocks, as example 3 does and
as [Textarea](../textarea/) does with its character counter:

- the **visible** count updates per keystroke and is `aria-hidden`, because someone who can see it
  absorbs a number moving under their fingers
- the **announced** one waits for a pause of about a second, and says only what is worth saying

Clearing the region when there is nothing worth announcing matters more than it looks: it makes the
next threshold crossing a change, and therefore audible.

## API

```js
AC.speak(el, text);
```

Writes `text` into an existing region so it is announced even when it is the string the region already
holds: clear, wait two frames, write. `el` must already carry `role="status"`, `role="alert"` or
`aria-live`, must be in the document, and must not be hidden. Returns the frame handle so a caller can
cancel a pending write.

```js
const announcer = AC.createAnnouncer(options);

announcer.announce('Draft saved.');
announcer.announce('Upload failed.', { assertive: true });

announcer.element;           // the polite region
announcer.assertiveElement;  // the assertive one
announcer.destroy();         // removes both
```

For messages that belong to no component: a background save, a dropped connection, the result of a
keyboard shortcut. It mints one polite region and one assertive one at construction, appends them to
`options.root` (default `document.body`), and leaves them empty for the life of the page.

Idempotent per root: calling it again returns the same instance, so a message can be sent from wherever
it happens rather than threading one object through the app. Two sets of regions would announce
everything twice.

`options.clearMs` is how long a message sits before it is cleared, default 7000. Clearing announces
nothing, and a region still holding a message from four screens ago describes nothing. Pass `0` to
leave messages in place.

## Using it in a framework

Delete the auto-init block at the bottom of `component.js`. Neither export needs a lifecycle hook —
`AC.speak` takes an element you already have, and the announcer is fetched where the message happens.
In React:

```jsx
const region = useRef(null);

function onSave() {
  AC.speak(region.current, 'Changes saved.');
}

return (
  <>
    <button onClick={onSave}>Save changes</button>
    <p className="ac-lr-clipped" role="status" ref={region} />
  </>
);
```

The region is rendered unconditionally and the message goes into it afterwards. Rendering the element
and its text together is the first failure above, and it is what a conditional JSX region does on every
message.

## Common mistakes

- **A region created at the moment there is something to say.** The most common failure by a wide
  margin, and frameworks make it the default.
- **`hidden`, `display: none` or `visibility: hidden` on a region.** Clip it instead — see
  [Visually Hidden](../visually-hidden/). `.ac-lr-clipped` in this component's CSS is that recipe.
- **`aria-live` on a container that already announces**, or a `role="alert"` inside a `role="alert"`.
  Nested regions produce doubled and interleaved announcements.
- **A live region around content that re-renders.** With `aria-atomic="true"` one changed word
  re-reads the whole thing, which for a paragraph is a paragraph read aloud.
- **Announcing what is already announced.** A control's own name or state change already speaks;
  a live region on top of it says everything twice.
- **`role="alert"` for form errors on submit.** Moving focus to the first bad field announces its
  error through `aria-describedby` and puts the user where the work is. The alert only interrupts.
- **A message assembled from several elements.** Write one string into one region. A region built from
  three spans that update separately is read three times, in whatever order they land.
- **`tabindex="0"` on a region that does not scroll.** A tab stop with nothing to do on it.

## Related

- [Status Text](../status-text/) — the visible half of the same message.
- [Notice](../notice/) — a banner that is a live region when it appears after load.
- [Loading Button](../loading-button/) — a button that announces its own progress.
