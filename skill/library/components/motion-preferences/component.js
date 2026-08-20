/* ===========================================================================
   REDUCED MOTION

   WHAT TO COPY
     [CORE]       every example. The scope, the toggle, and the one function
                  that answers "is motion allowed right now".
     [READOUT]    example 2. The signal table and the spoken verdict.
     [TICKER]     example 3. Motion no stylesheet can stop.
     [REVEAL]     example 4. Replaying the two gated animations.
     [BROKEN]     example 5. Delete it — it is the failure, on purpose.
     [AUTO-INIT]  delete if you construct instances yourself.

   Copy the file whole for the library version.

   The decision worth the script: motionAllowed() reads the resolved --ac-motion
   off the scope element rather than calling matchMedia. matchMedia only knows
   what the operating system thinks, so a script that asks it directly ignores
   the page toggle and drifts out of step with every animation on the page. One
   token, read by both languages, cannot disagree with itself.

   The other one: the toggle writes data-motion="off" and removes it again. It
   never writes "on". Removing the attribute is what lets the media query in
   component.css have the last word, which is the only reason a reader's system
   preference survives contact with a page control.

   No dependencies. Plain IIFE, so a paste into a <script> tag works.
   =========================================================================== */
(function (global) {
  'use strict';

  var TICK_MS = 3500;

  /**
   * @param {HTMLElement} root the scope element — <html> in your app.
   * @param {{ onChange?: Function }} [options]
   */
  function createMotionPreferences(root, options) {
    // Idempotent: initializing twice would double up the listeners.
    if (!root || root._acMotion) return root && root._acMotion;

    var settings = options || {};

    /* === [CORE] the gate ================================================= */

    var media =
      typeof global.matchMedia === 'function'
        ? global.matchMedia('(prefers-reduced-motion: reduce)')
        : null;

    function osReduced() {
      return !!(media && media.matches);
    }

    /**
     * The single source of truth, shared with the stylesheet.
     * @returns {boolean} whether animation is allowed right now.
     */
    function motionAllowed() {
      var value = global.getComputedStyle(root).getPropertyValue('--ac-motion').trim();
      if (value === '0') return false;
      if (value === '1') return true;

      // Only reachable if component.css did not load. Fall back to the two
      // inputs the stylesheet would have combined, in the same order.
      if (root.getAttribute('data-motion') === 'on') return true;
      return root.getAttribute('data-motion') !== 'off' && !osReduced();
    }

    /* === [CORE] the toggle =============================================== */

    var input = root.querySelector('[data-ac-motion-input]');
    var lockedNote = root.querySelector('[data-ac-motion-locked-note]');
    var watchers = [];

    function announce() {
      var allowed = motionAllowed();
      for (var i = 0; i < watchers.length; i += 1) watchers[i](allowed);
      if (typeof settings.onChange === 'function') settings.onChange(allowed);
    }

    function apply() {
      if (!input) return;
      if (input.checked) root.setAttribute('data-motion', 'off');
      else root.removeAttribute('data-motion');
    }

    // Re-read the attribute rather than trusting the control that set it.
    // Anything can write it — a second toggle, a server-rendered value, the
    // deliberately broken button in example 5 — and a checkbox that disagrees
    // with the page it claims to describe is worse than no checkbox.
    function syncFromAttribute() {
      if (input) input.checked = root.getAttribute('data-motion') === 'off' || osReduced();
      announce();
    }

    var observer = null;
    if (typeof global.MutationObserver === 'function') {
      observer = new global.MutationObserver(syncFromAttribute);
      observer.observe(root, { attributes: true, attributeFilter: ['data-motion'] });
    }

    function onInputChange() {
      apply();
      // The observer covers the attribute actually changing; this covers the
      // case where it did not, so the readout still reflects reality.
      syncFromAttribute();
    }

    function onInputClick(event) {
      // aria-disabled is an announcement, not an enforcement — the browser will
      // happily toggle a checkbox that claims to be unavailable. Space fires a
      // click on a checkbox, so one handler covers the keyboard too.
      if (input && input.getAttribute('aria-disabled') === 'true') event.preventDefault();
    }

    if (input) {
      input.addEventListener('change', onInputChange);
      input.addEventListener('click', onInputClick);

      if (osReduced()) {
        // The OS preference wins outright, so the control cannot honestly be
        // changed. aria-disabled and not disabled: a disabled input leaves the
        // tab order and takes its explanation with it, and the explanation is
        // the only thing left worth reaching.
        if (lockedNote) {
          // Unhide first — a hidden element is out of the accessibility tree,
          // so describing the toggle with it while hidden describes nothing.
          lockedNote.hidden = false;
        }
        input.setAttribute('aria-disabled', 'true');
      }
    }

    /* === [READOUT] example 2 ============================================= */

    var outputs = {
      os: root.querySelector('[data-ac-motion-out="os"]'),
      attr: root.querySelector('[data-ac-motion-out="attr"]'),
      resolved: root.querySelector('[data-ac-motion-out="resolved"]'),
    };
    var verdict = root.querySelector('[data-ac-motion-verdict]');

    function paintReadout(allowed) {
      var attr = root.getAttribute('data-motion');
      var reduced = osReduced();

      if (outputs.os) outputs.os.textContent = reduced ? 'reduce' : 'no-preference';
      if (outputs.attr) outputs.attr.textContent = attr === null ? 'not set' : attr;
      if (outputs.resolved) outputs.resolved.textContent = allowed ? '1' : '0';

      if (!verdict) return;

      var wrong = allowed && reduced;
      var words;

      if (!allowed) {
        words = reduced
          ? 'Animation is off. Your system asked for it, and nothing on this page can lift that.'
          : 'Animation is off, because you turned it off here.';
      } else if (wrong) {
        words =
          'Animation is on and it should not be. Your system asked for reduced motion and ' +
          'example 5 is overruling it.';
      } else {
        words = 'Animation is on. Neither your system nor this page has asked for less.';
      }

      verdict.textContent = words;
      // Written as well as colored: the color is gone in forced colors, and it
      // was never the thing carrying the meaning (SC 1.4.1).
      if (wrong) verdict.setAttribute('data-ac-motion-wrong', 'true');
      else verdict.removeAttribute('data-ac-motion-wrong');
    }

    watchers.push(paintReadout);

    /* === [TICKER] example 3 ============================================== */

    var ticker = root.querySelector('[data-ac-motion-ticker]');
    var tickerTimer = null;
    var tickerIndex = 0;
    var tickerItems = [];
    var tickerManual = null; // null until the reader has an opinion of their own
    var tickerItem = null;
    var tickerButton = null;
    var tickerNote = null;

    function tickerRunning() {
      return tickerTimer !== null;
    }

    function tickerStop() {
      if (tickerTimer !== null) {
        global.clearInterval(tickerTimer);
        tickerTimer = null;
      }
    }

    function tickerStart() {
      if (tickerTimer !== null || tickerItems.length < 2) return;
      tickerTimer = global.setInterval(function () {
        tickerIndex = (tickerIndex + 1) % tickerItems.length;
        if (tickerItem) tickerItem.textContent = tickerItems[tickerIndex];
      }, TICK_MS);
    }

    function paintTicker(allowed) {
      if (!ticker) return;

      // The gate decides the default; an explicit press outranks it, because a
      // preference for less motion is not a refusal to be shown any.
      var shouldRun = tickerManual === null ? allowed : tickerManual;

      if (shouldRun) tickerStart();
      else tickerStop();

      if (tickerButton) tickerButton.textContent = tickerRunning() ? 'Pause' : 'Play';

      if (tickerNote) {
        if (!allowed && tickerManual === null) {
          tickerNote.textContent =
            'Held still, because a setInterval is not a transition and no stylesheet could have stopped it. Play still works.';
        } else if (!tickerRunning()) {
          tickerNote.textContent = 'Paused. SC 2.2.2 is why this button exists at all.';
        } else {
          tickerNote.textContent = 'Advancing every ' + TICK_MS / 1000 + ' seconds.';
        }
      }
    }

    function onTickerClick() {
      tickerManual = !tickerRunning();
      paintTicker(motionAllowed());
    }

    if (ticker) {
      tickerItem = ticker.querySelector('[data-ac-motion-ticker-item]');
      tickerButton = ticker.querySelector('[data-ac-motion-ticker-toggle]');
      tickerNote = ticker.querySelector('[data-ac-motion-ticker-note]');
      tickerItems = (ticker.getAttribute('data-ac-motion-ticker-items') || '')
        .split('|')
        .filter(Boolean);

      if (tickerButton) tickerButton.addEventListener('click', onTickerClick);
      watchers.push(paintTicker);
    }

    /* === [REVEAL] example 4 ============================================== */

    var reveals = root.querySelector('[data-ac-motion-reveals]');
    var replayButton = reveals && reveals.querySelector('[data-ac-motion-replay]');

    function onReplay() {
      var panels = reveals.querySelectorAll('[data-ac-motion-reveal]');
      panels.forEach(function (panel) {
        panel.removeAttribute('data-ac-motion-playing');
        // Reading a layout property flushes the removal, so re-adding the
        // attribute counts as a new animation rather than a no-op.
        void panel.offsetWidth;
        panel.setAttribute('data-ac-motion-playing', '');
      });
    }

    if (replayButton) replayButton.addEventListener('click', onReplay);

    /* === [BROKEN] example 5 — delete this ================================ */

    var forceButton = root.querySelector('[data-ac-motion-force]');
    var restoreButton = root.querySelector('[data-ac-motion-restore]');

    function onForce() {
      root.setAttribute('data-motion', 'on');
    }

    // Removing the attribute, not writing "off" — the same two states the rest
    // of the component has. Note what forcing it cost: the observer unchecked
    // the toggle on the way in, because with data-motion="on" the page really
    // is not reducing anything, so there is no earlier preference left to put
    // back. A third state does not just overrule the reader, it loses them.
    function onRestore() {
      root.removeAttribute('data-motion');
    }

    if (forceButton) forceButton.addEventListener('click', onForce);
    if (restoreButton) restoreButton.addEventListener('click', onRestore);

    /* === [CORE] the OS can change while the page is open ================= */

    function onMediaChange() {
      // Someone changing the setting in another window is the ordinary case on
      // a desktop, and reading it once at load would strand them.
      if (input) {
        if (osReduced()) {
          if (lockedNote) lockedNote.hidden = false;
          input.setAttribute('aria-disabled', 'true');
        } else {
          if (lockedNote) lockedNote.hidden = true;
          input.removeAttribute('aria-disabled');
        }
      }
      syncFromAttribute();
    }

    if (media && typeof media.addEventListener === 'function') {
      media.addEventListener('change', onMediaChange);
    }

    /* === [CORE] API ====================================================== */

    syncFromAttribute();

    var api = {
      element: root,
      input: input,
      /** @returns {boolean} whether animation is allowed right now. */
      allowed: motionAllowed,
      /**
       * Set the page-level preference from code.
       * @param {boolean} reduce true writes data-motion="off"; false removes it.
       */
      set: function (reduce) {
        if (input) input.checked = !!reduce;
        apply();
        syncFromAttribute();
      },
      /** Re-read every input and repaint. */
      refresh: function () {
        syncFromAttribute();
      },
      destroy: function () {
        tickerStop();
        if (observer) observer.disconnect();
        if (media && typeof media.removeEventListener === 'function') {
          media.removeEventListener('change', onMediaChange);
        }
        if (input) {
          input.removeEventListener('change', onInputChange);
          input.removeEventListener('click', onInputClick);
          input.removeAttribute('aria-disabled');
        }
        if (lockedNote) lockedNote.hidden = true;
        if (tickerButton) tickerButton.removeEventListener('click', onTickerClick);
        if (replayButton) replayButton.removeEventListener('click', onReplay);
        if (forceButton) forceButton.removeEventListener('click', onForce);
        if (restoreButton) restoreButton.removeEventListener('click', onRestore);
        if (verdict) {
          verdict.textContent = '';
          verdict.removeAttribute('data-ac-motion-wrong');
        }
        watchers.length = 0;
        delete root._acMotion;
      },
    };

    root._acMotion = api;
    return api;
  }

  global.AC = global.AC || {};
  global.AC.createMotionPreferences = createMotionPreferences;

  /* === [AUTO-INIT] delete this block if you construct instances yourself === */
  function initAll(scope) {
    (scope || document).querySelectorAll('[data-ac-motion]').forEach(function (el) {
      createMotionPreferences(el);
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
