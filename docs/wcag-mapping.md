# WCAG mapping

Which success criteria this library takes responsibility for, which it can only help with, and how
the work is being kept portable to WCAG 3.

---

## What a component library can and cannot guarantee

Accessibility is a property of a *page*, not of a component. This library can hand you a correct
control; it cannot stop that control being dropped into a page with no headings, no language
attribute, or a keyboard trap elsewhere.

**Owned** — if a component fails these, it is a bug here:

| SC | Level | Where it lives |
| --- | --- | --- |
| 1.3.1 Info and Relationships | A | Semantic markup and ARIA in every `component.html` |
| 1.4.1 Use of Color | A | Every state carries a second cue — tick, border, icon, or text |
| 1.4.3 Contrast (Minimum) | AA | Theme tokens, pre-validated upstream; the token linter stops components from escaping them |
| 1.4.11 Non-text Contrast | AA | Control borders and focus indicators — why the dropdown's focused option has a border, not just a tint |
| 1.4.13 Content on Hover or Focus | AA | Tooltip: dismissible, hoverable, persistent |
| 2.1.1 Keyboard | A | Every APG keyboard map; scrollable regions get `tabindex="0"` |
| 2.1.2 No Keyboard Trap | A | Every overlay returns focus to its trigger |
| 2.4.3 Focus Order | A | Roving tabindex; focus never falls to `<body>` |
| 2.4.7 Focus Visible | AA | The shared `:focus-visible` treatment |
| 2.4.11 Focus Not Obscured | **2.2 AA** | `scroll-margin-top` clearing the sticky header |
| 2.5.3 Label in Name | A | Visible label text is always part of the accessible name |
| 2.5.7 Dragging Movements | **2.2 AA** | No component requires a drag |
| 2.5.8 Target Size (Minimum) | **2.2 AA** | ≥24×24px, 44px where layout allows |
| 3.2.2 On Input | A | No control changes context on change |
| 4.1.2 Name, Role, Value | A | The ARIA contract in every `docs.md` |

**Shared** — the library gives you the tools; your page has to use them properly:

| SC | What is on you |
| --- | --- |
| 1.3.5 Identify Input Purpose (AA) | Set `autocomplete` on real fields — components cannot guess intent |
| 2.4.6 Headings and Labels (AA) | Give every control a meaningful label; components forward whatever you provide |
| 3.3.1–3.3.3 Error Identification / Labels / Suggestion | The Field component wires the plumbing; the message wording is yours |
| 1.4.10 Reflow (AA) | Components reflow to 320px; your page layout also has to |

**Not addressed** — page-level, out of scope: 1.1.1 (alt text), 1.2.x (media), 2.4.1 (bypass
blocks — though `skip-link` helps), 3.1.1 (page language), 2.2.x (timing).

**WCAG 2.2 additions worth flagging** because they are new and widely missed: 2.4.11, 2.5.7, 2.5.8
above, plus **3.2.6 Consistent Help**, **3.3.7 Redundant Entry**, and **3.3.8 Accessible
Authentication** — all three page-level, none addressable by a component in isolation.

---

## Beyond AA

Where it costs nothing, components aim past the minimum:

- **Contrast** targets AAA (7:1) for body text where the theme allows, though only AA is guaranteed.
- **Target size** aims at 44px — the AAA figure (2.5.5) — falling back to the 24px AA floor only
  where layout genuinely forbids it.
- **Reduced motion** is honored through a token rather than a blanket `!important` reset, so a host
  app's own animation is untouched.
- **Forced colors** is not a WCAG requirement at all. Every component supports it anyway, because
  Windows High Contrast users are a real population that automated checkers ignore.

---

## Preparing for WCAG 3

WCAG 3 is a working draft with no firm date. It is expected to change two things that matter here:
**outcome-based conformance** in place of pass/fail success criteria, and possibly **APCA** in place
of the WCAG 2.x contrast ratio.

Neither is being pre-emptively adopted — building to a draft is how you end up with something that
matches no standard at all. What is being done instead is cheap and reversible:

1. **Document outcomes alongside criteria.** Each `docs.md` explains what a user can *accomplish*
   ("a screen-reader user can tell whether the panel is open") rather than only citing an SC number.
   That prose survives the model changing.
2. **Nothing structural hardcodes "AA".** No class names, tokens, or test helpers encode the level.
   Raising the bar is a matter of changing thresholds, not rewriting components.
3. **Record contrast in both scales.** Where a pair is measured, log the WCAG 2.x ratio *and* the
   APCA Lc. If APCA lands, the data is already there.

### Contrast log

Populate as pairs are measured. The theme tokens are pre-validated upstream by the theme-service's
own checker; this table is for pairs **this library introduces**.

| Component | Pair | Surface | WCAG 2.x | APCA Lc | Verdict |
| --- | --- | --- | --- | --- | --- |
| | | | | | |

Measure with the theme-service's checker:

```sh
node D:/sources/theme-service/tools/contrast-checker/cli.mjs "<fg>" "<bg>" --min 4.5
```
