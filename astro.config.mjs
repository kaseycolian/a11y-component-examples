// @ts-check
import { defineConfig } from 'astro/config';
import { rehypeScrollableTables } from './scripts/rehype-scrollable-tables.mjs';

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
      // Two themes, emitted as --shiki-light / --shiki-dark custom properties.
      // `defaultColor: false` stops Shiki picking one, so site.css decides
      // based on the active theme -- see the `.code-block` rules there. That
      // keeps code readable in all 16 themes plus the light/dark auto default.
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
      defaultColor: false,
      wrap: false,
    },
  },
});
