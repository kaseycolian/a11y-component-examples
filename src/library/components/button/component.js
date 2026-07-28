/* ===========================================================================
   BUTTON

   WHAT TO COPY
     [CORE]       the aria-disabled guard. It is the only part of this file a
                  real app needs, and example 3 is what it is for.
     [FORM]       example 2. Reporting which button submitted.
     [LOCK]       example 3. Measuring which of the two the keyboard reaches.
     [FAKE]       example 4. The div's mouse-only handler, live.
     [SIZES]      example 5. Measuring the three targets.
     [AUTO-INIT]  delete if you construct instances yourself.

   Copy the file whole for the library version.

   A native <button> needs no JavaScript and nothing here adds behavior to one.
   The guard exists because aria-disabled is an announcement and not an
   enforcement: it tells a screen reader the control is unavailable and does
   nothing whatever to stop the browser firing a click on it.

   The guard is one capture-phase listener on a container, not one per button.
   Capture is the load-bearing part — a handler bound on the button itself runs
   in the target phase, so a guard bound the same way would only win if it
   happened to be registered first. On an ancestor, in capture, it always runs
   first, and stopImmediatePropagation ends the event before it reaches anything
   the button's own author wrote.

   No dependencies. Plain IIFE, so a paste into a <script> tag works.
   =========================================================================== */
(function (global) {
  'use strict';

  /**
   * @param {HTMLElement} root a container. Every [aria-disabled="true"] control
   *   inside it is guarded, including ones added after this ran.
   */
  function createButton(root) {
    // Idempotent: initializing twice would double up the listeners.
    if (!root || root._acButton) return root && root._acButton;

    /* === [CORE] the guard ================================================ */

    function onCaptureClick(event) {
      var target = event.target;
      if (!target || typeof target.closest !== 'function') return;

      var el = target.closest('[aria-disabled="true"]');
      if (!el || !root.contains(el)) return;

      // preventDefault covers form submission and link navigation; between them
      // the two lines also cover Enter and Space, because a native button fires
      // a click for both and never a key event you would have to catch.
      event.preventDefault();
      event.stopImmediatePropagation();

      // Undeclared if [LOCK] was deleted, which typeof handles without throwing.
      if (typeof reportBlocked === 'function') reportBlocked(el);
    }

    root.addEventListener('click', onCaptureClick, true);

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
      if (bad) node.setAttribute('data-ac-btn-bad', 'true');
      else node.removeAttribute('data-ac-btn-bad');
    }

    /* === [FORM] example 2 ================================================ */

    var form = root.querySelector('[data-ac-btn-form]');
    var formLog = form && form.querySelector('[data-ac-btn-form-log]');

    function onFormSubmit(event) {
      // Only so the demo page stays put. In your app this is where the work is.
      event.preventDefault();

      // Enter in the text field lands here too, and event.submitter is NOT null
      // for it: the browser nominates the form's default button — the first
      // submit button in DOM order — as the submitter, even though nobody
      // pressed it. On this form that is the bare one. submitter is null only
      // when the form has no submit button to nominate.
      var by = event.submitter;
      var label = by ? by.textContent.trim() : 'nothing — this form has no default button';
      var bare = !!by && !by.hasAttribute('type');

      say(
        formLog,
        bare
          ? 'The form submitted, and "' +
              label +
              '" is what submitted it. No type attribute means type="submit", whatever the ' +
              'label says.'
          : 'The form submitted, from ' + (by ? '"' + label + '"' : label) + '.',
        bare,
      );
    }

    function onFormClick(event) {
      var target = event.target;
      if (!target || typeof target.closest !== 'function') return;

      var btn = target.closest('button[type="button"]');
      if (!btn || !form.contains(btn)) return;

      say(formLog, '"' + btn.textContent.trim() + '" ran its own handler. The form did not submit.');
    }

    if (form) {
      form.addEventListener('submit', onFormSubmit);
      form.addEventListener('click', onFormClick);
    }

    /* === [LOCK] example 3 ================================================ */

    var lock = root.querySelector('[data-ac-btn-lock]');
    var lockLog = lock && lock.querySelector('[data-ac-btn-lock-log]');

    /** Called by the guard in [CORE] when it blocks something in this example. */
    function reportBlocked(el) {
      if (!lock || !lock.contains(el)) return;
      say(
        lockLog,
        '"' +
          el.textContent.trim() +
          '" was pressed, and blocked. It kept its tab stop, so the reason under it was read ' +
          'out on the way in.',
      );
    }

    /**
     * Whether the element can take focus, asked by trying rather than by
     * reasoning about attributes. Runs once, before anyone has interacted.
     *
     * blur() first, then restore. Handing focus back with was.focus() alone is
     * not enough: at load `was` is <body>, and body.focus() is a no-op in
     * Chrome rather than a blur — so the probe leaves focus parked on whatever
     * it tested last, and a keyboard reader arrives mid-page with no idea why.
     *
     * @param {HTMLElement} el
     * @returns {boolean}
     */
    function focusable(el) {
      if (!el) return false;

      var was = document.activeElement;
      el.focus({ preventScroll: true });

      var landed = document.activeElement === el;
      if (landed) el.blur();
      if (was && was !== document.activeElement && typeof was.focus === 'function') {
        was.focus({ preventScroll: true });
      }
      return landed;
    }

    function measureLock() {
      if (!lock) return;
      var hardOut = lock.querySelector('[data-ac-btn-out="hard"]');
      var softOut = lock.querySelector('[data-ac-btn-out="soft"]');

      if (hardOut) {
        hardOut.textContent = focusable(lock.querySelector('button[disabled]'))
          ? 'reachable'
          : 'not in the tab order';
      }
      if (softOut) {
        softOut.textContent = focusable(lock.querySelector('button[aria-disabled="true"]'))
          ? 'reachable'
          : 'not in the tab order';
      }
    }

    if (lock) measureLock();

    /* === [FAKE] example 4 ================================================ */

    var fake = root.querySelector('[data-ac-btn-fake]');
    var fakeLog = fake && fake.querySelector('[data-ac-btn-fake-log]');
    var fakeDiv = fake && fake.querySelector('[data-ac-btn-div]');
    var realBtn = fake && fake.querySelector('[data-ac-btn-real]');

    function onFakeDiv() {
      say(
        fakeLog,
        'The div ran. It only ever runs from a pointer — no role, no tab stop and no accessible ' +
          'name, so no keyboard and no screen reader can get here at all.',
        true,
      );
    }

    function onRealBtn() {
      say(
        fakeLog,
        'The button ran, from a pointer or from Enter or Space. Same handler, real element.',
      );
    }

    if (fakeDiv) fakeDiv.addEventListener('click', onFakeDiv);
    if (realBtn) realBtn.addEventListener('click', onRealBtn);

    /* === [SIZES] example 5 =============================================== */

    var sizes = root.querySelector('[data-ac-btn-sizes]');
    var verdict = sizes && sizes.querySelector('[data-ac-btn-sizes-verdict]');
    var FLOOR = 24; // SC 2.5.8, in CSS pixels.

    // Selected by the class that produced each one, so the readout cannot drift
    // out of step with the markup the way an index would.
    var SIZE_CASES = [
      { key: 'default', selector: '.ac-btn:not(.ac-btn--sm):not(.ac-btn--tiny)' },
      { key: 'sm', selector: '.ac-btn--sm' },
      { key: 'tiny', selector: '.ac-btn--tiny' },
    ];

    function measureSizes() {
      if (!sizes) return;
      var under = [];

      SIZE_CASES.forEach(function (item) {
        var btn = sizes.querySelector(item.selector);
        var out = sizes.querySelector('[data-ac-btn-out="' + item.key + '"]');
        if (!btn) return;

        var box = btn.getBoundingClientRect();
        var w = Math.round(box.width);
        var h = Math.round(box.height);

        if (out) out.textContent = w + ' × ' + h;
        if (w < FLOOR || h < FLOOR) under.push(btn.textContent.trim());
      });

      say(
        verdict,
        under.length === 0
          ? 'All three clear ' + FLOOR + '×' + FLOOR + '.'
          : under.join(' and ') +
              ' is under ' +
              FLOOR +
              '×' +
              FLOOR +
              '. What is left is the spacing exception in SC 2.5.8, and spacing is a property ' +
              'of the page it lands in — not something a component can promise.',
        under.length > 0,
      );
    }

    // Read after layout has settled. Measuring during construction can catch a
    // button mid-entrance and report a box it never actually has.
    if (typeof global.requestAnimationFrame === 'function') {
      global.requestAnimationFrame(measureSizes);
    } else {
      measureSizes();
    }

    /* === [CORE] API ====================================================== */

    var api = {
      element: root,
      /**
       * Re-run both measurements. The focusability probe moves focus and puts
       * it back, so call this between interactions rather than during one.
       */
      refresh: function () {
        measureLock();
        measureSizes();
      },
      destroy: function () {
        root.removeEventListener('click', onCaptureClick, true);
        if (form) {
          form.removeEventListener('submit', onFormSubmit);
          form.removeEventListener('click', onFormClick);
        }
        if (fakeDiv) fakeDiv.removeEventListener('click', onFakeDiv);
        if (realBtn) realBtn.removeEventListener('click', onRealBtn);
        say(formLog, '');
        say(lockLog, '');
        say(fakeLog, '');
        say(verdict, '');
        delete root._acButton;
      },
    };

    root._acButton = api;
    return api;
  }

  global.AC = global.AC || {};
  global.AC.createButton = createButton;

  /* === [AUTO-INIT] delete this block if you construct instances yourself === */
  function initAll(scope) {
    (scope || document).querySelectorAll('[data-ac-button]').forEach(function (el) {
      createButton(el);
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
