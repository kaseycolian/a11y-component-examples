/* ===========================================================================
   COPYABLE RESULT

   WHAT TO COPY
     [COPY]       examples 1, 4 and 5. The copy button. Lifted from Input
                  Group, and the piece most people are here for.
     [SET]        example 3. Writing a result: one call, every part, one
                  sentence out.
     [NAME]       what a screen reader is given. The readouts are built on it.
     [MEASURE]    example 2. How narrow each value is willing to be.
     [LOG]        example 3. A mock screen reader watching the live regions.
     [BUILD]      example 3. The two panels being filled in.
     [CASES]      example 4. The two broken confirmations.
     [EMPTY]      example 5. What an empty value slot is read out as.
     [AUTO-INIT]  delete if you construct instances yourself.

   Copy the file whole for the library version.

   A static result panel needs no JavaScript — example 1 is markup and CSS
   until you press the button. This file makes one decision:

     the panel announces, and nothing inside it does.

   Every part a result panel is made of can carry a live role, and each one is
   defensible alone. Together they are four interruptions for one action, so
   setResult writes all of them and hands exactly one sentence to the region.
   Example 3 is the same action with and without that rule.

   No dependencies. Plain IIFE, so a paste into a <script> tag works.
   =========================================================================== */
(function (global) {
  'use strict';

  /** How long a copy confirmation stays in the region before it is cleared.
      A stale "Copied" sitting there describes nothing. */
  var STATUS_MS = 4000;

  /* === [COPY] ============================================================== */

  /**
   * Copy a panel's value and report the outcome.
   *
   * Everything is found from the button's own .ac-result, which is the rule
   * this component exists to state: one panel, one value, one region.
   *
   * @param {HTMLElement} btn a button carrying [data-ac-rp-copy]
   * @param {object} [options]
   * @param {string} [options.copiedText]
   * @param {string} [options.failedText]
   * @param {string} [options.emptyText]
   * @returns {Promise<string>} the message that was announced
   */
  function copyResult(btn, options) {
    var opts = options || {};
    var panel = btn.closest('.ac-result');
    var value = panel && panel.querySelector('.ac-result__value');
    var status = panel && panel.querySelector('.ac-result__status');

    btn._acRpFrames = btn._acRpFrames || [];
    btn._acRpTimers = btn._acRpTimers || [];

    function announce(message) {
      // Cleared, then written two frames later: a screen reader is handed a
      // region that changed rather than one that was rebuilt, and two frames
      // rather than one because a single rAF still runs before paint and can
      // batch the clear and the write into one reported state. Live Region
      // has the argument.
      if (!status) return message;

      status.textContent = '';
      btn._acRpFrames.push(
        requestAnimationFrame(function () {
          btn._acRpFrames.push(
            requestAnimationFrame(function () {
              status.textContent = message;
              btn._acRpTimers.push(
                setTimeout(function () {
                  status.textContent = '';
                }, STATUS_MS),
              );
            }),
          );
        }),
      );
      return message;
    }

    // A soft-disabled button announces nothing, and that is deliberate. The
    // reason belongs on the button as a description, where it is read on
    // arrival; a live region reports what changed, and refusing to act is not
    // a change. Announcing it here would say the same sentence twice.
    if (btn.getAttribute('aria-disabled') === 'true') return Promise.resolve('');

    var text = value ? value.textContent.trim() : '';

    // An empty value is not a copy. Reporting success for one is example 5's
    // failure, and [data-ac-rp-unguarded] is how that panel opts out.
    if (!text && !btn.hasAttribute('data-ac-rp-unguarded')) {
      return Promise.resolve(announce(opts.emptyText || 'There is nothing to copy yet.'));
    }

    function fallback() {
      // execCommand is deprecated and still the only route without a secure
      // context. Selecting the value is a usable outcome on its own: the
      // person can finish with their own copy shortcut, which is what the
      // failure message tells them to do.
      if (!value) return false;
      var range = document.createRange();
      range.selectNodeContents(value);
      var selection = global.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      try {
        return document.execCommand('copy');
      } catch (e) {
        return false;
      }
    }

    function done(ok) {
      return announce(
        ok
          ? opts.copiedText || 'Copied to clipboard'
          : opts.failedText || 'Press Control C to copy the selected value',
      );
    }

    if (global.navigator && global.navigator.clipboard) {
      return global.navigator.clipboard.writeText(text).then(
        function () {
          return done(true);
        },
        function () {
          return done(fallback());
        },
      );
    }

    return Promise.resolve(done(fallback()));
  }

  /* === [SET] =============================================================== */

  /**
   * Write a result into a panel.
   *
   * One call, because the parts have to agree: a panel showing a URL under the
   * word "Waiting", or a count of 3 beside two parameters, is worse than any
   * one of them being missing. `say` is the only argument that is a sentence,
   * and the only one that reaches a live region.
   *
   * @param {HTMLElement} panel an .ac-result element
   * @param {object} state
   * @param {string} [state.value] the value, or '' for none
   * @param {string} [state.verdict] one word for the Status Label label
   * @param {string} [state.tone] 'ok' | 'err' | 'muted'
   * @param {number} [state.count] the Badge count; 0 removes the badge
   * @param {string} [state.subject] plural noun for the count — 'parameters'
   * @param {string} [state.note] Alert text, or '' to clear it
   * @param {string} [state.notePrefix] the tone spelled out — 'Warning:'
   * @param {string} [state.noteTone] 'info' | 'success' | 'warn' | 'error'
   * @param {string} [state.say] the one sentence handed to the region
   */
  function setResult(panel, state) {
    if (!panel) return;

    var value = panel.querySelector('.ac-result__value');
    if (value && typeof state.value === 'string') value.textContent = state.value;

    var verdict = panel.querySelector('.ac-status');
    if (verdict && state.verdict) {
      // The tone and the word are set together and there is no way to set one
      // alone, so the color and the text cannot drift. Status Label's rule.
      verdict.className = 'ac-status ac-status--' + (state.tone || 'muted');
      var word = verdict.querySelector('.ac-status__text');
      if (word) word.textContent = state.verdict;
    }

    var badge = panel.querySelector('.ac-badge');
    if (badge && typeof state.count === 'number') {
      // Zero is not a badge: it is removed, and the words go with it. Badge's
      // rule, and the digits and the words are written in the same call for
      // Badge's reason.
      badge.hidden = state.count <= 0;
      var num = badge.querySelector('.ac-badge__num');
      if (num) num.textContent = String(state.count);
      var name = badge.querySelector('.ac-badge__name');
      if (name) name.textContent = state.count + ' ' + (state.subject || '');
    }

    var slot = panel.querySelector('[data-ac-rp-note]');
    if (slot && typeof state.note === 'string') {
      slot.textContent = '';
      if (state.note) slot.appendChild(buildNotice(state.note, state.notePrefix, state.noteTone));
    }

    // The panel with no region says nothing, however loud its parts are. That
    // is example 3's broken case in one line.
    var status = panel.querySelector('.ac-result__status');
    if (status && typeof state.say === 'string') status.textContent = state.say;
  }

  /** An Alert, built rather than templated so the prefix word cannot be lost.
      The icon is left out: it is decoration, and Alert makes the case that
      the prefix is what carries the tone. */
  function buildNotice(text, prefix, tone) {
    var notice = document.createElement('div');
    notice.className = 'ac-notice ac-notice--' + (tone || 'info');

    var body = document.createElement('p');
    body.className = 'ac-notice__text';

    if (prefix) {
      var bold = document.createElement('b');
      bold.className = 'ac-notice__prefix';
      bold.textContent = prefix;
      body.appendChild(bold);
      body.appendChild(document.createTextNode(' '));
    }

    body.appendChild(document.createTextNode(text));
    notice.appendChild(body);
    return notice;
  }

  /**
   * @param {HTMLElement} root element carrying [data-ac-result-panel]
   */
  function createResultPanel(root) {
    // Idempotent: initializing twice would double up the listeners.
    if (!root || root._acResultPanel) return root && root._acResultPanel;

    var frames = [];
    var timers = [];
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
      if (bad) node.setAttribute('data-ac-rp-bad', 'true');
      else node.removeAttribute('data-ac-rp-bad');
    }

    function out(name) {
      return root.querySelector('[data-ac-rp-out="' + name + '"]');
    }

    /** Print a quoted string, or the word "nothing" when there is none. */
    function report(key, text, bad) {
      say(out(key), text ? '"' + text + '"' : 'nothing', bad);
    }

    /* === [NAME] ==========================================================
       What a screen reader is given, for anything named from its contents.
       Three things a plain textContent gets wrong: aria-hidden subtrees are
       dropped; display:none and visibility:hidden subtrees are dropped while
       clipped ones stay; and a child whose own role is a live region is not
       part of the name at all, because no live-region role takes its name
       from content. Badge found the last one and its page has the argument.

       <output> is in that set without saying so — its implicit role is
       status. That is the whole of example 3, and it is also why a script
       that audits a page for live regions by attribute alone misses it. */

    var LIVE_ROLES = { status: 1, alert: 1, log: 1, marquee: 1, timer: 1 };

    function liveRole(el) {
      var role = (el.getAttribute('role') || '').trim().toLowerCase();
      if (role) return LIVE_ROLES[role] ? role : '';
      if (el.tagName === 'OUTPUT') return 'status';
      return el.getAttribute('aria-live') || '';
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
          // The element asked about is read whatever its role — that is how
          // [LOG] gets the text out of a region. A child live region is not.
          if (liveRole(node)) return;
          parts.push(spokenText(node));
        }
      });

      parts.push(generated(el, '::after'));
      return parts.join(' ').replace(/\s+/g, ' ').trim();
    }

    /* === [MEASURE] example 2 =============================================
       What is measured is the narrowest the value is willing to be, not how
       far it is currently spilling. That number is what decides whether the
       page can reflow to 320px: a flex or grid item's automatic minimum size
       is its min-content width, so a value that will not break makes every
       box it is inside at least that wide.

       It has to be measured on a clone, because reading it needs a
       `width: min-content` the real layout cannot have. */

    function minContentWidth(el) {
      var probe = el.cloneNode(true);
      probe.removeAttribute('data-ac-rp-wrap-case');
      probe.style.cssText = 'position:absolute;visibility:hidden;width:min-content;';
      el.parentNode.appendChild(probe);
      var width = Math.round(probe.getBoundingClientRect().width);
      probe.remove();
      return width;
    }

    function refreshWrap() {
      ['none', 'word', 'good'].forEach(function (key) {
        var value = root.querySelector('[data-ac-rp-wrap-case="' + key + '"]');
        if (!value) return;

        var box = Math.round(value.getBoundingClientRect().width);
        var min = minContentWidth(value);

        say(
          out('wrap-' + key),
          min > box
            ? min + 'px minimum · ' + (min - box) + 'px wider than its ' + box + 'px panel'
            : min + 'px minimum · fits any width',
          min > box,
        );
      });
    }

    /* === [LOG] example 3 =================================================
       A mock screen reader, and mock in one specific way: it watches the live
       regions that were in the panel when it ran and prints what lands in
       them. Counting the entries is the point of example 3.

       The selector has to include `output`, or it misses the region nobody
       declared — which is the bug the example is about. */

    function logAdd(list, politeness, text, bad) {
      if (!list) return;
      var li = document.createElement('li');
      var tag = document.createElement('b');
      tag.textContent = politeness;
      li.appendChild(tag);
      li.appendChild(document.createTextNode(' · "' + text + '"'));
      if (bad) li.setAttribute('data-ac-rp-bad', 'true');
      list.appendChild(li);
    }

    function watch(scope, list, bad) {
      if (!scope) return;

      scope
        .querySelectorAll('[role="status"], [role="alert"], [aria-live], output')
        .forEach(function (region) {
          var role = liveRole(region);
          var politeness = role === 'alert' || role === 'assertive' ? 'assertive' : 'polite';

          var observer = new MutationObserver(function () {
            var text = spokenText(region);
            if (!text) return;
            logAdd(list, politeness, text, bad);
          });
          observer.observe(region, { childList: true, characterData: true, subtree: true });
          observers.push(observer);
        });
    }

    /* === [BUILD] example 3 ===============================================
       The same result written into both panels. Nothing here chooses what to
       announce — setResult does, and the only difference between the two
       panels is which of their elements carry a live role. */

    var BUILT = {
      value:
        'https://app.example.com/invite/?project=462&role=editor&t=sk_test_462abcdefg99abcdefg462abcdefg',
      verdict: 'Ready',
      tone: 'ok',
      count: 3,
      subject: 'parameters',
      note: 't expires 24 hours after it is issued.',
      notePrefix: 'Warning:',
      noteTone: 'warn',
      say: 'Link built. 3 parameters, and one warning.',
    };

    var CLEARED = {
      value: '',
      verdict: 'Waiting',
      tone: 'muted',
      count: 0,
      subject: 'parameters',
      note: '',
      say: '',
    };

    var buildPanel = root.querySelector('[data-ac-rp-build]');
    var buildLog = buildPanel && buildPanel.querySelector('[data-ac-rp-log]');

    function buildCase(key) {
      return buildPanel && buildPanel.querySelector('[data-ac-rp-case="' + key + '"]');
    }

    if (buildPanel) {
      ['loud', 'quiet'].forEach(function (key) {
        watch(buildCase(key), buildLog, key === 'loud');
      });

      on(buildPanel.querySelector('[data-ac-rp-run]'), 'click', function () {
        setResult(buildCase('loud'), BUILT);
        setResult(buildCase('quiet'), BUILT);
      });

      on(buildPanel.querySelector('[data-ac-rp-reset]'), 'click', function () {
        setResult(buildCase('loud'), CLEARED);
        setResult(buildCase('quiet'), CLEARED);

        // A frame, not this tick: a MutationObserver callback is a microtask,
        // so clearing here would run before the reset's own mutations reached
        // the observer and they would land in an empty list.
        frames.push(
          requestAnimationFrame(function () {
            if (buildLog) buildLog.textContent = '';
          }),
        );
      });
    }

    /* === [COPY] wiring ===================================================
       Every copy button on the page, including the broken ones. The failures
       in example 4 are additions to this behavior rather than replacements
       for it — that is what makes them plausible. */

    /** Which readout each panel's announcement goes to. Example 4's renaming
        panel is missing on purpose: its readout is about the button's name,
        and [CASES] writes it. */
    var OUT_KEY = { tick: 'copy-tick', good: 'copy-good', bare: 'empty-bare', told: 'empty-told' };
    var BAD_CASE = { tick: 1, bare: 1 };

    root.querySelectorAll('[data-ac-rp-copy]').forEach(function (btn) {
      on(btn, 'click', function (event) {
        // A soft-disabled button is still a button: nothing else stops the
        // press, so the component does. This covers Enter and Space too, since
        // a native button fires a click for both.
        if (btn.getAttribute('aria-disabled') === 'true') event.preventDefault();

        copyResult(btn).then(function (message) {
          var panel = btn.closest('.ac-result');
          var name = panel && panel.getAttribute('data-ac-rp-case');
          if (!name || !OUT_KEY[name]) return;

          // The readout keeps what was announced rather than mirroring the
          // region, which empties itself after four seconds. A panel with no
          // region announced nothing, whatever it drew.
          report(
            OUT_KEY[name],
            panel.querySelector('.ac-result__status') ? message : '',
            !!BAD_CASE[name],
          );
          refreshSaid();
        });
      });
    });

    /* === [CASES] example 4 ===============================================
       The two broken confirmations, bound after the real behavior so they run
       on the same press. Both are things a person adds on purpose. */

    root.querySelectorAll('[data-ac-rp-rename]').forEach(function (btn) {
      var wasText = btn.textContent.trim();
      var wasLabel = btn.getAttribute('aria-label');

      on(btn, 'click', function () {
        var renamed = btn.getAttribute('data-ac-rp-rename');
        btn.textContent = renamed.split(' ')[0];
        btn.setAttribute('aria-label', renamed);

        // Read after the write and before the revert: this is the name the
        // person who just pressed it is holding.
        report('copy-rename', btn.getAttribute('aria-label'), true);

        timers.push(
          setTimeout(function () {
            btn.textContent = wasText;
            btn.setAttribute('aria-label', wasLabel);
            report('copy-rename', wasLabel, false);
          }, STATUS_MS),
        );
      });
    });

    root.querySelectorAll('[data-ac-rp-tick]').forEach(function (tick) {
      var panel = tick.closest('.ac-result');
      on(panel && panel.querySelector('[data-ac-rp-copy]'), 'click', function () {
        tick.setAttribute('data-ac-rp-shown', 'true');
        timers.push(
          setTimeout(function () {
            tick.removeAttribute('data-ac-rp-shown');
          }, STATUS_MS),
        );
      });
    });

    /* === [EMPTY] example 5 ===============================================
       Two panels the same size and the same shape. One has nothing in the
       tree between its label and its button; the other has the reason, and
       the reason is attached to the button rather than announced at it. */

    function refreshSaid() {
      var bare = root.querySelector('[data-ac-rp-case="bare"]');
      if (bare) report('empty-bare-said', spokenText(bare.querySelector('.ac-result__value')), true);

      var told = root.querySelector('[data-ac-rp-case="told"]');
      var btn = told && told.querySelector('[data-ac-rp-copy]');
      if (!btn) return;

      // Name, then description, then state — the order a screen reader reads a
      // button in, and the whole reason the press has nothing to add.
      var described = document.getElementById(btn.getAttribute('aria-describedby') || '');
      report(
        'empty-told-said',
        [
          btn.getAttribute('aria-label'),
          described ? spokenText(described) : '',
          btn.getAttribute('aria-disabled') === 'true' ? 'unavailable' : '',
        ]
          .filter(Boolean)
          .join(' · '),
        false,
      );
    }

    /* === wire it up ======================================================= */

    function refresh() {
      refreshWrap();
      refreshSaid();

      // The name readout starts from the real name rather than a dash, so what
      // the press changes is the name and not the readout waking up.
      var rename = root.querySelector('[data-ac-rp-rename]');
      if (rename) report('copy-rename', rename.getAttribute('aria-label'), false);
    }

    refresh();

    // Widths measured before the webfont lands are the fallback font's, and
    // example 2 is entirely about widths.
    if (document.readyState !== 'complete') on(global, 'load', refreshWrap);

    var api = {
      /** The two pieces worth lifting. Everything else in this file is the
          page checking its own claims. */
      copy: copyResult,
      set: setResult,
      refresh: refresh,
      destroy: function () {
        frames.forEach(cancelAnimationFrame);
        timers.forEach(clearTimeout);
        observers.forEach(function (observer) {
          observer.disconnect();
        });
        cleanups.forEach(function (fn) {
          fn();
        });
        root.querySelectorAll('[data-ac-rp-copy]').forEach(function (btn) {
          (btn._acRpFrames || []).forEach(cancelAnimationFrame);
          (btn._acRpTimers || []).forEach(clearTimeout);
          btn._acRpFrames = [];
          btn._acRpTimers = [];
        });
        frames = [];
        timers = [];
        observers = [];
        cleanups = [];
        delete root._acResultPanel;
      },
    };

    root._acResultPanel = api;
    return api;
  }

  global.AC = global.AC || {};
  global.AC.createResultPanel = createResultPanel;
  global.AC.copyResult = copyResult;
  global.AC.setResult = setResult;

  /* === [AUTO-INIT] delete this block if you construct instances yourself === */
  function initAll(scope) {
    (scope || document).querySelectorAll('[data-ac-result-panel]').forEach(function (el) {
      createResultPanel(el);
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
