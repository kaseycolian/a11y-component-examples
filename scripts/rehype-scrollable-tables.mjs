/**
 * Wrap every markdown `<table>` in a horizontally scrollable, focusable region.
 *
 * The keyboard and ARIA-contract tables in each component's docs.md are wider
 * than a 320px viewport, and a page must never scroll sideways (SC 1.4.10
 * Reflow). site.css already carries the `.table-scroll` class for exactly this;
 * markdown simply has no way to emit a wrapper element, hence this plugin.
 *
 * Three decisions worth keeping:
 *
 * - The wrapper is focusable (`tabindex="0"`). A box that only a mouse can
 *   scroll hides content from a keyboard user outright (SC 2.1.1).
 * - It is NOT done by setting `display: block` on the `<table>`, which is the
 *   usual shortcut. That drops the table role out of the accessibility tree in
 *   Chrome and Safari, so rows and columns stop being announced as a table at
 *   all -- a worse bug than the one being fixed.
 * - `role="group"` rather than `role="region"`. A focusable element needs a name
 *   to be worth focusing, and `group` takes one without turning every table on
 *   the page into a landmark.
 *
 * The name comes from the nearest heading above the table, so it announces as
 * "Keyboard, group" rather than something generic.
 */

/** Flatten the text of a hast node. */
function textOf(node) {
  if (node.type === 'text') return node.value;
  if (!Array.isArray(node.children)) return '';
  return node.children.map(textOf).join('');
}

const HEADINGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

function walk(node) {
  if (!node || !Array.isArray(node.children)) return;

  // Tracked as we go, so it is always the heading that precedes this table.
  let heading = null;

  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    if (child.type !== 'element') continue;

    if (HEADINGS.has(child.tagName)) {
      heading = textOf(child).trim();
      continue;
    }

    if (child.tagName === 'table') {
      node.children[i] = {
        type: 'element',
        tagName: 'div',
        properties: {
          className: ['table-scroll'],
          tabIndex: 0,
          role: 'group',
          'aria-label': heading ? `${heading} table` : 'Table',
        },
        children: [child],
      };
      continue;
    }

    walk(child);
  }
}

export function rehypeScrollableTables() {
  return (tree) => {
    walk(tree);
  };
}

export default rehypeScrollableTables;
