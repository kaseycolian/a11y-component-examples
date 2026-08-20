/* ===========================================================================
   SWITCH

   WHAT TO COPY
     [CORE]           finding the input. Needed by both blocks below.
     [STATUS]         example 2. Confirming out loud that the change is applied.
     [SOFT-DISABLED]  example 4. Enforcing aria-disabled="true".
     [AUTO-INIT]      delete if you construct instances yourself.

   Examples 1 and 3 need none of this file — a labeled checkbox with the [CORE]
   styling is already a working, accessible switch.

   Copy the file whole for the library version.

   Two decisions worth the script:

   The confirmation is a polite role="status", not a change of label. Renaming
   the control the user just operated means the next thing they hear is a
   different control, and a switch is *already* self-describing through
   checked/unchecked — so the words go somewhere else and stay out of the name.

   aria-disabled is an announcement, not an enforcement. The browser will happily
   toggle a checkbox that claims to be disabled, so the click has to be
   prevented. Space fires a click on a checkbox, so one handler covers the
   keyboard too.

   No dependencies. Plain IIFE, so a paste into a <script> tag works.
   =========================================================================== */
(function (global) {
  'use strict';

  /**
   * @param {HTMLElement} root element carrying [data-ac-switch]
   * @param {{ onChange?: Function }} [options]
   */
  function createSwitch(root, options) {
    // Idempotent: initializing twice would double up the listeners.
    if (!root || root._acSwitch) return root && root._acSwitch;

    var settings = options || {};

    /* === [CORE] find the input =========================================== */

    var input =
      root.querySelector('[data-ac-switch-input]') || root.querySelector('.ac-switch__input');
    if (!input) return null;

    /* === [STATUS] example 2 ============================================== */

    var note = root.querySelector('[data-ac-switch-note]');
    var status = root.querySelector('[data-ac-switch-status]');
    var onText = input.getAttribute('data-ac-on-text');
    var offText = input.getAttribute('data-ac-off-text');
    var speaks = !!(onText || offText);

    function words() {
      return (input.checked ? onText : offText) || '';
    }

    function paint() {
      if (!speaks) return;

      // The visible line and the live region carry the same words. The visible
      // one is aria-hidden in the markup, so the state is readable on screen
      // without being announced a second time.
      if (note) note.textContent = words();
      if (status) status.textContent = words();

      if (typeof settings.onChange === 'function') settings.onChange(input.checked);
    }

    function onChange() {
      paint();
    }

    input.addEventListener('change', onChange);

    /* === [SOFT-DISABLED] example 4 ======================================= */

    function onClick(event) {
      // Re-read the attribute every time: whether the control is available is
      // usually the thing that changes, and a value captured at setup would go
      // stale the moment it did.
      if (input.getAttribute('aria-disabled') === 'true') event.preventDefault();
    }

    input.addEventListener('click', onClick);

    // Only paint the initial state when there is something to say; example 4's
    // note is authored in the HTML and must not be overwritten.
    if (speaks) paint();

    /* === [CORE] API ====================================================== */

    var api = {
      element: root,
      input: input,
      /** @returns {boolean} */
      state: function () {
        return input.checked;
      },
      /**
       * Flip it from code. Fires no `change` event -- assigning .checked never
       * does -- so the announcement is painted here instead.
       * @param {boolean} on
       */
      set: function (on) {
        input.checked = !!on;
        paint();
      },
      /** Re-read the input after changing it from code. */
      refresh: paint,
      destroy: function () {
        input.removeEventListener('change', onChange);
        input.removeEventListener('click', onClick);
        if (speaks) {
          if (note) note.textContent = '';
          if (status) status.textContent = '';
        }
        delete root._acSwitch;
      },
    };

    root._acSwitch = api;
    return api;
  }

  global.AC = global.AC || {};
  global.AC.createSwitch = createSwitch;

  /* === [AUTO-INIT] delete this block if you construct instances yourself === */
  function initAll(scope) {
    (scope || document).querySelectorAll('[data-ac-switch]').forEach(function (el) {
      createSwitch(el);
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
