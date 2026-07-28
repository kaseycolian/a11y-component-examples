/**
 * The site's own identity, in one place so the visible brand in the header and
 * the <title> in the tab strip cannot drift apart.
 */
export const SITE_NAME = 'The A11Y Way';

export const SITE_TAGLINE =
  'WCAG 2.2 AA Compliant Development Guide for Humans and Agents';

/**
 * Tab title for a page. The site name leads, so a visitor scanning a row of
 * narrow tabs can tell which app they belong to.
 *
 * @param {string} [title] the page's own name; omit on the home page, which is
 *   already named by the site
 */
export function pageTitle(title) {
  return !title || title === SITE_NAME ? SITE_NAME : `${SITE_NAME} · ${title}`;
}
