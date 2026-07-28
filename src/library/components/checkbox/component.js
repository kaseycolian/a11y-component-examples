/* ===========================================================================
   CHECKBOX

   WHAT TO COPY
     [CORE]        finding the parts.
     [MIXED]       example 3. Select-all, the indeterminate property, the count.
     [AUTO-INIT]   delete if you construct instances yourself.

   Examples 1, 2, 4 and 5 need none of this file. A checkbox is accessible on its
   own, and the [CUSTOM] styling in component.css needs no script either.

   Copy the file whole for the library version.

   This exists for one reason: **indeterminate is a property, not an attribute**.
   `<input indeterminate>` does nothing whatsoever. `el.indeterminate = true` is
   the only way to set it, so a tri-state parent checkbox cannot be server
   rendered and cannot be done in CSS.

   Set the property and stop there. Do not also write aria-checked="mixed" on a
   native checkbox: the browser already exposes mixed from the element, and a
   hand-written value can only disagree with it.

   No dependencies. Plain IIFE, so a paste into a <script> tag works.
   =========================================================================== */
(function (global) {
  'use strict';

  /**
   * @param {HTMLElement} root element carrying [data-ac-checkbox]
   * @param {{ onChange?: Function }} [options]
   */
  function createCheckbox(root, options) {
    // Idempotent: initializing twice would double up the listeners.
    if (!root || root._acCheckbox) return root && root._acCheckbox;

    var settings = options || {};

    /* === [CORE] find the parts =========================================== */

    var all = root.querySelector('[data-ac-check-all]');
    var items = Array.prototype.slice.call(root.querySelectorAll('[data-ac-check-item]'));
    if (!all || !items.length) return null;

    var count = root.querySelector('[data-ac-check-count]');
    var status = root.querySelector('[data-ac-check-status]');

    /* === [MIXED] example 3 =============================================== */

    function checkedItems() {
      return items.filter(function (item) {
        return item.checked;
      });
    }

    function paint() {
      var on = checkedItems().length;

      // The parent is checked only when every child is, and mixed whenever the
      // answer is "some". indeterminate has to be cleared explicitly -- it
      // survives a change to `checked` otherwise.
      all.checked = on === items.length;
      all.indeterminate = on > 0 && on < items.length;

      if (count) count.textContent = on + ' of ' + items.length + ' selected';
      // The live region says the same thing, and gets it once the DOM settles
      // rather than on every keystroke of a Space-held key.
      if (status) status.textContent = on + ' of ' + items.length + ' inputs selected.';

      if (typeof settings.onChange === 'function') settings.onChange(on);
    }

    function onAllChange() {
      // Clicking a mixed parent resolves to checked, which is what every desktop
      // file manager does and what users expect.
      var next = all.checked;
      items.forEach(function (item) {
        if (!item.disabled) item.checked = next;
      });
      paint();
    }

    function onItemChange() {
      paint();
    }

    all.addEventListener('change', onAllChange);
    items.forEach(function (item) {
      item.addEventListener('change', onItemChange);
    });

    paint();

    /* === [CORE] API ====================================================== */

    var api = {
      element: root,
      /** @returns {{ checked: number, total: number, mixed: boolean }} */
      state: function () {
        var on = checkedItems().length;
        return { checked: on, total: items.length, mixed: on > 0 && on < items.length };
      },
      /** Re-read the children after changing them from code -- no event fires then. */
      refresh: paint,
      destroy: function () {
        all.removeEventListener('change', onAllChange);
        items.forEach(function (item) {
          item.removeEventListener('change', onItemChange);
        });
        all.indeterminate = false;
        if (count) count.textContent = '';
        if (status) status.textContent = '';
        delete root._acCheckbox;
      },
    };

    root._acCheckbox = api;
    return api;
  }

  global.AC = global.AC || {};
  global.AC.createCheckbox = createCheckbox;

  /* === [AUTO-INIT] delete this block if you construct instances yourself === */
  function initAll(scope) {
    (scope || document).querySelectorAll('[data-ac-checkbox]').forEach(function (el) {
      createCheckbox(el);
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
