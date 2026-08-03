# Accessible Component Examples

A reference library of UI components that meet **WCAG 2.2 AA** as a floor, written in plain
HTML, CSS, and JavaScript so they can be copied into any codebase — React, Angular, Vue, Svelte,
or no framework at all.

**→ [Browse the library](https://kaseycolian.github.io/a11y-component-examples/)**

Accessible does not mean plain. Every component ships with the full neon theme set and a theme
picker, because a rich interface and complete assistive-technology support are not in tension.

## What this is

Each component is a folder of three real files — `component.html`, `component.css`,
`component.js` — plus its documentation. The live demo on the site loads *those exact files*, and
the copy panel shows *those exact files*. There is no build step between what you see and what you
copy, so the two can never drift apart.

Every component is built to work with:

- **Desktop screen readers** — NVDA, JAWS, VoiceOver on macOS
- **Mobile screen readers** — VoiceOver on iOS, TalkBack on Android
- **Keyboard only** — full [WAI-ARIA APG](https://www.w3.org/WAI/ARIA/apg/) keyboard patterns
- **Touch and small screens** — fluid to 320px, 24×24px minimum targets
- **Windows High Contrast Mode** — `forced-colors` support on every component
- **Reduced motion** — every transition gated behind a motion token

## Using a component

1. Find it on the site and try it with your keyboard and screen reader.
2. Copy the HTML, CSS, and JS from the code panel.
3. Paste them in. There is nothing else to install — no dependencies, no extra files.

The CSS is written so it works either way:

```css
background: var(--ac-surface, var(--bg-panel, #14121c));
```

In a bare app it uses the literal default. In an app that already defines these tokens, it picks
up your theme automatically. To retheme everything at once, set the `--ac-*` tokens in one place.

The JS is a plain factory function, so framework users get a lifecycle handle:

```js
const dropdown = AC.createDropdown(el);
// ...later
dropdown.destroy();
```

## If an agent is doing the copying

Start at **[AGENTS.md](AGENTS.md)**, which is written for that and nothing else: a tiered read path with
byte budgets, a one-line index of the roster, and a per-component ARIA contract — roles, keyboard map,
states, failure modes, JS API — generated from each `meta.json` and asserted against the shipped markup
by the test suite. Alongside it, `agents/pitfalls.md` collects the platform behaviors that make
correct-looking markup wrong, each one paid for by a real failure.

The same files are served under the site's base path, so a fetcher needs no checkout; `llms.txt` is the
entry point there.

### Using it from your own repos

A clone gets you the skill only while *this* repo is the open project, which is the one case you do not
need it. Install once and the library is available from every repo on the machine:

```sh
git clone https://github.com/kaseycolian/a11y-component-examples.git
cd a11y-component-examples
npm run install:skill        # links the skill into ~/.claude/skills/ for Claude Code
```

That also writes `~/.claude/a11y-library.local.json` naming this clone, which is what lets a skill
loaded from outside the checkout still resolve `agents/` and `library/`. Nothing is written inside the
repo, and it runs before `npm install` — node builtins only.

**Using an agent that is not Claude Code?** Add a pointer block to that project's `AGENTS.md` instead:

```sh
npm run install:agents-md -- ../your-project   # omit the path to print the block and paste it anywhere
```

Both routes record both doors — the clone on disk and the hosted URL — so an agent still gets there
when one of them is unavailable. `npm run uninstall:skill` removes the link and keeps the config.

Do not point an agent at `CLAUDE.md` or `docs/`. Those are for working *on* the library and cost tens of
thousands of tokens to say nothing about how a component behaves. Why that side is built the way it is —
the tiers, the budgets, the single manifest, and what each surface measured against its budget — is
recorded for people in [docs/agent-layer.md](docs/agent-layer.md).

## Repository layout

```
src/library/     The components themselves. Pure vanilla, zero Astro. This is the product.
src/site/        The Astro shell that displays them. Never contains component code.
tests/shared/    The accessibility gate every component must pass.
AGENTS.md        The agent entry point. Generated.
agents/          The roster index, a contract per component, and the cross-cutting traps. Generated.
docs/            Authoring guide, AT support matrix, WCAG mapping.
scripts/         Library sync, component scaffolder, token linter, agent-surface renderer.
```

`src/library/` never imports from `src/site/`, so the library stays portable.

## Development

Requires Node 20+.

```sh
npm install
npm run dev        # http://localhost:4321/a11y-component-examples/
npm run build      # static output to dist/
npm run preview    # serve the built output
```

### Checks

```sh
npm run check:tokens   # no hardcoded colors outside a fallback position
npm test               # Playwright: axe-core, keyboard, contrast, reflow, forced-colors
npm run verify         # all of the above plus a production build
```

The automated suite runs across Chromium, Firefox, and WebKit, and repeats the axe scan under
every theme. It catches a great deal, but it does not replace a real screen reader — manual
results are recorded per component in [docs/at-support.md](docs/at-support.md).

### Adding a component

```sh
npm run new:component my-component
```

That scaffolds the folder. Navigation, the index page, and the test matrix all derive from
`meta.json`, so there is nothing else to wire up. See
[docs/authoring-a-component.md](docs/authoring-a-component.md) for the conventions.

## Theming

Themes come from the [theme-service](../theme-service) token system, vendored into
`src/site/theme/`. Ten themes across five families, each validated to pass AA in every state, in
both dark and light. Components consume the tokens; they never hardcode a color.
