# Authoring a component

`CLAUDE.md` says what the code must satisfy, and the `contract` block in `meta.json` is what the
component owes its agent-facing side. `docs/rewrite-pass.md` holds the writing rules — the voice, the
canonical `docs.md` heading order, and the shared demo vocabulary. `component-specs.md` has the up-front
design decisions, for the components it has an entry for — it predates most of the library, so a new slug
will not be in it. This file is about the parts that are judgement rather than rule: what makes a good
demo, how to write the docs, and what a useful test actually asserts.

Start with `npm run new:component -- <slug> --group <id> --name "Name"`.

---

## The demo is the reference implementation

`component.html` is not a showcase. It is the markup someone will paste into production, so it has
to be the *minimum correct* version — not the prettiest arrangement of it.

**Show the states people get wrong.** A demo with one happy-path example teaches nothing about the
hard parts. Every demo should include whichever of these apply:

- **disabled** — and prefer `aria-disabled` over the `disabled` attribute wherever the user needs to
  know *why* something is unavailable
- **empty** — the zero-state that gets discovered in production
- **error** — wired to the field's `aria-describedby`, not floating next to it
- **long text** — something that must wrap or truncate, so the CSS is honest
- **a group** — several instances together, proving ids do not collide

The dropdown demo is the model: five selects covering decorated options, `<optgroup>`, a disabled
option, a disabled control, and an empty list.

**Correct examples and mistakes are two sections, correct first.** Both are `ac-demo-section` blocks
inside `component.html`, each with an `<h3 class="ac-demo-section__title">` — `Correct examples` and
`Common mistakes`. Per-example titles are `<h4 class="ac-demo__title">`, and the numbering runs `1..N`
continuously across both sections so the `EXAMPLE 3 ·` banners in the CSS and JS still line up. An
example that ends with the fix but exists to show the mistake goes in the second section. `CLAUDE.md` >
**Copyability** has the markup.

**Comment the markup.** The HTML is read as documentation. Say why an attribute is there, not what
it is. `<!-- The heading lets screen-reader users jump between sections -->` earns its line;
`<!-- button -->` does not.

---

## Writing `docs.md`

The heading order is fixed. `docs/rewrite-pass.md` is canonical; this is the working summary:

1. **Before you copy** — the shared paragraph, verbatim. These files are a working reference, not a
   package; the ARIA, the keyboard behavior and the focus handling are what has to survive the move
   into your own code.
2. **Required markup** — a table of every element and attribute, in DOM order:
   `| Element | Attribute | What it does |`. The third column is the point of the whole document.
3. **Keyboard** — `| Key | What it does |`, always present, even when the native element supplies every
   key. If behavior differs by state, add a third column named for the state — never a second table.
   Finish with the keys you deliberately did **not** bind and why (the disclosure explains why it has
   no Escape handler).
4. **States** — `| State | Signaled by | Never signaled by |`. How each is signaled without color.
5. **Screen reader behavior** — what NVDA, JAWS, VoiceOver and TalkBack actually announce. Where
   they differ, say so. Never write what *should* happen as if it were tested; if it has not been
   verified, mark it in `at-support.md` as untested and say nothing here.
6. *Up to two component-specific sections*, with plain descriptive titles. Only where the pattern
   genuinely needs one.
7. **API** — the factory options and every method. JS components only.
8. **Using it in a framework** — the React snippet. People arrive here from a framework and leave if
   they cannot see how it fits. JS components only.
9. **Common mistakes** — the mistakes people actually make. Bulleted, bold lead-in, one sentence each.
10. **Related** — links only.

**Tone:** direct and dry, and explain the reasoning rather than only the rule. "Do not use
`display: none`" is a rule someone will break. "`display: none` removes it from the accessibility tree,
which is the one thing this utility exists to avoid" is a reason they will remember.

**Be honest about limits.** The dropdown's docs say plainly that it is not a filtering combobox and
that `<select multiple>` is unsupported. A library that overstates its coverage is worse than one
that scopes itself clearly.

---

## Writing the spec

A test that only asserts the component rendered would still pass with every ARIA attribute wrong.
Assert the **contract**:

```js
// Weak — passes even if the button has no accessible name.
await expect(page.locator('.ac-thing')).toBeVisible();

// Strong — this is what assistive tech actually consumes.
await expect(toggle).toHaveAccessibleName(/Deploy target.*Production/s);
await expect(toggle).toHaveAttribute('aria-expanded', 'false');
await expect(options.nth(1)).toBeFocused();
```

Cover, at minimum:

- **The accessible name** of every interactive element — `toHaveAccessibleName`, not `toHaveText`
- **Every key in the keyboard table**, including wrapping at both ends
- **Where focus goes** on open and on close. Focus landing on `<body>` is a real bug that no visual
  check catches.
- **State attributes** flipping (`aria-expanded`, `aria-selected`, `aria-pressed`)
- **The awkward states** — disabled skipped, empty explained
- **Side effects fire once.** The dropdown asserts exactly one `change` event; a double-fire is easy
  to introduce and invisible in a browser.

Use `getByRole` over CSS selectors where you can. It queries the accessibility tree, so the test
fails for the same reason a screen reader would.

**Avoid `includeHidden: true`** unless you mean it — for progressive-enhancement components it also
matches the hidden native element and trips strict mode.

---

## Self-containment, and why the duplication is deliberate

Components do not share modules. The dropdown inlines its own `.ac-field` styles even though a
Field component will own the canonical version.

This is not an oversight. The library's promise is that copying three files into a bare app works
with nothing else. A shared `core/` module would break that the first time someone copied a
component without it. The cost is some repetition; the benefit is that every component is provably
independent, which the per-page CSS loading verifies on every build.

When two components need the same behavior, copy it and let them diverge. If a genuinely reusable
utility emerges, it becomes its own General Concepts entry that people can choose to copy — not an
import.

---

## Before you tick the row

Run the definition-of-done checklist at the bottom of `component-specs.md`, then:

```sh
npm run check:tokens
npm run agents          # renders agents/components/<slug>.md from the contract block
npm run check:agents
npm run build
npx playwright test --project=chromium <slug>
npx playwright test --project=chromium agent-surfaces
```

That last one is the half people skip. It reads your markup and your JS and reports anything they do
that the contract does not admit to — an `aria-*` you added, a key you bound, a factory you exported.
`CLAUDE.md` > **Component folder shape** has the table of which edit obliges which field, and
`sync-process.md` decodes the failures.

And open it in a browser. Tab through it with your eyes closed for a moment — if you cannot tell
where you are, neither can anyone else.
