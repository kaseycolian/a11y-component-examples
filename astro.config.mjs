// @ts-check
import { defineConfig } from 'astro/config';
import { rehypeScrollableTables } from './scripts/rehype-scrollable-tables.mjs';
import { CODE_THEMES, CODE_DEFAULT_COLOR } from './src/site/lib/code-theme.mjs';

/**
 * The site is published to GitHub Pages at
 *   https://kaseycolian.github.io/a11y-component-examples/
 * so every internal link and asset URL must be prefixed with `base`. Use
 * `import.meta.env.BASE_URL` in templates rather than hardcoding the path.
 *
 * `trailingSlash: 'always'` + `format: 'directory'` is the combination that
 * behaves identically in `astro dev`, `astro preview`, and on Pages itself.
 */
export default defineConfig({
  site: 'https://kaseycolian.github.io',
  base: '/a11y-component-examples',
  trailingSlash: 'always',
  // The Astro shell lives entirely under src/site/. src/library/ sits outside
  // it on purpose: it is plain HTML/CSS/JS with no Astro in it at all, so it
  // can be lifted out of this repo wholesale.
  srcDir: './src/site',
  build: {
    format: 'directory',
  },
  // No client framework integrations on purpose: the shell ships zero runtime
  // JS of its own, and every component demo runs the same vanilla files a
  // visitor copies.
  integrations: [],

  markdown: {
    // The docs tables are wider than 320px, and the page itself must never
    // scroll sideways (SC 1.4.10). Markdown cannot emit a wrapper, so this adds
    // the scrollable, focusable region around each one.
    rehypePlugins: [rehypeScrollableTables],
    shikiConfig: {
      // Shared with CodePanel.astro so a snippet in docs.md and the same
      // snippet in the copy panel are colored identically. See code-theme.mjs
      // for why the pair is what it is.
      themes: CODE_THEMES,
      defaultColor: CODE_DEFAULT_COLOR,
      wrap: false,
    },
  },
});
