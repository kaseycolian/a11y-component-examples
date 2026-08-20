/* ===========================================================================
   ALERT

   WHAT TO COPY
     [CORE]       build a notice element. Needed by everything below.
     [SPEAK]      the announce recipe, lifted from Live Region. This and [CORE]
                  are the whole component — about thirty lines.
     [ANNOUNCED]  example 2. What is left of a notice once the color is gone.
     [LOG]        examples 3 and 4. A mock screen reader: it watches the live
                  regions that existed at load and prints what they gave it.
     [APPEAR]     example 3. The same notice added three ways.
     [ALERT]      example 4. Assertive for errors, polite for everything else.
     [DISMISS]    example 5. Where focus goes when a notice is removed.
     [AUTO-INIT]  delete if you construct instances yourself.

   Copy the file whole for the library version.

   A static notice needs no JavaScript at all — example 1 has none. This file
   exists for the other case, and it makes one decision:

     the live role goes on the container, not on the notice.

   A screen reader announces a *change* to a region it is already watching, so
   the region has to be in the document, unhidden, and empty before there is
   anything to put in it. A notice that arrives already carrying role="status"
   was never being watched, and the DOM afterwards is identical either way —
   which is why this bug survives review. Example 3 has both, live.

   role="alert" is assertive: it interrupts. Errors only, and never on markup
   that is present when the page loads, or it fires on every render.

   No dependencies. Plain IIFE, so a paste into a <script> tag works.
   =========================================================================== */
(function (global) {
  'use strict';

  /* === [CORE] ============================================================ */

  /** The word that carries the tone. The icon beside it never does. */
  var PREFIX = {
    info: 'Note:',
    success: 'Success:',
    warn: 'Warning:',
    error: 'Error:',
  };

  /** Stroke paths per tone, drawn on currentColor so forced colors recolors
      them along with the text. */
  var GLYPH = {
    info: ['M12 11v6', 'M12 7.6v.1'],
    success: ['M8 12.4l2.7 2.7L16 9.8'],
    warn: ['M12 9.5v4.6', 'M12 17v.1'],
    error: ['M9 9l6 6', 'M15 9l-6 6'],
  };

  var SVG_NS = 'http://www.w3.org/2000/svg';

  /**
   * Build a notice. Markup only — it carries no role, and putting one on it is
   * the failure in example 3.
   *
   * @param {string} tone info | success | warn | error
   * @param {string} text the sentence, without the prefix word
   * @returns {HTMLElement}
   */
  function buildNotice(tone, text) {
    var el = document.createElement('div');
    el.className = 'ac-notice ac-notice--' + tone;

    var icon = document.createElementNS(SVG_NS, 'svg');
    icon.setAttribute('class', 'ac-notice__icon');
    // Decoration. The prefix word below is what says which tone this is.
    icon.setAttribute('aria-hidden', 'true');
    icon.setAttribute('viewBox', '0 0 24 24');
    icon.setAttribute('focusable', 'false');

    if (tone === 'warn') {
      icon.appendChild(path('M12 3.6L21.2 20H2.8z'));
    } else {
      var ring = document.createElementNS(SVG_NS, 'circle');
      ring.setAttribute('cx', '12');
      ring.setAttribute('cy', '12');
      ring.setAttribute('r', '9');
      icon.appendChild(ring);
    }

    GLYPH[tone].forEach(function (d) {
      icon.appendChild(path(d));
    });

    var body = document.createElement('p');
    body.className = 'ac-notice__text';

    var prefix = document.createElement('b');
    prefix.className = 'ac-notice__prefix';
    prefix.textContent = PREFIX[tone];

    body.appendChild(prefix);
    body.appendChild(document.createTextNode(' ' + text));

    el.appendChild(icon);
    el.appendChild(body);
    return el;
  }

  function path(d) {
    var node = document.createElementNS(SVG_NS, 'path');
    node.setAttribute('d', d);
    return node;
  }

  /* === [SPEAK] =========================================================== */

  /**
   * Put a notice into a region that already carries a live role.
   *
   * Cleared first, then written a frame later: assigning a region the content
   * it already holds is not a change, so the second press of the same button
   * would be silent. Two frames rather than one, because requestAnimationFrame
   * runs before paint and a single one can batch the clear and the write into
   * the same reported state. Live Region has the full argument.
   *
   * @param {HTMLElement} region an element already carrying role="status",
   *   role="alert" or aria-live. It must be in the document and not hidden.
   * @param {HTMLElement} notice
   * @returns {number} the frame handle, so a caller can cancel a pending write
   */
  function announce(region, notice) {
    if (!region) return 0;
    region.textContent = '';

    return requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        region.appendChild(notice);
      });
    });
  }

  /**
   * @param {HTMLElement} root element carrying [data-ac-notice]
   */
  function createNotice(root) {
    // Idempotent: initializing twice would double up the listeners.
    if (!root || root._acNotice) return root && root._acNotice;

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
      if (bad) node.setAttribute('data-ac-nc-bad', 'true');
      else node.removeAttribute('data-ac-nc-bad');
    }

    function out(name) {
      return root.querySelector('[data-ac-nc-out="' + name + '"]');
    }

    /** Wait n animation frames. The readouts below measure things the browser
        has not applied yet on the tick the click happened. */
    function afterFrames(n, fn) {
      var handle = requestAnimationFrame(function () {
        if (n <= 1) fn();
        else afterFrames(n - 1, fn);
      });
      frames.push(handle);
      return handle;
    }

    /* === the page's own plumbing ======================================== */

    /**
     * What a screen reader is given: the text with every aria-hidden subtree
     * removed. Filter Chip's nameOf() is the same walk plus generated content,
     * which a notice has none of.
     *
     * @param {Element} el
     * @returns {string}
     */
    function spokenText(el) {
      if (!el) return '';
      var copy = el.cloneNode(true);
      copy.querySelectorAll('[aria-hidden="true"]').forEach(function (node) {
        node.remove();
      });
      return (copy.textContent || '').replace(/\s+/g, ' ').trim();
    }

    /** An element's accessible name, short version — enough for a close
        button, which is named by aria-label or by nothing. */
    function nameOf(el) {
      if (!el) return '';
      var label = el.getAttribute('aria-label');
      if (label && label.trim()) return label.trim();
      return spokenText(el);
    }

    /* === [ANNOUNCED] example 2 =========================================== */

    var monoPanel = root.querySelector('[data-ac-nc-mono-panel]');
    var monoBox = root.querySelector('[data-ac-nc-mono]');
    var monoVerdict = root.querySelector('[data-ac-nc-mono-verdict]');

    /** Compare the two notices in one stack by what is actually announced. */
    function readStack(key) {
      var stack = root.querySelector('[data-ac-nc-mono-target="' + key + '"]');
      if (!stack) return;

      var notices = stack.querySelectorAll('.ac-notice');
      var first = spokenText(notices[0]);
      var second = spokenText(notices[1]);
      var same = first === second;

      say(out(key + '-said'), '"' + second + '"', same);
      say(out(key + '-tells'), same ? 'nothing' : 'the first word', same);
    }

    function refreshMono() {
      readStack('bare');
      readStack('good');

      if (!monoPanel) return;
      var on = !!(monoBox && monoBox.checked);
      monoPanel.setAttribute('data-ac-nc-mono-on', on ? 'true' : 'false');

      say(
        monoVerdict,
        on
          ? 'Color gone. The icon shapes still separate them on screen; the announced text never did.'
          : 'Two tones, one sentence. Only the prefix reaches a screen reader.',
        on,
      );
    }

    on(monoBox, 'change', refreshMono);

    /* === [LOG] examples 3 and 4 ==========================================
       A mock screen reader, and mock in one specific way: it watches only the
       live regions that were in the document when this ran. That is the whole
       point — a region added later is a region nobody was watching, and the
       log staying empty is the finding rather than a limitation. */

    function logIn(panel) {
      return panel && panel.querySelector('[data-ac-nc-log]');
    }

    function logAdd(list, politeness, text, bad) {
      if (!list) return;
      var li = document.createElement('li');
      var tag = document.createElement('b');
      tag.textContent = politeness;
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' · ' + text));
      if (bad) li.setAttribute('data-ac-nc-bad', 'true');
      list.appendChild(li);
    }

    /** polite | assertive, from the role the region actually carries. */
    function politenessOf(region) {
      var role = region.getAttribute('role');
      if (role === 'alert') return 'assertive';
      if (region.getAttribute('aria-live') === 'assertive') return 'assertive';
      return 'polite';
    }

    /**
     * Watch every live region inside `panel` and print what lands in it.
     * Regions are collected once, now, and never re-queried.
     */
    function watch(panel) {
      if (!panel) return;
      var list = logIn(panel);

      panel.querySelectorAll('[role="status"], [role="alert"], [aria-live]').forEach(function (region) {
        var politeness = politenessOf(region);
        var observer = new MutationObserver(function () {
          var text = spokenText(region);
          if (!text) return;
          logAdd(list, politeness, '"' + text + '"');
        });
        observer.observe(region, { childList: true, characterData: true, subtree: true });
        observers.push(observer);
      });
    }

    /**
     * Press a button and report the silence. If nothing reached the log three
     * frames later — one more than announce() takes — nothing was announced.
     */
    function pressed(list, label) {
      var before = list ? list.children.length : 0;
      afterFrames(4, function () {
        if (list && list.children.length === before) {
          logAdd(list, 'silent', label, true);
        }
      });
    }

    /* === [APPEAR] example 3 =============================================== */

    var appearPanel = root.querySelector('[data-ac-nc-appear]');
    var appearLog = logIn(appearPanel);

    watch(appearPanel);

    root.querySelectorAll('[data-ac-nc-add]').forEach(function (button) {
      var key = button.getAttribute('data-ac-nc-add');
      var slot = root.querySelector('[data-ac-nc-slot="' + key + '"]');

      on(button, 'click', function () {
        var notice = buildNotice('success', '462 rows saved.');

        if (key === 'late') {
          // BROKEN ON PURPOSE — the role rides in on the notice. By the time
          // it is in the document there is nothing left to change.
          notice.setAttribute('role', 'status');
        }

        announce(slot, notice);

        if (key !== 'good') {
          pressed(
            appearLog,
            key === 'late'
              ? 'role on the message — the region was not being watched'
              : 'no live role anywhere',
          );
        }
      });
    });

    /* === [ALERT] example 4 ================================================ */

    var alertPanel = root.querySelector('[data-ac-nc-alert]');
    var alertLog = logIn(alertPanel);

    if (alertPanel) {
      // Anything assertive that is already populated has fired. Polite regions
      // with content at load are not announced, which is why only alerts are
      // scanned here.
      alertPanel.querySelectorAll('[role="alert"]').forEach(function (region) {
        var text = spokenText(region);
        if (text) {
          logAdd(alertLog, 'assertive', '"' + text + '" — at page load, before you did anything', true);
        }
      });

      watch(alertPanel);
    }

    root.querySelectorAll('[data-ac-nc-pay]').forEach(function (button) {
      var failing = button.getAttribute('data-ac-nc-pay') === 'fail';
      var slot = root.querySelector('[data-ac-nc-slot="' + (failing ? 'err' : 'ok') + '"]');

      on(button, 'click', function () {
        announce(
          slot,
          failing
            ? buildNotice('error', 'The card ending 4462 was declined. Nothing was charged.')
            : buildNotice('success', 'Paid. Invoice 99 was emailed to you.'),
        );
      });
    });

    /* === [DISMISS] example 5 ==============================================
       Removing the focused element does not move focus — it drops to <body>,
       and a keyboard reader is returned to the top of the document. Chrome
       will not focus() <body> back either, so there is no undoing it later:
       the next focus target has to be chosen before the removal. */

    var dismissPanel = root.querySelector('[data-ac-nc-dismiss]');
    var originals = {};

    ['drop', 'keep'].forEach(function (key) {
      var host = root.querySelector('[data-ac-nc-host="' + key + '"]');
      if (host) originals[key] = host.innerHTML;
    });

    function describeFocus() {
      var el = document.activeElement;
      if (!el || el === document.body) return 'body';
      var name = nameOf(el);
      return el.tagName.toLowerCase() + (name ? ' "' + name + '"' : '');
    }

    function refreshDismiss() {
      ['drop', 'keep'].forEach(function (key) {
        var button = root.querySelector('[data-ac-nc-close="' + key + '"]');
        say(out(key + '-name'), button ? '"' + nameOf(button) + '"' : 'gone', key === 'drop');
      });
    }

    function onClose(event) {
      var button = event.target.closest && event.target.closest('[data-ac-nc-close]');
      if (!button || !dismissPanel || !dismissPanel.contains(button)) return;

      var key = button.getAttribute('data-ac-nc-close');
      var host = root.querySelector('[data-ac-nc-host="' + key + '"]');
      var notice = button.closest('.ac-notice');

      if (key === 'keep') {
        // Chosen before the removal, and focused before it too: the host is
        // role="status" with a name, so focus lands somewhere that says what
        // just happened rather than somewhere that says nothing.
        host.focus();
        notice.remove();
        host.textContent = 'Dismissed. One notice left the list.';
      } else {
        // BROKEN ON PURPOSE — the focused button is removed and nothing takes
        // its place.
        notice.remove();
      }

      afterFrames(2, function () {
        say(out(key + '-focus'), describeFocus(), key === 'drop');
        refreshDismiss();
      });
    }

    if (dismissPanel) on(dismissPanel, 'click', onClose);

    on(root.querySelector('[data-ac-nc-reset]'), 'click', function () {
      ['drop', 'keep'].forEach(function (key) {
        var host = root.querySelector('[data-ac-nc-host="' + key + '"]');
        if (host && originals[key] !== undefined) host.innerHTML = originals[key];
        say(out(key + '-focus'), '—');
      });
      refreshDismiss();
    });

    /* === wire it up ====================================================== */

    function refresh() {
      refreshMono();
      refreshDismiss();
    }

    refresh();

    var api = {
      /** The two pieces worth lifting. Everything else on this page is the
          page checking its own claims. */
      build: buildNotice,
      announce: announce,
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
        delete root._acNotice;
      },
    };

    root._acNotice = api;
    return api;
  }

  global.AC = global.AC || {};
  global.AC.createNotice = createNotice;
  global.AC.buildNotice = buildNotice;
  global.AC.announceNotice = announce;

  /* === [AUTO-INIT] delete this block if you construct instances yourself === */
  function initAll(scope) {
    (scope || document).querySelectorAll('[data-ac-notice]').forEach(function (el) {
      createNotice(el);
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
