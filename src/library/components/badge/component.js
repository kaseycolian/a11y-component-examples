/* ===========================================================================
   BADGE

   WHAT TO COPY
     [SET]        write a count. This is the whole component — about twenty
                  lines — and the only part worth lifting.
     [NAME]       what a screen reader is given. Examples 2 to 5 are built
                  on it.
     [CASES]      example 2. Four badges that all show 3.
     [ATTACH]     example 3. Nested in the control, or beside it.
     [SHAPES]     example 4. The abbreviation, the dots and the zero.
     [LOG]        example 5. A mock screen reader watching the live regions.
     [COUNT]      example 5. The count going up.
     [AUTO-INIT]  delete if you construct instances yourself.

   Copy the file whole for the library version.

   A static badge needs no JavaScript — example 1 has none. This file exists
   for the case where the count changes, and it makes one decision:

     the digits and the words are written together, in one call.

   There is no way to set one without the other. A badge is the one place where
   the thing on screen is routinely an abbreviation of the thing being said —
   "99+" for "99 or more unread messages" — so two setters would drift, and a
   badge reading 4 while announcing 3 is worse than either.

   No dependencies. Plain IIFE, so a paste into a <script> tag works.
   =========================================================================== */
(function (global) {
  'use strict';

  /* === [SET] ============================================================= */

  /**
   * Write a count into a badge.
   *
   * `subject` is a plural noun phrase — "unread messages" — and the default
   * template is deliberately naive: it produces "1 unread messages". Pass a
   * function instead for plurals, grammatical gender, or any language a
   * template cannot serve. That escape hatch is the point; a library that
   * concatenates English is not one you can ship.
   *
   * @param {HTMLElement} el an .ac-badge element
   * @param {number} count the real count, never the abbreviated one
   * @param {object} [options]
   * @param {string|function} [options.subject] noun phrase, or (count, max) => name
   * @param {number} [options.max] draw max + "+" above this. 0 disables it.
   */
  function setBadge(el, count, options) {
    if (!el) return;

    var opts = options || {};
    var subject = opts.subject || el.getAttribute('data-ac-badge-subject') || '';
    var max = typeof opts.max === 'number' ? opts.max : Number(el.getAttribute('data-ac-badge-max')) || 0;
    var over = max > 0 && count > max;

    // Zero is not a badge. Removed rather than drawn empty, and the words go
    // with it — a hidden element is out of the accessibility tree, so nothing
    // is left announcing a count that is no longer there.
    el.hidden = count <= 0;

    var num = el.querySelector('.ac-badge__num');
    if (num) num.textContent = over ? max + '+' : String(count);

    var name = el.querySelector('.ac-badge__name');
    if (name) {
      name.textContent =
        typeof subject === 'function'
          ? subject(count, max)
          : (over ? max + ' or more ' : count + ' ') + subject;
    }
  }

  /**
   * @param {HTMLElement} root element carrying [data-ac-badge]
   */
  function createBadge(root) {
    // Idempotent: initializing twice would double up the listeners.
    if (!root || root._acBadge) return root && root._acBadge;

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
      if (bad) node.setAttribute('data-ac-bdg-bad', 'true');
      else node.removeAttribute('data-ac-bdg-bad');
    }

    function out(name) {
      return root.querySelector('[data-ac-bdg-out="' + name + '"]');
    }

    /* === [NAME] ==========================================================
       What a screen reader is given, for anything named from its contents —
       a badge, or a button. Three things the obvious textContent gets wrong:

         aria-hidden subtrees are dropped — .ac-badge__num, and the icons;
         display:none and visibility:hidden subtrees are dropped, while
           clipped ones stay — which is why .ac-badge__name works at all;
         the element's own aria-hidden counts too — example 2 hides a whole
           badge, and textContent would still report its digits.

       And the one that decides example 5: naming from contents only folds in
       a child whose own role takes a name from its contents. No live-region
       role does, so a badge carrying role="status" contributes nothing to the
       button it is nested in. Browser-confirmed in Chromium — the spec asserts
       it against the real accessibility tree, not against this walk.

       Status Text and Filter Chip have the same walk. Nothing here handles
       aria-label or aria-labelledby, because nothing on this page uses them:
       the whole argument is that real text composes and an attribute does
       not. */

    var LIVE_ROLES = { status: 1, alert: 1, log: 1, marquee: 1, timer: 1 };

    function namesFromContent(el) {
      return !LIVE_ROLES[(el.getAttribute('role') || '').trim().toLowerCase()];
    }

    function generated(el, which) {
      var style = getComputedStyle(el, which);
      if (!style || style.content === 'none' || style.content === 'normal') return '';
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
      if (el.getAttribute('aria-hidden') === 'true') return '';
      if (!rendered(el)) return '';

      var parts = [generated(el, '::before')];

      Array.prototype.forEach.call(el.childNodes, function (node) {
        if (node.nodeType === 3) {
          parts.push(node.nodeValue);
        } else if (node.nodeType === 1) {
          // The root is read whatever its role — that is how [LOG] gets the
          // text out of a region. A child live region is not part of the name.
          if (!namesFromContent(node)) return;
          parts.push(spokenText(node));
        }
      });

      parts.push(generated(el, '::after'));
      return parts.join(' ').replace(/\s+/g, ' ').trim();
    }

    /** Print a name, or the word "nothing" when there is none. */
    function report(key, el, bad) {
      var said = spokenText(el);
      say(out(key), said ? '"' + said + '"' : 'nothing', bad);
      return said;
    }

    /* === [CASES] example 2 =============================================== */

    function refreshCases() {
      ['bare', 'mute', 'twice', 'good'].forEach(function (key) {
        report(key, root.querySelector('[data-ac-bdg-said="' + key + '"]'), key !== 'good');
      });
    }

    /* === [ATTACH] example 3 ==============================================
       The button's own name, not the badge's. Nested, the badge's words are
       part of it; beside it, they are a separate node the reader meets after
       the button and has to connect for themselves. */

    function refreshAttach() {
      var panel = root.querySelector('[data-ac-bdg-attach]');
      if (!panel) return;

      ['loose', 'nested'].forEach(function (key) {
        report(
          key + '-btn',
          panel.querySelector('[data-ac-bdg-btn="' + key + '"]'),
          key === 'loose',
        );
      });

      report('loose', panel.querySelector('[data-ac-bdg-said="loose"]'), true);
    }

    /* === [SHAPES] example 4 ============================================== */

    function refreshShapes() {
      ['over', 'dot', 'named', 'zero'].forEach(function (key) {
        report(
          key,
          root.querySelector('[data-ac-bdg-shape="' + key + '"]'),
          key === 'dot',
        );
      });
    }

    /* === [LOG] example 5 =================================================
       A mock screen reader, and mock in one specific way: it watches the live
       regions that were in the document when it ran, and prints what lands in
       them. Counting the entries is the point of example 5. */

    function logAdd(list, text, bad) {
      if (!list) return;
      var li = document.createElement('li');
      var tag = document.createElement('b');
      tag.textContent = 'polite';
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' · ' + text));
      if (bad) li.setAttribute('data-ac-bdg-bad', 'true');
      list.appendChild(li);
    }

    function watch(panel, list, bad) {
      if (!panel) return;

      panel.querySelectorAll('[role="status"], [role="alert"], [aria-live]').forEach(function (region) {
        // The verdict line is this page talking about the demo, not the demo's
        // own output. It is announced, and it is not one of the announcements
        // being counted.
        if (region.hasAttribute('data-ac-bdg-verdict')) return;

        var observer = new MutationObserver(function () {
          var text = spokenText(region);
          if (!text) return;
          logAdd(list, '"' + text + '"', bad(region));
        });
        observer.observe(region, { childList: true, characterData: true, subtree: true });
        observers.push(observer);
      });
    }

    /* === [COUNT] example 5 ===============================================
       Two inboxes, the same arithmetic, the same digits on screen. The only
       difference is which element carries role="status". */

    var START = 98;
    var MAX = 99;
    var SUBJECT = 'unread messages';

    var countPanel = root.querySelector('[data-ac-bdg-count]');
    var countLog = countPanel && countPanel.querySelector('[data-ac-bdg-log]');
    var slot = root.querySelector('[data-ac-bdg-slot]');
    var verdict = root.querySelector('[data-ac-bdg-verdict]');
    var count = START;

    if (countPanel) {
      watch(countPanel, countLog, function (region) {
        // The badge is the failure; the inbox's own region is not.
        return region.classList.contains('ac-badge');
      });
    }

    function refreshCount() {
      // The announcing button is flagged because its count is not in its name
      // at all — role="status" took it out. See [NAME].
      ['live', 'quiet'].forEach(function (key) {
        report(key + '-btn', root.querySelector('[data-ac-bdg-btn="' + key + '"]'), key === 'live');
      });
    }

    function applyCount(next, arrived) {
      count = next;

      ['live', 'quiet'].forEach(function (key) {
        setBadge(root.querySelector('[data-ac-bdg-badge="' + key + '"]'), count, {
          subject: SUBJECT,
          max: MAX,
        });
      });

      refreshCount();

      if (!slot) return;

      // The specimen: the badge changed silently and one region says what
      // happened, in a sentence. Cleared first and written two frames later —
      // Live Region has the reasoning.
      slot.textContent = '';
      if (!arrived) return;

      frames.push(
        requestAnimationFrame(function () {
          frames.push(
            requestAnimationFrame(function () {
              slot.textContent =
                arrived + (arrived === 1 ? ' new message. ' : ' new messages. ') +
                (count > MAX ? MAX + ' or more' : count) + ' unread.';
            }),
          );
        }),
      );
    }

    on(root.querySelector('[data-ac-bdg-add]'), 'click', function () {
      applyCount(count + 1, 1);
      say(
        verdict,
        count > MAX
          ? 'The badge stopped counting at ' + MAX + '. The words did not.'
          : 'Both badges read ' + count + '.',
        false,
      );
    });

    on(root.querySelector('[data-ac-bdg-reset]'), 'click', function () {
      applyCount(START, 0);
      say(verdict, '', false);

      // A frame, not this tick: a MutationObserver callback is a microtask, so
      // clearing the log here would run before the reset's own mutations
      // reached it and they would land in an empty list.
      frames.push(
        requestAnimationFrame(function () {
          if (countLog) countLog.textContent = '';
        }),
      );
    });

    /* === wire it up ======================================================= */

    function refresh() {
      refreshCases();
      refreshAttach();
      refreshShapes();
      refreshCount();
    }

    refresh();

    var api = {
      /** The one piece worth lifting. Everything else in this file is the page
          checking its own claims. */
      set: setBadge,
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
        delete root._acBadge;
      },
    };

    root._acBadge = api;
    return api;
  }

  global.AC = global.AC || {};
  global.AC.createBadge = createBadge;
  global.AC.setBadge = setBadge;

  /* === [AUTO-INIT] delete this block if you construct instances yourself === */
  function initAll(scope) {
    (scope || document).querySelectorAll('[data-ac-badge]').forEach(function (el) {
      createBadge(el);
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
