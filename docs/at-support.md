# Assistive technology support

Automated tests catch a great deal — missing names, bad contrast, unreachable controls — but they
cannot tell you whether a component is *usable*. Only a real screen reader does that.

This file records what has actually been tested, by whom, and when.

**Untested is written as untested.** An empty cell never means "probably fine". Overstating coverage
is worse than admitting a gap, because it stops anyone from checking.

---

## Status

**Nothing has been tested yet.** Every component in `src/library/components/` is untested against
every pairing below, and the table starts with two rows only because those two existed when this file
was written. Add a row when you test a component; there is no value in 33 rows of `—`.

| Component | NVDA + Firefox | NVDA + Chrome | JAWS + Chrome | VoiceOver + Safari (macOS) | VoiceOver (iOS) | TalkBack (Android) |
| --- | --- | --- | --- | --- | --- | --- |
| `disclosure` | — | — | — | — | — | — |
| `dropdown` | — | — | — | — | — | — |

Legend: `✓ YYYY-MM-DD` passed · `⚠ YYYY-MM-DD` passed with a caveat (note it below) · `✗ YYYY-MM-DD`
failed · `—` not yet tested.

### Caveats and known differences

*(none recorded yet)*

---

## How to run a pass

Roughly fifteen minutes per component. Do it with the screen reader's own browser pairing — the
combinations above are the ones that behave differently, not an arbitrary list.

### The four questions

For every component, in every AT, you are answering the same four things:

1. **Is it announced as what it is?** Role, name, and current state, in one utterance.
2. **Can you operate it without sight?** Close your eyes. Not squint — close them.
3. **Does a change get announced?** When state flips or content appears, are you told?
4. **Can you get out?** Focus must never be trapped, and never dumped on `<body>`.

### NVDA (Windows, free)

1. Start NVDA. <kbd>Insert</kbd>+<kbd>Space</kbd> toggles browse and focus mode — a custom widget
   should switch to focus mode by itself when you Tab in.
2. <kbd>Tab</kbd> to the component. Note the whole announcement verbatim.
3. Work through the keyboard table from its `docs.md`.
4. <kbd>Insert</kbd>+<kbd>↓</kbd> reads from the cursor — useful for checking a live region fired.
5. Press <kbd>H</kbd> to move by heading. If the component contains a heading, it must be reachable.

**Watch for:** a widget that stays in browse mode swallows arrow keys. If arrows do nothing, the
roles are probably wrong.

### JAWS (Windows, 40-minute demo mode)

Same walkthrough. JAWS is stricter than NVDA about ARIA and is where over-labeling shows up as
double announcements — an element named by both `aria-label` and visible text, or a group label read
twice.

### VoiceOver (macOS, built in)

1. <kbd>Cmd</kbd>+<kbd>F5</kbd> to start. Use **Safari** — VoiceOver's Chrome support differs.
2. <kbd>Ctrl</kbd>+<kbd>Opt</kbd>+<kbd>→</kbd> moves through elements; <kbd>Ctrl</kbd>+<kbd>Opt</kbd>+<kbd>Space</kbd> activates.
3. <kbd>Ctrl</kbd>+<kbd>Opt</kbd>+<kbd>U</kbd> opens the rotor — check the component appears sensibly
   under Form Controls and Headings.

### VoiceOver (iOS) — the one that finds real bugs

Settings → Accessibility → VoiceOver. Triple-click the side button to toggle.

1. Swipe right to move, double-tap to activate.
2. **This is where `aria-activedescendant` fails**, which is why the dropdown uses real DOM focus.
   If a component tracks an "active" item, confirm iOS actually announces it changing.
3. Check touch targets are hittable — swipe navigation forgives small targets, direct touch does not.

### TalkBack (Android)

Settings → Accessibility → TalkBack. Swipe right to move, double-tap to activate.

1. Same activedescendant caution as iOS.
2. TalkBack announces hints ("double tap to expand"), which come from role and state — a missing
   `aria-expanded` shows up here loudly.

### Windows High Contrast

Not a screen reader, but it belongs in the same pass. Settings → Accessibility → Contrast themes.
Every `color-mix` fill, glow, and `opacity` cue disappears. Confirm focus, selection, and disabled
states are still distinguishable — that is what each component's `@media (forced-colors: active)`
block is for.

---

## Recording a result

Four steps, and the third is the one that is easy to miss.

**1. Update the table.** Add the component's row if it has none, then write the verdict into the cell
for the pairing you used. A cell you did not test stays `—`.

**2. Write the caveat.** If anything differed, put it under **Caveats and known differences** with
enough detail to act on:

> `dropdown` — TalkBack announces the option count as "1 of 5" only on first entry, not after
> filtering. Not a blocker; noted so it is not rediscovered. — 2026-08-01

**3. Update that component's `docs.md`.** Its `## Screen reader behavior` section closes with the
house disclaimer, verbatim in 31 files:

> **Not yet verified against real assistive technology.** Until `docs/at-support.md` has a row for
> this component, treat the above as intent, not measurement.

Once the row exists, that sentence is false. Replace it with what was heard, and name the AT and the
date — *"NVDA + Firefox reads it as … — 2026-09-14."* The paragraph above it is written as **expected**
behavior; a tested component states what was **observed**. `grep -rl "Not yet verified" src/library/`
is the list of files still waiting.

**4. If a pass fails, open it as work in `BUILD-STATUS.md`.** Never quietly downgrade the component's
`status` in `meta.json` — a `draft` badge says "unfinished", not "fails in JAWS", and the difference
is the whole point of this file.

---

## Why this file is the last piece of the build

Everything else the library claims is asserted by a machine: `tests/shared/a11y.spec.mjs` runs ten
checks against every component, and `tests/shared/agent-surfaces.spec.mjs` proves every contract
matches the markup it describes. Neither can tell you whether a component is *usable*, and no amount
of further automation will change that. The matrix is the only part of the accessibility claim that
needs a person, a screen reader, and fifteen minutes.

That is why an empty cell is worth more than a guess. The gate proves the ARIA is present; only this
file can say it works.
