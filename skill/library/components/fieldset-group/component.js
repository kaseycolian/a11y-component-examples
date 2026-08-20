/* ===========================================================================
   FIELDSET GROUP

   WHAT TO COPY
     [CORE]           finding the controls. Needed by both blocks below.
     [VALIDATE]       example 4. "At least one", which HTML cannot express.
     [SOFT-DISABLED]  example 5. Enforcing aria-disabled="true".
     [AUTO-INIT]      delete if you construct instances yourself.

   Examples 1, 2 and 3 need none of this file — a fieldset, a legend and real
   labels are already a working, accessible group.

   Copy the file whole for the library version.

   Two decisions worth the script:

   The error id is written onto every control's aria-describedby, not just onto
   the fieldset. A fieldset's own description is announced inconsistently across
   screen readers, and never again once focus has moved to the third checkbox —
   so the one place it is certain to be read is the control the person is on.

   Validation waits until the group has been touched. An error on a question
   nobody has answered yet is a scolding, so the check runs on `change` and, for
   the submit case, whenever validate() is called by hand.

   No dependencies. Plain IIFE, so a paste into a <script> tag works.
   =========================================================================== */
(function (global) {
  'use strict';

  var uid = 0;

  /**
   * @param {HTMLElement} root fieldset (or [role="group"]) carrying [data-ac-fieldset-group]
   * @param {{ min?: number, message?: string, onValidate?: Function }} [options]
   */
  function createFieldsetGroup(root, options) {
    // Idempotent: initializing twice would double up the listeners.
    if (!root || root._acFieldsetGroup) return root && root._acFieldsetGroup;

    var settings = options || {};

    /* === [CORE] the controls ============================================= */

    var boxes = Array.prototype.slice.call(
      root.querySelectorAll('input[type="checkbox"], input[type="radio"]'),
    );
    if (!boxes.length) return null;

    /* === [VALIDATE] example 4 ============================================ */

    var error = root.querySelector('[data-ac-group-error]');
    var min = Number(settings.min || root.getAttribute('data-ac-min') || 0);
    var message =
      settings.message || root.getAttribute('data-ac-message') || 'Choose at least one option.';
    var checks = min > 0 && !!error;
    var described = [];

    if (checks) {
      if (!error.id) error.id = 'ac-group-error-' + ++uid;

      // Wired up front, while the region is still empty: an aria-describedby
      // added at the same moment as the text is a change the browser may not
      // pass on, and the association is harmless until there are words in it.
      boxes.forEach(function (box) {
        var list = (box.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
        if (list.indexOf(error.id) !== -1) return;
        list.push(error.id);
        box.setAttribute('aria-describedby', list.join(' '));
        described.push(box);
      });
    }

    function count() {
      return boxes.filter(function (box) {
        return box.checked;
      }).length;
    }

    /**
     * @param {boolean} [speak] false to evaluate without touching the page
     * @returns {boolean}
     */
    function validate(speak) {
      var ok = count() >= min;
      if (!checks || speak === false) return ok;

      // Replaced rather than appended, so ten fast clicks do not queue ten
      // announcements.
      error.textContent = ok ? '' : message;
      root.classList.toggle('ac-group--invalid', !ok);

      // Per control, because the group's own state is not what a screen reader
      // repeats when focus lands on one of the boxes.
      boxes.forEach(function (box) {
        if (ok) box.removeAttribute('aria-invalid');
        else box.setAttribute('aria-invalid', 'true');
      });

      if (typeof settings.onValidate === 'function') settings.onValidate(ok);
      return ok;
    }

    /* === [SOFT-DISABLED] example 5 ======================================= */

    function onClick(event) {
      // Re-read the attribute every time: availability is usually the thing that
      // changes, and a value captured at setup would go stale the moment it did.
      // Space fires a click on a checkbox, so this covers the keyboard too.
      if (event.target.getAttribute('aria-disabled') === 'true') event.preventDefault();
    }

    /* === [CORE] wiring =================================================== */

    function onChange() {
      validate();
    }

    root.addEventListener('change', onChange);
    root.addEventListener('click', onClick);

    var api = {
      element: root,
      inputs: boxes,
      /** @returns {number} how many are checked */
      count: count,
      /**
       * Run the check. Call it from your submit handler; pass false to ask
       * without showing anything.
       */
      validate: validate,
      destroy: function () {
        root.removeEventListener('change', onChange);
        root.removeEventListener('click', onClick);
        if (checks) {
          error.textContent = '';
          root.classList.remove('ac-group--invalid');
          boxes.forEach(function (box) {
            box.removeAttribute('aria-invalid');
          });
          // Only the ids this factory added, so an authored description survives.
          described.forEach(function (box) {
            var kept = (box.getAttribute('aria-describedby') || '')
              .split(/\s+/)
              .filter(function (id) {
                return id && id !== error.id;
              });
            if (kept.length) box.setAttribute('aria-describedby', kept.join(' '));
            else box.removeAttribute('aria-describedby');
          });
        }
        delete root._acFieldsetGroup;
      },
    };

    root._acFieldsetGroup = api;
    return api;
  }

  global.AC = global.AC || {};
  global.AC.createFieldsetGroup = createFieldsetGroup;

  /* === [AUTO-INIT] delete this block if you construct instances yourself === */
  function initAll(scope) {
    (scope || document).querySelectorAll('[data-ac-fieldset-group]').forEach(function (el) {
      createFieldsetGroup(el);
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
