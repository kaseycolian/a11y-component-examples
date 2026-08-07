/**
 * The component groups: display order, name, and blurb.
 *
 * This is plain data with no imports on purpose. `registry.mjs` re-exports it
 * for the Astro side, and `scripts/build-agent-surfaces.mjs` imports it with
 * plain Node -- which cannot load `registry.mjs`, because `import.meta.glob`
 * only exists inside Vite. Two copies of this list would drift, and the group
 * a component claims is validated against it, so it has to be one list.
 *
 * A component's `meta.json` `group` must match one of these ids.
 */
export const GROUPS = [
  {
    id: 'foundations',
    name: 'General Concepts',
    summary:
      'The base behaviors every other component depends on: focus indicators, screen reader announcements, motion preferences, text styles, and hiding content correctly.',
  },
  {
    id: 'buttons-actions',
    name: 'Buttons & Actions',
    summary: 'Controls a person presses, and how each one reports what it did.',
  },
  {
    id: 'forms-inputs',
    name: 'Forms & Inputs',
    summary:
      'Form controls with a label, a hint, and an error message wired to them. Form Field is the wrapper the other inputs reuse.',
  },
  {
    id: 'overlays-disclosure',
    name: 'Overlays & Disclosure',
    summary:
      'Content that appears on demand. Each one has to move focus into it on open and put focus back where it started on close.',
  },
  {
    id: 'navigation',
    name: 'Navigation',
    summary:
      'Moving between views, and between sections of one page, with every destination reachable by keyboard.',
  },
  {
    id: 'feedback-status',
    name: 'Feedback & Status',
    summary: 'Reporting what happened. The result has to be announced, not only drawn.',
  },
  {
    id: 'data-display',
    name: 'Data Display',
    summary:
      'Structured content that keeps its structure when it is read aloud, zoomed, or reflowed onto a phone.',
  },
  {
    id: 'compositions',
    name: 'Compositions',
    summary: 'Several components working together, the way they would on a real screen.',
  },
];
