/* ===========================================================================
   LOADING BUTTON

   WHAT TO COPY
     [CORE]       setBusy() and the aria-disabled guard. The whole component,
                  and about twenty lines.
     [RUN]        the fake request driving this page. Delete it.
     [MIRROR]     example 2. Printing what assistive tech actually has.
     [FOCUS]      example 3. Where focus went after the press.
     [NAMES]      example 4. The accessible name at each phase.
     [MOTION]     example 5. The panel toggle and the two spinners measured.
     [AUTO-INIT]  delete if you construct instances yourself.

   Copy the file whole for the library version.

   setBusy does three things and skips a fourth on purpose.

     aria-busy       the machine-readable state. Support for announcing it is
                     inconsistent across screen readers, which is why it is
                     never the only signal.
     aria-disabled   so a second press does nothing and announces "unavailable".
                     Never disabled: that drops focus to the body, and the
                     reader loses both their place and the state they caused.
     the region      a pre-existing, empty role="status" beside the button.
                     This is what actually speaks.
     the name        left alone. Renaming a control mid-operation reads as a
                     different control arriving.

   The guard is one capture-phase listener on a container. Capture is the
   load-bearing part — a handler bound on the button runs in the target phase
   beside every other handler, so it only wins if it was registered first.
   Lifted from button, along with the reasoning. preventDefault covers Enter
   and Space for free, because a native button fires a click for both.

   The clear-then-write in speak() is live-region's [CORE]. Two frames, because
   rAF runs before paint and one frame can batch the clear and the write into a
   single reported state — so "Saved." twice in a row would be announced once.

   No dependencies. Plain IIFE, so a paste into a <script> tag works.
   =========================================================================== */
(function (global) {
  'use strict';

  /**
   * @param {HTMLElement} root a container holding one or more loading buttons
   *   and their status regions.
   */
  function createLoadingButton(root) {
    // Idempotent: initializing twice would double up the listeners.
    if (!root || root._acLoadingButton) return root && root._acLoadingButton;

    /* === [CORE] ========================================================== */

    /**
     * Write text into an existing live region so it is announced even when it
     * is the text the region already holds. live-region owns this argument.
     *
     * @param {HTMLElement} el a rendered, non-hidden role="status"
     * @param {string} text
     */
    function speak(el, text) {
      if (!el) return;
      el.textContent = '';
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          el.textContent = text;
        });
      });
    }

    /**
     * The component.
     *
     * @param {HTMLButtonElement} btn
     * @param {boolean} busy
     * @param {string} [message] written into the button's status region
     * @param {HTMLElement} [region] the role="status" to write into
     */
    function setBusy(btn, busy, message, region) {
      if (!btn) return;

      if (busy) {
        btn.setAttribute('aria-busy', 'true');
        btn.setAttribute('aria-disabled', 'true');
      } else {
        btn.removeAttribute('aria-busy');
        btn.removeAttribute('aria-disabled');
      }

      // The name is deliberately not touched here. There is no branch for it.
      if (message) speak(region, message);
    }

    function onCaptureClick(event) {
      var target = event.target;
      if (!target || typeof target.closest !== 'function') return;

      var el = target.closest('[aria-disabled="true"]');
      if (!el || !root.contains(el)) return;

      event.preventDefault();
      event.stopImmediatePropagation();
    }

    root.addEventListener('click', onCaptureClick, true);

    /**
     * An element's accessible name, for the readouts. The short version:
     * aria-label, then its own text with aria-hidden subtrees dropped.
     * icon-button ships the full resolver and the reasons.
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
      return (copy.textContent || '').replace(/\s+/g, ' ').trim();
    }

    /**
     * Write a message into a status line. Shared by every example below.
     * @param {HTMLElement} node the pre-existing, initially empty role="status"
     * @param {string} text
     * @param {boolean} [bad] mark it as the failing case
     */
    function say(node, text, bad) {
      if (!node) return;
      node.textContent = text;
      // Written as well as colored: the color is gone under forced colors, and
      // it was never the thing carrying the meaning (SC 1.4.1).
      if (bad) node.setAttribute('data-ac-lb-bad', 'true');
      else node.removeAttribute('data-ac-lb-bad');
    }

    function out(key) {
      return root.querySelector('[data-ac-lb-out="' + key + '"]');
    }

    function regionFor(key) {
      return root.querySelector('[data-ac-lb-status="' + key + '"]');
    }

    /* === [RUN] the fake request — delete this ============================
       Every button on this page is wired to a timer instead of a network call,
       and the three data attributes below are how each example breaks the
       contract: -mute skips aria-busy and the region, -hard uses disabled,
       -swap rewrites the label. In your app there is one path and none of the
       branches. */

    var PENDING = 'Saving…';
    var timers = {};

    function start(btn) {
      var key = btn.dataset.acLbRun;
      var region = regionFor(key);

      if (btn.hasAttribute('data-ac-lb-mute')) {
        // BROKEN — a spinner driven by a private attribute nothing reads.
        btn.setAttribute('data-ac-lb-spinning', 'true');
      } else if (btn.hasAttribute('data-ac-lb-hard')) {
        // BROKEN — disabled is the lock, and it takes focus with it. Set last,
        // and with no aria-disabled, so this example is only about the lock.
        btn.setAttribute('aria-busy', 'true');
        speak(region, PENDING);
        btn.disabled = true;
      } else {
        setBusy(btn, true, PENDING, region);
      }

      if (btn.hasAttribute('data-ac-lb-swap')) {
        // BROKEN — the status is being written into the accessible name.
        btn.querySelector('[data-ac-lb-swap-text]').textContent = PENDING;
      }

      sampleFocus(key);
      sampleNames(key, 'busy');
      sampleMirror();
      sampleMotion(key, 'busy');
    }

    function finish(btn) {
      var key = btn.dataset.acLbRun;
      var region = regionFor(key);
      var done = btn.dataset.acLbDone || 'Saved.';

      if (btn.hasAttribute('data-ac-lb-mute')) {
        btn.removeAttribute('data-ac-lb-spinning');
      } else if (btn.hasAttribute('data-ac-lb-hard')) {
        btn.disabled = false;
        btn.removeAttribute('aria-busy');
        speak(region, done);
      } else {
        setBusy(btn, false, done, region);
      }

      if (btn.hasAttribute('data-ac-lb-swap')) {
        btn.querySelector('[data-ac-lb-swap-text]').textContent = 'Saved';
      }

      sampleNames(key, 'done');
      sampleMirror();
      sampleMotion(key, 'idle');
    }

    function onClick(event) {
      var btn = event.target.closest && event.target.closest('[data-ac-lb-run]');
      if (!btn || !root.contains(btn)) return;

      var key = btn.dataset.acLbRun;
      if (timers[key]) return; // already pending

      start(btn);
      timers[key] = setTimeout(function () {
        delete timers[key];
        finish(btn);
      }, Number(btn.dataset.acLbMs) || 900);
    }

    root.addEventListener('click', onClick);

    /* === [MIRROR] example 2 ============================================== */

    var mirror = root.querySelector('[data-ac-lb-mirror]');
    var mirrorVerdict = mirror && mirror.querySelector('[data-ac-lb-mirror-verdict]');

    function sampleMirror() {
      if (!mirror) return;

      ['mute', 'said'].forEach(function (key) {
        var btn = mirror.querySelector('[data-ac-lb-run="' + key + '"]');
        var region = regionFor(key);
        if (!btn) return;

        var busy = btn.getAttribute('aria-busy');
        var said = region && region.textContent.trim();
        var broken = key === 'mute';

        say(out(key + '-name'), nameOf(btn));
        say(out(key + '-busy'), busy || 'absent', broken);
        say(out(key + '-said'), said || (region ? 'nothing yet' : 'no region'), broken);
      });

      say(
        mirrorVerdict,
        'Press both. Only the specimen reports anything; the other one spins and says nothing.',
        true,
      );
    }

    /* === [FOCUS] example 3 =============================================== */

    var focusPanel = root.querySelector('[data-ac-lb-focus]');
    var focusVerdict = focusPanel && focusPanel.querySelector('[data-ac-lb-focus-verdict]');

    /** Where focus is now, in words. */
    function focusedNow() {
      var el = document.activeElement;
      if (!el || el === document.body || el === document.documentElement) {
        return 'the document body';
      }
      var name = nameOf(el);
      return name ? '"' + name + '"' : el.tagName.toLowerCase();
    }

    function sampleFocus(key) {
      if (!focusPanel || (key !== 'hard' && key !== 'soft')) return;

      // Read after the frame in which the state changed: disabling the focused
      // element moves focus, and the move is what this example is about.
      requestAnimationFrame(function () {
        var lost = document.activeElement === document.body;
        say(out(key + '-focus'), focusedNow(), lost);

        say(
          focusVerdict,
          lost
            ? 'Focus was dropped to the top of the document. The reader cannot hear the state they ' +
                'just caused, and Tab starts over from the beginning.'
            : 'The button kept focus, so the status line beside it is read where the reader ' +
                'already is.',
          lost,
        );
      });
    }

    /* === [NAMES] example 4 =============================================== */

    var namesPanel = root.querySelector('[data-ac-lb-names]');
    var namesVerdict = namesPanel && namesPanel.querySelector('[data-ac-lb-names-verdict]');
    var seen = { swap: {}, keep: {} };

    function sampleNames(key, phase) {
      if (!namesPanel || !seen[key]) return;

      var btn = namesPanel.querySelector('[data-ac-lb-run="' + key + '"]');
      if (!btn) return;

      seen[key][phase] = nameOf(btn);
      say(out(key + '-' + phase), seen[key][phase], key === 'swap' && phase !== 'idle');

      var swap = seen.swap;
      if (swap.idle && swap.busy && swap.done) {
        say(
          namesVerdict,
          'One control, three names. A reader parked on it hears a new button arrive twice, and ' +
            '"click Save" no longer finds anything.',
          true,
        );
      }
    }

    /* === [MOTION] example 5 ============================================== */

    var motionPanel = root.querySelector('[data-ac-lb-motion]');
    var motionToggle = motionPanel && motionPanel.querySelector('[data-ac-lb-motion-toggle]');
    var motionVerdict = motionPanel && motionPanel.querySelector('[data-ac-lb-motion-verdict]');
    var MOTION_CASES = { ring: '.ac-btn-loading__spinner', dot: '.ac-lb-dot' };
    var motionSeen = { ring: {}, dot: {} };

    /** What the indicator looks like right now, in three words or fewer. */
    function describe(el) {
      if (!el) return '—';
      var style = getComputedStyle(el);
      if (style.visibility === 'hidden') return 'hidden';
      return parseFloat(style.animationDuration) > 0 ? 'visible, moving' : 'visible, still';
    }

    function sampleMotion(key, phase) {
      if (!motionPanel || !MOTION_CASES[key]) return;

      var btn = motionPanel.querySelector('[data-ac-lb-run="' + key + '"]');
      var el = btn && btn.querySelector(MOTION_CASES[key]);
      if (!el) return;

      motionSeen[key][phase] = describe(el);
      say(out(key + '-' + phase), motionSeen[key][phase]);

      var dot = motionSeen.dot;
      var blind = dot.idle && dot.busy && dot.idle === dot.busy;
      if (dot.idle && dot.busy) {
        say(
          motionVerdict,
          blind
            ? 'With motion off the dot is identical saving and at rest. The ring still appears, ' +
                'and the status line still speaks.'
            : 'Both indicators change while saving.',
          blind,
        );
      }
    }

    function onMotionToggle() {
      if (motionToggle.checked) motionPanel.setAttribute('data-motion', 'off');
      else motionPanel.removeAttribute('data-motion');

      // The stored "saving" samples were measured under the other setting.
      Object.keys(MOTION_CASES).forEach(function (key) {
        motionSeen[key] = {};
        say(out(key + '-busy'), '—');
        sampleMotion(key, 'idle');
      });
      say(motionVerdict, '');
    }

    if (motionToggle) motionToggle.addEventListener('change', onMotionToggle);

    /* === [CORE] API ====================================================== */

    // Read after layout has settled. Sampling during construction can catch a
    // button mid-entrance and report a state it never actually has.
    function sampleAll() {
      sampleMirror();
      sampleNames('swap', 'idle');
      sampleNames('keep', 'idle');
      sampleMotion('ring', 'idle');
      sampleMotion('dot', 'idle');
    }

    if (typeof global.requestAnimationFrame === 'function') {
      global.requestAnimationFrame(sampleAll);
    } else {
      sampleAll();
    }

    var api = {
      element: root,
      /** The component. Everything else in this file is this page. */
      setBusy: setBusy,
      /** Re-run every readout. */
      refresh: sampleAll,
      destroy: function () {
        root.removeEventListener('click', onCaptureClick, true);
        root.removeEventListener('click', onClick);
        if (motionToggle) motionToggle.removeEventListener('change', onMotionToggle);

        Object.keys(timers).forEach(function (key) {
          clearTimeout(timers[key]);
          delete timers[key];
        });

        root.querySelectorAll('[data-ac-lb-run]').forEach(function (btn) {
          btn.removeAttribute('aria-busy');
          btn.removeAttribute('aria-disabled');
          btn.removeAttribute('data-ac-lb-spinning');
          btn.disabled = false;
        });
        root.querySelectorAll('[data-ac-lb-status], [data-ac-lb-out]').forEach(function (node) {
          say(node, '');
        });
        say(mirrorVerdict, '');
        say(focusVerdict, '');
        say(namesVerdict, '');
        say(motionVerdict, '');

        delete root._acLoadingButton;
      },
    };

    root._acLoadingButton = api;
    return api;
  }

  global.AC = global.AC || {};
  global.AC.createLoadingButton = createLoadingButton;

  /* === [AUTO-INIT] delete this block if you construct instances yourself === */
  function initAll(scope) {
    (scope || document).querySelectorAll('[data-ac-loading-button]').forEach(function (el) {
      createLoadingButton(el);
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
