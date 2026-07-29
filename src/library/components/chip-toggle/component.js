/* ===========================================================================
   CHIP TOGGLE

   WHAT TO COPY
     [CORE]       toggle() and the click delegation. The whole component, and
                  about fifteen lines.
     [FILTER]     example 1. The result count this page puts in a live region.
     [CUES]       example 2. What actually changes when a chip goes down.
     [NAMES]      example 3. The accessible name in both states.
     [SUBMITS]    example 4. Which of the three chips has a value to send.
     [ROVING]     example 5. The toolbar's one tab stop and its arrow keys.
     [AUTO-INIT]  delete if you construct instances yourself.

   Copy the file whole for the library version.

   toggle() does one thing and refuses a second.

     aria-pressed    flipped in place. The attribute is the state — there is no
                     shadow variable, because a second copy of the truth is a
                     second thing that can be wrong, and the CSS reads the
                     attribute too.
     the name        left alone. There is no branch for it. A chip that renames
                     itself says its state twice in two words that disagree.

   A toggle button is not a checkbox: nothing is submitted, and the press takes
   effect immediately. When the value has to travel with a form, use a real
   checkbox — example 4 has both.

   No dependencies. Plain IIFE, so a paste into a <script> tag works.
   =========================================================================== */
(function (global) {
  'use strict';

  /**
   * @param {HTMLElement} root a container holding one or more chips
   */
  function createChipToggle(root) {
    // Idempotent: initializing twice would double up the listeners.
    if (!root || root._acChipToggle) return root && root._acChipToggle;

    /* === [CORE] ========================================================== */

    /**
     * Flip one chip. The DOM attribute is the only state.
     *
     * @param {HTMLButtonElement} chip
     * @param {boolean} [force] set it rather than flipping it
     * @returns {boolean} the new pressed state
     */
    function toggle(chip, force) {
      var next = typeof force === 'boolean' ? force : chip.getAttribute('aria-pressed') !== 'true';
      chip.setAttribute('aria-pressed', next ? 'true' : 'false');

      // How a consumer hears about it. A native <button> fires no change event,
      // and reaching into the page from in here would make the component own
      // things it cannot know about.
      chip.dispatchEvent(
        new CustomEvent('ac:chip-toggle', { bubbles: true, detail: { pressed: next } }),
      );
      return next;
    }

    function onClick(event) {
      var chip = event.target.closest && event.target.closest('[data-ac-chip]');
      if (!chip || !root.contains(chip)) return;
      toggle(chip);
    }

    root.addEventListener('click', onClick);

    /* Enter and Space need no handler at all: a native <button> fires a click
       for both. That is the whole reason this is a button and not a div. */

    /* === the page's own plumbing ======================================== */

    /**
     * An element's accessible name — the short version, with the step people
     * forget: **CSS generated content counts**. accname folds ::before and
     * ::after into the name of anything named from its contents, which is why
     * a tick written as content: "✓" renames the control. icon-button ships
     * the full resolver and the rest of the reasons.
     *
     * @param {Element} el
     * @returns {string}
     */
    function nameOf(el) {
      if (!el) return '';
      var label = el.getAttribute && el.getAttribute('aria-label');
      if (label && label.trim()) return label.trim();

      var copy = el.cloneNode(true);
      copy.querySelectorAll('[aria-hidden="true"]').forEach(function (node) {
        node.remove();
      });

      // Joined with spaces, which is what the browser does — accname
      // concatenates the parts rather than gluing them together.
      return [generated(el, '::before'), copy.textContent || '', generated(el, '::after')]
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    /** The text a pseudo-element contributes, or '' for a drawn shape. */
    function generated(el, pseudo) {
      var value = getComputedStyle(el, pseudo).content;
      if (!value || value === 'none' || value === 'normal') return '';
      return value.replace(/^["']|["']$/g, '');
    }

    /**
     * Write into a readout. Marked as well as colored: the color is gone under
     * forced colors, and it was never the thing carrying the meaning.
     */
    function say(node, text, bad) {
      if (!node) return;
      node.textContent = text;
      if (bad) node.setAttribute('data-ac-ct-bad', 'true');
      else node.removeAttribute('data-ac-ct-bad');
    }

    function out(key) {
      return root.querySelector('[data-ac-ct-out="' + key + '"]');
    }

    function pressed(chip) {
      return chip.getAttribute('aria-pressed') === 'true';
    }

    /* === [FILTER] example 1 ==============================================
       What a consumer does with the event: recompute, then say so. The count
       goes in a role="status" because the thing that changed is somewhere else
       on the page, and a sighted reader can see it move.

       No clear-then-write here (live-region's recipe) — every message contains
       the names of the pressed chips, so the string cannot repeat while the
       state is different. */

    var TOTAL = 462;
    var filterPanel = root.querySelector('[data-ac-ct-filter]');
    var result = filterPanel && filterPanel.querySelector('[data-ac-ct-result]');
    var resultAtLoad = result && result.textContent;

    function sampleFilter() {
      if (!result) return;

      var names = [];
      var count = 0;

      filterPanel.querySelectorAll('[data-ac-ct-count]').forEach(function (chip) {
        if (!pressed(chip)) return;
        names.push(nameOf(chip));
        count += Number(chip.dataset.acCtCount) || 0;
      });

      result.textContent = names.length
        ? count + ' records · ' + names.join(', ')
        : TOTAL + ' records · no filters';
    }

    /* === [CUES] example 2 ================================================
       Sampled from the live chip in each state rather than described, because
       the claim is about what a stylesheet actually computed. */

    var cuesPanel = root.querySelector('[data-ac-ct-cues]');
    var cuesVerdict = cuesPanel && cuesPanel.querySelector('[data-ac-ct-cues-verdict]');
    var CUES = ['flat', 'tick', 'glyph'];
    var cuesSeen = { flat: {}, tick: {}, glyph: {} };

    /**
     * The three things a chip could distinguish its states with, read at rest.
     *
     * transition: none first, or every color comes back part way between the
     * two states — and since the fill and the border are 150ms apart in the
     * declaration, the readout would report that the border never changed.
     * getComputedStyle flushes the style it was just handed, so one line each
     * side is enough.
     */
    function cuesOf(el) {
      var transition = el.style.transition;
      el.style.transition = 'none';

      var self = getComputedStyle(el);
      var mark = getComputedStyle(el, '::before');
      var drawn = mark.display !== 'none' && mark.visibility === 'visible';
      var cues = {
        fill: self.backgroundColor,
        border: self.borderTopColor,
        tick: drawn ? mark.content : 'none',
      };

      el.style.transition = transition;
      return cues;
    }

    function sampleCues(chip) {
      if (!cuesPanel) return;

      var key = chip.dataset.acCtCue;
      cuesSeen[key][pressed(chip) ? 'on' : 'off'] = cuesOf(chip);
      say(out(key + '-name'), pressed(chip) ? nameOf(chip) : '—', key === 'glyph' && pressed(chip));

      var seen = cuesSeen[key];
      if (!seen.on || !seen.off) return;

      var changed = ['fill', 'border', 'tick'].filter(function (cue) {
        return seen.on[cue] !== seen.off[cue];
      });

      // "fill" alone is the failure. Anything without a tick fails the same way
      // a second time under forced colors, where the fill is replaced.
      say(out(key + '-cues'), changed.join(', ') || 'nothing', changed.indexOf('tick') === -1);

      if (cuesSeen.flat.on && cuesSeen.tick.on) {
        say(
          cuesVerdict,
          'Sold out changes color and nothing else, so it has no state at all in High Contrast. ' +
            'Matinee has a real cue and pays for it in the name.',
          true,
        );
      }
    }

    /* === [NAMES] example 3 =============================================== */

    var namesPanel = root.querySelector('[data-ac-ct-names]');
    var namesVerdict = namesPanel && namesPanel.querySelector('[data-ac-ct-names-verdict]');
    var namesSeen = { swap: {}, keep: {} };

    function sampleNames(chip) {
      if (!namesPanel) return;

      var key = chip.dataset.acCtName;
      var down = pressed(chip);

      // BROKEN — the state is being written into the accessible name.
      if (key === 'swap') {
        chip.textContent = down ? chip.dataset.acCtSwap : 'Follow';
      }

      namesSeen[key][down ? 'on' : 'off'] = nameOf(chip) + ' · ' + down;
      say(out(key + '-' + (down ? 'on' : 'off')), namesSeen[key][down ? 'on' : 'off'], key === 'swap' && down);

      if (namesSeen.swap.on) {
        say(
          namesVerdict,
          'The pressed chip announces "Following, pressed" — the word and the state say it twice, ' +
            'and "click Follow" no longer finds it.',
          true,
        );
      }
    }

    /* === [SUBMITS] example 4 ============================================= */

    var submitsPanel = root.querySelector('[data-ac-ct-submits]');
    var form = submitsPanel && submitsPanel.querySelector('[data-ac-ct-form]');
    var ask = submitsPanel && submitsPanel.querySelector('[data-ac-ct-ask]');
    var switchChip = submitsPanel && submitsPanel.querySelector('[data-ac-chip-switch]');
    var checkChip = form && form.querySelector('.ac-chip__input');
    var pressChip = form && form.querySelector('[data-ac-chip]');

    /* role="switch" carries aria-checked, never aria-pressed. Both are legal on
       a button and they are not interchangeable: pressed is "this control is
       held down", checked is "this setting is on". Older JAWS announces the
       role inconsistently — switch has that argument in full. */
    function onSwitchClick() {
      var next = switchChip.getAttribute('aria-checked') !== 'true';
      switchChip.setAttribute('aria-checked', next ? 'true' : 'false');
      sampleSubmits();
    }

    function sampleSubmits() {
      if (!form) return;
      say(out('what-split'), 'aria-pressed=' + pressChip.getAttribute('aria-pressed'));
      say(out('what-check'), 'checked=' + checkChip.checked);
      say(out('what-switch'), 'aria-checked=' + switchChip.getAttribute('aria-checked'));
    }

    function onAsk() {
      var entries = [];
      new FormData(form).forEach(function (value, key) {
        entries.push(key + '=' + value);
      });
      // Not marked as a failure: the two buttons having nothing to send is
      // correct, and it is the reason to reach for the checkbox instead.
      say(out('what-data'), entries.length ? entries.join(' & ') : 'nothing');
    }

    if (switchChip) switchChip.addEventListener('click', onSwitchClick);
    if (checkChip) checkChip.addEventListener('change', sampleSubmits);
    if (ask) ask.addEventListener('click', onAsk);

    /* === [ROVING] example 5 ==============================================
       APG's toolbar: one tab stop for the row, arrows between the chips. Worth
       it when a row is long enough to bury whatever follows it, and not before
       — it is a keyboard map a reader has to discover.

       tabindex is managed here rather than in the markup, because the element
       that holds the 0 has to be the one focus left from. */

    var toolbar = root.querySelector('[data-ac-chip-toolbar]');
    var bars = toolbar ? [].slice.call(toolbar.querySelectorAll('[data-ac-chip]')) : [];

    function focusAt(index) {
      var next = (index + bars.length) % bars.length;
      bars.forEach(function (chip, i) {
        chip.tabIndex = i === next ? 0 : -1;
      });
      bars[next].focus();
    }

    function onToolbarKey(event) {
      var here = bars.indexOf(event.target);
      if (here === -1) return;

      if (event.key === 'ArrowRight') focusAt(here + 1);
      else if (event.key === 'ArrowLeft') focusAt(here - 1);
      else if (event.key === 'Home') focusAt(0);
      else if (event.key === 'End') focusAt(bars.length - 1);
      else return;

      // Home and End scroll the page otherwise, and the arrows scroll it
      // sideways inside a wrapped row.
      event.preventDefault();
    }

    function sampleStops() {
      [
        ['plain-stops', root.querySelector('[data-ac-ct-plain]')],
        ['bar-stops', toolbar],
      ].forEach(function (pair) {
        if (!pair[1]) return;
        var stops = [].slice.call(pair[1].querySelectorAll('[data-ac-chip]')).filter(function (c) {
          return c.tabIndex >= 0;
        });
        say(out(pair[0]), String(stops.length));
      });
    }

    if (toolbar) {
      bars.forEach(function (chip, i) {
        chip.tabIndex = i === 0 ? 0 : -1;
      });
      toolbar.addEventListener('keydown', onToolbarKey);
    }

    /* === wiring ========================================================== */

    function onToggled(event) {
      var chip = event.target;
      if (chip.dataset.acCtCount !== undefined) sampleFilter();
      if (chip.dataset.acCtCue) sampleCues(chip);
      if (chip.dataset.acCtName) sampleNames(chip);
      if (form && form.contains(chip)) sampleSubmits();
      if (toolbar && toolbar.contains(chip)) sampleStops();
    }

    root.addEventListener('ac:chip-toggle', onToggled);

    /** Re-run every readout on this page. */
    function sampleAll() {
      sampleFilter();
      sampleSubmits();
      sampleStops();
      CUES.forEach(function (key) {
        var chip = root.querySelector('[data-ac-ct-cue="' + key + '"]');
        if (chip) sampleCues(chip);
      });
      ['swap', 'keep'].forEach(function (key) {
        var chip = root.querySelector('[data-ac-ct-name="' + key + '"]');
        if (chip) sampleNames(chip);
      });
    }

    // Read after layout has settled: sampling during construction can catch a
    // chip mid-entrance and report a computed style it never actually has.
    if (typeof global.requestAnimationFrame === 'function') {
      global.requestAnimationFrame(sampleAll);
    } else {
      sampleAll();
    }

    var api = {
      element: root,
      /** The component. Everything else in this file is this page. */
      toggle: toggle,
      /** Re-run every readout. */
      refresh: sampleAll,
      destroy: function () {
        root.removeEventListener('click', onClick);
        root.removeEventListener('ac:chip-toggle', onToggled);
        if (switchChip) switchChip.removeEventListener('click', onSwitchClick);
        if (checkChip) checkChip.removeEventListener('change', sampleSubmits);
        if (ask) ask.removeEventListener('click', onAsk);
        if (toolbar) toolbar.removeEventListener('keydown', onToolbarKey);

        bars.forEach(function (chip) {
          chip.removeAttribute('tabindex');
        });
        root.querySelectorAll('[data-ac-chip][aria-pressed]').forEach(function (chip) {
          chip.setAttribute('aria-pressed', 'false');
        });
        if (switchChip) switchChip.setAttribute('aria-checked', 'false');

        var swap = root.querySelector('[data-ac-ct-name="swap"]');
        if (swap) swap.textContent = 'Follow';
        if (result) result.textContent = resultAtLoad;

        root.querySelectorAll('[data-ac-ct-out]').forEach(function (node) {
          say(node, '—');
        });
        say(cuesVerdict, '');
        say(namesVerdict, '');

        delete root._acChipToggle;
      },
    };

    root._acChipToggle = api;
    return api;
  }

  global.AC = global.AC || {};
  global.AC.createChipToggle = createChipToggle;

  /* === [AUTO-INIT] delete this block if you construct instances yourself === */
  function initAll(scope) {
    (scope || document).querySelectorAll('[data-ac-chip-toggle]').forEach(function (el) {
      createChipToggle(el);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initAll();
    });
  } else {
    initAll();
  }
})(window);
