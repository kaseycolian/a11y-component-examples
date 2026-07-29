/**
 * The Shiki theme pair, in one place.
 *
 * Two consumers have to agree or the same snippet is colored two ways on one
 * page: `markdown.shikiConfig` in astro.config.mjs (fenced blocks in docs.md)
 * and the `<Code>` in CodePanel.astro (the copy panel). They are configured
 * separately -- a `<Code>` component does *not* inherit the markdown config --
 * which is exactly how the copy panel spent this long emitting hardcoded
 * github-dark inline colors while site.css styled a custom property that was
 * never there.
 *
 * The *-high-contrast variants rather than plain github-light/github-dark:
 * github-dark's comment color is #6a737d, which lands at 3.84:1 on this site's
 * darkest code surface and 4.20:1 on the next one -- under SC 1.4.3 in every
 * dark theme, on the one surface this whole library exists to show. The
 * high-contrast pair is GitHub's own answer to that and clears it everywhere.
 */
export const CODE_THEMES = {
  light: 'github-light-high-contrast',
  dark: 'github-dark-high-contrast',
};

/**
 * `defaultColor: false` stops Shiki committing to one of the two. It emits
 * both as --shiki-light / --shiki-dark custom properties and site.css picks,
 * so the code follows the theme picker across all 16 themes instead of being
 * baked in at build time.
 */
export const CODE_DEFAULT_COLOR = false;
