## Before you copy

Your framework probably has an announcer already — Angular's `LiveAnnouncer`, React Aria's
`useAnnouncer`, a `<Toast>` that owns one. Use it. What does not change is the two rules underneath:
**the region has to be in the accessibility tree before the text goes into it**, and **the same string
written twice is not a change**. Every wrapper that gets this wrong gets it wrong in one of those two
places, and this is enough for a person or an agent to check theirs.

Each example is separately copyable: the HTML sections are numbered, and the CSS and JS sections say
which examples need them.

## The whole thing

```html
<p class="ac-lr-clipped" role="status"></p>
```

Rendered empty, with the page, beside the thing it describes. Then, when something happens:

```js
region.textContent = 'Setlist saved.';
```

That is the entire component in the common case. The rest of this page is the ways it goes wrong.

| Role | Politeness | It implies | Use it for |
| --- | --- | --- | --- |
| `role="status"` | polite — queued until a gap | `aria-live="polite"`, `aria-atomic="true"` | almost everything |
| `role="alert"` | assertive — interrupts mid-word | `aria-live="assertive"`, `aria-atomic="true"` | a message that is useless a few seconds later |
| `role="log"` | polite, and **append-only** | `aria-live="polite"` | chat, a build feed, anything where the history matters |

Prefer the role to a bare `aria-live` attribute: it carries `aria-atomic` with it, and it gives the
element a name in the accessibility tree that someone can navigate to and read back.

**`aria-atomic="true"` means read the whole region, not just the part that changed.** That is what a
status wants — "3 of 99" makes no sense read as "3". It is wrong for a log, which is why `role="log"`
does not set it.

## Assertive is not "important"

`role="alert"` cuts across whatever is being read, mid-sentence, and the person loses their place. It
is the right call for a session about to expire or a payment that failed, and the wrong call for
almost everything else — including most things labeled "error", because an error that is still on
screen is not an interruption.

The test is not how important the message is. It is **whether it stops being useful in a few
seconds**. If it survives until the next pause, it is polite.

## An announcer, for messages with no element

Some messages belong to no component: a background save, a dropped connection, the result of a
keyboard shortcut. There is nowhere sensible to put a `role="status"` for those, and creating one on
demand does not work — see the next section.

```js
var announcer = AC.createAnnouncer();
announcer.announce('Draft saved.');
announcer.announce('Upload failed.', { assertive: true });
```

`createAnnouncer()` mints one polite region and one assertive one at construction, appends them to
`document.body`, and leaves them empty for the life of the page. Calling it again returns the same
instance, so a message can be sent from wherever it happens rather than threading one object through
the app. `destroy()` removes both.

It clears a message after seven seconds. Clearing announces nothing, and a region still holding a
message from four screens ago describes nothing.

## The three silences

Every one of these leaves the correct text in the DOM. That is what makes them expensive: the element
inspector, axe, and every other automated check say the page is fine, and the code reads correctly.
Example 3 has all three live.

| Written as | Why nothing is announced |
| --- | --- |
| the region is created **and filled** in one go | a screen reader announces a *change* to a region it is already watching, and an element that arrives with its text already in it never changed |
| the region is present but `display: none`, `visibility: hidden` or `hidden` | it is not in the accessibility tree, so nothing is watching it — and unhiding it and filling it together is the first failure again |
| cleared and re-set in the **same tick** | the change is measured against the state the browser last reported, and the empty one was never reported |

The first is the one frameworks cause without anybody writing it: a conditionally rendered
`{error && <p role="alert">{error}</p>}` mounts the element and the text together, every time. Render
the element unconditionally and put the condition on its **contents**.

## The same message twice

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

## Throttling

A region wired to a value that changes on every keystroke reads a stream over the top of itself and
drowns out the rest of the page. Write the value twice, on two different clocks, as example 4 does and
as [Textarea](../textarea/) does with its character counter:

- the **visible** count updates per keystroke and is `aria-hidden`, because someone who can see it
  absorbs a number moving under their fingers
- the **announced** one waits for a pause of about a second, and says only what is worth saying

Clearing the region when there is nothing worth announcing matters more than it looks: it makes the
next threshold crossing a change, and therefore audible.

## Where the region goes

Next to the control it describes, in the DOM — not in a tray at the bottom of the page. A screen
reader user who arrows past the control then finds the message; one parked in a global container is
announced once and is unreachable afterwards.

That is what the components here do, and each keeps its own: [Switch](../switch/) confirms a flip,
[Input Group](../input-group/) confirms a copy, [Textarea](../textarea/) counts characters,
[Tooltip](../tooltip/) announces a toggletip by inserting text into one.

Two exceptions. A message with no component of its own goes to the announcer. And a live region
**inside an open modal dialog** is the only one that can announce while the dialog is open — the rest
of the page is inert — so a message about the outcome of a dialog has to be written after it closes.
[Modal](../modal/) does that.

## Screen reader behavior

Announcement timing, queueing, and how much of a region is read differ between NVDA, JAWS, VoiceOver
and TalkBack, and none of it is fully specified. The rules above hold everywhere; anything finer does
not. Assume a message can be dropped when another arrives on top of it, and never make a live region
the only way to learn something.

**Nothing on this page can be evaluated by looking at it, and none of it can be caught by axe.** Turn
on a screen reader.

## Watch for

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
