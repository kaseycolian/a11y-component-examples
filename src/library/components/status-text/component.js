/* ===========================================================================
   STATUS LABEL

   WHAT TO COPY
     [SET]        set a label's tone and word. This is the whole component —
                  about fifteen lines — and the only part worth lifting.
     [NAME]       what a screen reader is given, including CSS generated
                  content. Examples 2, 3 and 5 are built on it.
     [GLYPH]      example 2. Four labels that all mean "this worked".
     [DETAIL]     example 3. Where the reason goes.
     [LOG]        example 4. A mock screen reader watching the live regions.
     [CHANGE]     example 4. One region for a list, or one per row.
     [NARROW]     example 5. The word clipped, or the word removed.
     [AUTO-INIT]  delete if you construct instances yourself.

   Copy the file whole for the library version.

   A static status needs no JavaScript — example 1 has none. This file exists
   for the case where the label changes, and it makes one decision:

     the live region belongs to the list, not to the label.

   A status label has no container of its own, so the tempting place to put
   role="status" is the label itself. Four rows updating is then four
   announcements queued behind each other, and a reader cannot skip them.
   One region per list announces the summary instead. Example 4 counts both.

   No dependencies. Plain IIFE, so a paste into a <script> tag works.
   =========================================================================== */
(function (global) {
  'use strict';

  /* === [SET] ============================================================= */

  var TONES = ['ok', 'err', 'muted'];

  /**
   * Set a status label's tone and word.
   *
   * The word is written and the tone follows it, never the other way around:
   * there is no argument here that changes the color without changing the
   * text, so the two cannot drift apart.
   *
   * @param {HTMLElement} el an .ac-status element
   * @param {string} tone ok | err | muted
   * @param {string} word the status, in the reader's language
   */
  function setStatus(el, tone, word) {
    if (!el) return;

    TONES.forEach(function (name) {
      el.classList.toggle('ac-status--' + name, name === tone);
    });

    var text = el.querySelector('.ac-status__text');
    if (!text) {
      text = document.createElement('span');
      text.className = 'ac-status__text';
      el.appendChild(text);
    }
    text.textContent = word;
  }

  /**
   * @param {HTMLElement} root element carrying [data-ac-status-text]
   */
  function createStatusText(root) {
    // Idempotent: initializing twice would double up the listeners.
    if (!root || root._acStatusText) return root && root._acStatusText;

    var frames = [];
    var observers = [];
    var cleanups = [];

    function on(el, type, fn) {
      if (!el) return;
      el.addEventListener(type, fn);
      cleanups.push(function () {
        el.removeEventListener(type, fn);
      });
    }

    function say(node, text, bad) {
      if (!node) return;
      node.textContent = text;
      if (bad) node.setAttribute('data-ac-st-bad', 'true');
      else node.removeAttribute('data-ac-st-bad');
    }

    function out(name) {
      return root.querySelector('[data-ac-st-out="' + name + '"]');
    }

    /** Wait n animation frames. The readouts measure things the browser has
        not applied yet on the tick the click happened. */
    function afterFrames(n, fn) {
      var handle = requestAnimationFrame(function () {
        if (n <= 1) fn();
        else afterFrames(n - 1, fn);
      });
      frames.push(handle);
      return handle;
    }

    /* === [NAME] ==========================================================
       What a screen reader is given. Three things the obvious `textContent`
       gets wrong, and this page turns on all three:

         aria-hidden subtrees are dropped — the glyph;
         display:none and visibility:hidden subtrees are dropped, while
           clipped ones stay — example 5 is the difference between those two;
         CSS generated content is INCLUDED — example 2's tick is a stylesheet
           declaration that ends up in the text.

       Filter Chip's nameOf() is the same walk. A clipped element is still in
       the accessibility tree, which is the whole reason .ac-status__detail
       works and a title attribute does not. */

    /** The text of ::before or ::after, or '' when there is none to read. */
    function generated(el, which) {
      var style = getComputedStyle(el, which);
      if (!style || style.content === 'none' || style.content === 'normal') return '';
      // A pseudo-element that is not rendered is not in the accessibility
      // tree either — example 3's hover bubble is visibility: hidden until
      // the pointer arrives, and a keyboard never makes it arrive.
      if (style.display === 'none' || style.visibility === 'hidden') return '';
      var quoted = style.content.match(/^"([\s\S]*)"$/);
      return quoted ? quoted[1] : '';
    }

    function rendered(el) {
      var style = getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden';
    }

    function spokenText(el) {
      if (!el) return '';

      var parts = [generated(el, '::before')];

      Array.prototype.forEach.call(el.childNodes, function (node) {
        if (node.nodeType === 3) {
          parts.push(node.nodeValue);
        } else if (node.nodeType === 1) {
          if (node.getAttribute('aria-hidden') === 'true') return;
          if (!rendered(node)) return;
          parts.push(spokenText(node));
        }
      });

      parts.push(generated(el, '::after'));
      return parts.join(' ').replace(/\s+/g, ' ').trim();
    }

    /* === [GLYPH] example 2 =============================================== */

    function refreshGlyph() {
      ['dot', 'css', 'emoji', 'good'].forEach(function (key) {
        var label = root.querySelector('[data-ac-st-said="' + key + '"]');
        if (!label) return;

        var said = spokenText(label);
        say(out(key), said ? '"' + said + '"' : 'nothing', key !== 'good');
      });
    }

    /* === [DETAIL] example 3 ============================================== */

    function refreshDetail() {
      ['title', 'tip', 'good'].forEach(function (key) {
        var label = root.querySelector('[data-ac-st-detail-case="' + key + '"]');
        if (!label) return;

        var said = spokenText(label);
        // A title is a fallback: an element that already has text ignores it
        // outright, so the reason is not merely quiet — it is absent.
        say(out(key === 'good' ? 'detail-good' : key), '"' + said + '"', key !== 'good');
      });
    }

    /* === [LOG] example 4 =================================================
       A mock screen reader, and mock in one specific way: it watches the live
       regions that were in the document when it ran, and prints what lands in
       them. Counting the entries is the point of example 4. */

    function logAdd(list, text, bad) {
      if (!list) return;
      var li = document.createElement('li');
      var tag = document.createElement('b');
      tag.textContent = 'polite';
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' · ' + text));
      if (bad) li.setAttribute('data-ac-st-bad', 'true');
      list.appendChild(li);
    }

    function watch(panel, list, bad) {
      if (!panel) return;

      panel.querySelectorAll('[role="status"], [role="alert"], [aria-live]').forEach(function (region) {
        var observer = new MutationObserver(function () {
          var text = spokenText(region);
          if (!text) return;
          logAdd(list, '"' + text + '"', bad(region));
        });
        observer.observe(region, { childList: true, characterData: true, subtree: true });
        observers.push(observer);
      });
    }

    /* === [CHANGE] example 4 ==============================================
       Two lists, the same four rows, the same result on screen. The only
       difference is which element carries role="status". */

    var STATES = [
      [
        { tone: 'muted', word: 'Waiting' },
        { tone: 'muted', word: 'Waiting' },
        { tone: 'muted', word: 'Waiting' },
        { tone: 'muted', word: 'Waiting' },
      ],
      [
        { tone: 'ok', word: 'Shipped' },
        { tone: 'err', word: 'Failed' },
        { tone: 'ok', word: 'Shipped' },
        { tone: 'muted', word: 'Waiting' },
      ],
    ];

    var changePanel = root.querySelector('[data-ac-st-change]');
    var changeLog = changePanel && changePanel.querySelector('[data-ac-st-log]');
    var phase = { many: 0, one: 0 };

    if (changePanel) {
      watch(changePanel, changeLog, function (region) {
        // The per-row regions are the failure; the list's own region is not.
        return region.classList.contains('ac-status');
      });
    }

    /**
     * Apply the next state to one list.
     * @returns {{changed: number, shipped: number, failed: number}}
     */
    function applyState(key) {
      phase[key] = phase[key] ? 0 : 1;
      var state = STATES[phase[key]];
      var tally = { changed: 0, shipped: 0, failed: 0 };

      state.forEach(function (row, index) {
        var cell = root.querySelector('[data-ac-st-cell="' + key + '-' + (index + 1) + '"]');
        if (!cell) return;

        var text = cell.querySelector('.ac-status__text');
        // Only rows that actually changed are written. Rewriting a region the
        // string it already holds is a DOM mutation without being news.
        if (text && text.textContent.trim() === row.word) return;

        setStatus(cell, row.tone, row.word);
        tally.changed += 1;
        if (row.tone === 'ok') tally.shipped += 1;
        if (row.tone === 'err') tally.failed += 1;
      });

      return tally;
    }

    function sentence(tally) {
      if (!tally.changed) return 'Nothing changed.';
      var parts = [];
      if (tally.shipped) parts.push(tally.shipped + ' shipped');
      if (tally.failed) parts.push(tally.failed + ' failed');
      return (
        tally.changed +
        ' of 4 orders changed' +
        (parts.length ? '. ' + parts.join(', ') + '.' : '.')
      );
    }

    root.querySelectorAll('[data-ac-st-refresh]').forEach(function (button) {
      var key = button.getAttribute('data-ac-st-refresh');

      on(button, 'click', function () {
        var tally = applyState(key);
        if (key === 'many') return;

        // The specimen: the labels changed silently, and one region says what
        // happened. Cleared first and written two frames later — Alert and
        // Live Region have the reasoning.
        var slot = root.querySelector('[data-ac-st-slot="one"]');
        if (!slot) return;
        slot.textContent = '';
        frames.push(
          requestAnimationFrame(function () {
            frames.push(
              requestAnimationFrame(function () {
                slot.textContent = sentence(tally);
              }),
            );
          }),
        );
      });
    });

    /* === [NARROW] example 5 ============================================== */

    var narrowPanel = root.querySelector('[data-ac-st-narrow-panel]');
    var narrowBox = root.querySelector('[data-ac-st-narrow]');
    var narrowVerdict = root.querySelector('[data-ac-st-narrow-verdict]');

    function refreshNarrow() {
      var squeezed = !!(narrowBox && narrowBox.checked);

      if (narrowPanel) {
        narrowPanel.setAttribute('data-ac-st-narrow-on', squeezed ? 'true' : 'false');
      }

      var keep = root.querySelector('[data-ac-st-narrow-case="keep"]');
      if (keep) keep.classList.toggle('ac-status--compact', squeezed);

      ['gone', 'keep'].forEach(function (key) {
        var label = root.querySelector('[data-ac-st-narrow-case="' + key + '"]');
        if (!label) return;
        var said = spokenText(label);
        say(out(key), said ? '"' + said + '"' : 'nothing', !said);
      });

      say(
        narrowVerdict,
        squeezed
          ? 'Same two ticks on screen. Removed, the word is gone from the accessibility tree; clipped, it is still there.'
          : 'Both say Shipped.',
        squeezed,
      );
    }

    on(narrowBox, 'change', refreshNarrow);

    /* === wire it up ======================================================= */

    function refresh() {
      refreshGlyph();
      refreshDetail();
      refreshNarrow();
    }

    refresh();

    var api = {
      /** The one piece worth lifting. Everything else in this file is the page
          checking its own claims. */
      set: setStatus,
      refresh: refresh,
      destroy: function () {
        frames.forEach(cancelAnimationFrame);
        observers.forEach(function (observer) {
          observer.disconnect();
        });
        cleanups.forEach(function (fn) {
          fn();
        });
        frames = [];
        observers = [];
        cleanups = [];
        delete root._acStatusText;
      },
    };

    root._acStatusText = api;
    return api;
  }

  global.AC = global.AC || {};
  global.AC.createStatusText = createStatusText;
  global.AC.setStatus = setStatus;

  /* === [AUTO-INIT] delete this block if you construct instances yourself === */
  function initAll(scope) {
    (scope || document).querySelectorAll('[data-ac-status-text]').forEach(function (el) {
      createStatusText(el);
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
