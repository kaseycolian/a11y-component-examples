# Assistive technology support

Automated tests catch a great deal — missing names, bad contrast, unreachable controls — but they
cannot tell you whether a component is *usable*. Only a real screen reader does that.

This file records what has actually been tested, by whom, and when.

**Untested is written as untested.** An empty cell never means "probably fine". Overstating coverage
is worse than admitting a gap, because it stops anyone from checking.

---

## Status

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

Same walkthrough. JAWS is stricter than NVDA about ARIA and is where over-labelling shows up as
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

Update the row, and if anything differed, write it under **Caveats** with enough detail to act on:

> `dropdown` — TalkBack announces the option count as "1 of 5" only on first entry, not after
> filtering. Not a blocker; noted so it is not rediscovered. — 2026-08-01

If a pass fails, open the fix as a task in `BUILD-STATUS.md` rather than quietly downgrading the
component's `status` in `meta.json`.
