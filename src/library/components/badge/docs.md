## Before you copy

Your framework has a `<Badge>` already and you should use it. **The decisions on this page are the
same either way** — they are about what is inside the badge and what it is attached to, not about
how it is rendered. Take the markup and the CSS, keep the contract, and let your framework own the
count. This is enough for a person or an agent to start from.

Each example is separately copyable: the HTML sections are numbered, and the CSS and JS sections say
which examples need them.

## One sentence

The digits are a drawing of the count. The words beside them are the count.

## The contract

| Piece | What it is | Why |
| --- | --- | --- |
| `.ac-badge` | the pill | one accent custom property; the tone changes nothing else |
| `.ac-badge__num` | `aria-hidden="true"`, the digits | may be abbreviated, may be empty, is never read |
| `.ac-badge__name` | clipped real text — `3 unread messages` | this is the badge |
| nesting | inside the control the badge counts | its words join that control's accessible name |
| `.ac-badge--dot` | no digits at all | the words are the only thing left, so they are not optional |
| the live region | on the area, never on the badge | a badge is usually inside a control |

## The number needs a subject

`3` is not a status, a quantity or a thing — it is a character. On screen the subject comes from
position: the badge is on the inbox button, so it is unread mail. In the accessibility tree nothing
carries position, so the subject has to be written down.

Example 2 has four badges that all show `3`, with the announced text printed under each.

| What was built | What is read out |
| --- | --- |
| the digits alone | `3` |
| `aria-hidden` on the whole badge | nothing — the count is gone rather than named |
| the words added, the digits left visible to the tree | `3 3 unread messages` |
| the specimen | `3 unread messages` |

The third one is the one that ships. Someone adds the clipped subject, does not hide the digits, and
the count is announced twice — it reads as a stutter rather than as a bug, so nobody files it.

Real clipped text rather than an `aria-label`, for [Icon Button](../icon-button/)'s reasons: an
attribute cannot be found by find-in-page, is skipped by most translation tools, and cannot be
un-clipped at a breakpoint. There is a fourth reason here that is the badge's own — **text composes
into the name of an ancestor and an attribute does not.** That is what makes nesting work.

## Attach it, do not merely place it

A corner badge is `position: absolute` over its control, so *nesting it inside the control* and
*putting it beside the control* look identical. They are not.

```html
<!-- the badge's words join the button's name: "Inbox 3 unread messages" -->
<button class="ac-btn ac-btn-icon ac-badge-host">
  <svg class="ac-btn-icon__glyph" aria-hidden="true" focusable="false">…</svg>
  <span class="ac-btn-icon__label">Inbox</span>
  <span class="ac-badge ac-badge--corner">
    <span class="ac-badge__num" aria-hidden="true">3</span>
    <span class="ac-badge__name">3 unread messages</span>
  </span>
</button>
```

Beside it, the button is called `Inbox` and the badge is a loose phrase arriving after it, joined to
it by a `position: absolute` that only the eye can read. Example 3 has both, with the button's name
printed under each.

The cost of nesting is that the control is renamed whenever the count changes — see below. That is
the right trade: the name is what a reader arriving at the button needs, and there is no other way
to attach a badge to a control without inventing a relationship ARIA does not have.

## When there is no number to read

Three badges in example 4 have nothing readable in the digits, and each fails differently if you
treat the digits as the content:

- **`99+`** is a shortening of the drawing. The words stay long: `99 or more unread messages`. The
  `+` is punctuation and announces as one.
- **A dot** has no number at all — it is pure color and shape, which [Notice](../notice/) has the
  argument about. What is badge-specific is that there is no digit to fall back on, so the clipped
  words are the entire component. A dot without them announces nothing.
- **Zero** is not a badge. It is removed rather than drawn empty, and the words go with it, because a
  hidden element is out of the accessibility tree.

`.ac-badge[hidden] { display: none }` is declared explicitly and it is load-bearing. `display:
inline-flex` on the badge is an author declaration and the UA's `[hidden]` rule is not, so without
that line the zero badge stays on screen — [Tooltip](../tooltip/) hit the same thing.

## When the count changes

[Status Text](../status-text/) has the argument about which element carries the live role, and it is
sharper here: a corner badge is *inside a button*, so `role="status"` on it puts a live region inside
a control. Every arriving message then interrupts, in a fragment — `4 unread messages`, with no verb
and no subject a reader can act on.

```html
<!-- one region for the inbox, in the markup from the start, empty -->
<p class="ac-bdg-slot" role="status"></p>
```

The badge is updated silently and the region gets the sentence: *"1 new message. 99 unread."* The
clear-then-write and the two frames are [Live Region](../live-region/)'s recipe.

**And the live role costs more than the interruption: it takes the count out of the button's name.**
Naming from contents only folds in a child whose own role takes a name from its contents, and no
live-region role does. Chromium computes the announcing button as `Inbox` and the specimen beside it
as `Inbox 99 unread messages` — identical on screen. The badge that talks is the badge that is silent
when a reader arrives at it, which is the opposite of what the attribute was added for.

The specimen's button *is* renamed by every message, and that is fine. A name change is what the
next reader to arrive is given, not something the current one is told; the region is what tells them.
Do not try to fix the rename by taking the count out of the name.

## States

| State | Signaled by | Not by |
| --- | --- | --- |
| tone (`--green`, `--blue`) | the words, then the accent | never the accent alone |
| `--solid` | a filled pill, and the same words | — |
| zero | the badge is gone | never a badge drawn with a `0` in it |

Under `forced-colors: active` the tinted fill and every accent collapse into `Canvas` and
`CanvasText`, so the tones stop being told apart. Nothing puts the difference back, because nothing
can — the words never depended on it. `--solid` and `--dot` are reversed so a filled badge is still
filled.

## Keyboard

A badge is not a control. There is nothing to operate and nothing to focus — the control it is
attached to is what a keyboard reaches, and the badge is part of its name.

`pointer-events: none` on `.ac-badge--corner` so the badge cannot swallow a click aimed at the
button underneath it.

## Screen reader behavior

Not yet tested against a screen reader. What the markup asks for: example 1's first button reads as
*"Inbox 3 unread messages, button"*; its list rows read as *"Zine 462 · the VFW hall issue, New"*.
Example 5's specimen announces one sentence per message and the badge itself announces nothing.

## API

```js
const b = AC.createBadge(container);

AC.setBadge(el, 4, { subject: 'unread messages', max: 99 });
b.refresh();                         // re-run this page's readouts
b.destroy();
```

Idempotent: calling it twice on the same element returns the existing instance. `setBadge` is the
only part worth lifting — everything else in `component.js` is this page checking its own claims.

There is deliberately no way to write the digits without writing the words. A badge is the one place
where the thing on screen is routinely an abbreviation of the thing being said, so two setters would
drift, and a badge reading `4` while announcing `3` is worse than either.

`subject` is a plural noun phrase and the default template is naive on purpose — it produces
`1 unread messages`. Pass a function instead, `(count, max) => string`, for plurals and for every
language a template cannot serve. Attributes and `Intl.PluralRules` both belong on your side of that
boundary, not in a copied file.

## Using it in a framework

Delete the auto-init block at the bottom of `component.js` and call the factory from your own
lifecycle. In React:

```jsx
const ref = useRef(null);

useEffect(() => {
  const b = AC.createBadge(ref.current);
  return () => b.destroy();
}, []);
```

The part that does not survive the port is the region's lifetime: a `role="status"` that mounts at
the same moment as the sentence inside it was never being watched. Render the region unconditionally
and let only its contents be conditional.

## What to watch for

- **A badge holding only digits.** It announces a number and nothing else.
- **`aria-hidden` on the whole badge.** The over-correction: the count is not named, it is deleted.
- **The subject added, the digits left visible.** The count is announced twice.
- **A badge positioned over a control instead of inside it.** The control's name never mentions it.
- **`role="status"` on the badge.** A live region inside a button: it interrupts with a fragment,
  and the count vanishes from the button's name.
- **`99+` in the words.** Abbreviate the drawing, spell out the sentence.
- **A dot with no clipped text.** It announces nothing at all.
- **A badge drawn with `0` in it.** Remove it instead.
