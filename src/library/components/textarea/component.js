/* ===========================================================================
   TEXTAREA

   WHAT TO COPY
     [CORE]        shared plumbing for both behaviors below.
     [COUNTER]     example 2. Character count and its live region.
     [AUTOGROW]    example 3. Height follows the content.
     [AUTO-INIT]   delete if you construct instances yourself.

   Examples 1, 4 and 5 need none of this file. A textarea is accessible on its
   own; everything here is about not making it worse.

   Copy the file whole for the library version.

   The counter is the whole reason this file exists, and the timing is the point:

     visible count   updated on every keystroke, aria-hidden so it is silent
     live region     updated on a 1s pause, and only from 90% of the limit on

   Wire a live region straight to `input` and it reads "1 character. 2
   characters. 3 characters." across the top of what the user is typing. Announce
   only what changes the decision -- running out of room, and being over.

   No dependencies. Plain IIFE, so a paste into a <script> tag works.
   =========================================================================== */
(function (global) {
  'use strict';

  /** Silence after the last keystroke before the count is announced. */
  var IDLE_MS = 1000;

  /** Announce from here on: below it, the remaining count changes nothing. */
  var NEAR_LIMIT = 0.9;

  /**
   * @param {HTMLElement} root element carrying [data-ac-textarea]
   * @param {{ limit?: number, idleMs?: number }} [options]
   */
  function createTextarea(root, options) {
    // Idempotent: initializing twice would double up the listeners.
    if (!root || root._acTextarea) return root && root._acTextarea;

    var settings = options || {};

    /* === [CORE] find the parts =========================================== */

    var field = root.matches('textarea') ? root : root.querySelector('textarea');
    if (!field) return null;

    /* === [COUNTER] example 2 ============================================= */

    var count = root.querySelector('[data-ac-count]');
    var status = root.querySelector('[data-ac-count-status]');
    var limit = settings.limit || parseInt(field.getAttribute('data-ac-limit'), 10) || 0;
    var idleMs = typeof settings.idleMs === 'number' ? settings.idleMs : IDLE_MS;
    var idle = null;

    /** Whatever the markup shipped, so destroy() can put it back exactly. */
    var originalInvalid = field.getAttribute('aria-invalid');

    function paintCount() {
      var used = field.value.length;
      var over = used - limit;

      if (count) {
        count.textContent = over > 0 ? over + ' over' : used + ' / ' + limit;
        count.setAttribute('data-ac-over', String(over > 0));
      }

      // aria-invalid, not a class: the styling then cannot disagree with what is
      // announced, and it is the field itself that is wrong, not the counter.
      if (over > 0) field.setAttribute('aria-invalid', 'true');
      else if (originalInvalid !== null) field.setAttribute('aria-invalid', originalInvalid);
      else field.removeAttribute('aria-invalid');
    }

    function announceCount() {
      if (!status) return;
      var used = field.value.length;
      var left = limit - used;

      if (left < 0) {
        status.textContent = 'Over the limit by ' + -left + ' characters.';
      } else if (used >= limit * NEAR_LIMIT) {
        status.textContent = left + ' characters left.';
      } else {
        // Nothing worth interrupting for. Cleared so the next threshold crossing
        // is a change, and therefore gets announced.
        status.textContent = '';
      }
    }

    function onCountInput() {
      paintCount();
      if (idle) clearTimeout(idle);
      idle = setTimeout(announceCount, idleMs);
    }

    /* === [AUTOGROW] example 3 ============================================
       Height is set inline from scrollHeight. The cap is in CSS, so past it the
       value scrolls instead of growing the page forever. */

    var autogrow = field.hasAttribute('data-ac-autogrow');
    /** Set once the user drags the handle: their size wins from then on. */
    var manual = false;
    var ours = 0;
    var observer = null;

    function grow() {
      if (manual) return;
      // Collapse first, or scrollHeight can only ever report the current height
      // back and the field never shrinks when text is deleted.
      field.style.height = 'auto';
      field.style.height = field.scrollHeight + 'px';
      ours = field.offsetHeight;
    }

    function onGrowInput() {
      grow();
    }

    if (autogrow) {
      grow();

      // A height change we did not cause is the resize handle, so stop adjusting.
      // Overruling a size the user chose by hand is the component arguing with
      // them, and they cannot win.
      if (typeof ResizeObserver === 'function') {
        observer = new ResizeObserver(function () {
          if (!manual && ours && Math.abs(field.offsetHeight - ours) > 2) manual = true;
        });
        observer.observe(field);
      }

      field.addEventListener('input', onGrowInput);
    }

    if (limit) {
      paintCount();
      field.addEventListener('input', onCountInput);
    }

    /* === [CORE] API ====================================================== */

    var api = {
      element: field,
      /** Characters used, and how many past the limit (0 when inside it). */
      count: function () {
        return { used: field.value.length, over: Math.max(0, field.value.length - limit) };
      },
      /** Re-measure after setting .value from code -- no input event fires then. */
      refresh: function () {
        if (limit) paintCount();
        if (autogrow) grow();
      },
      destroy: function () {
        if (idle) clearTimeout(idle);
        if (observer) observer.disconnect();
        field.removeEventListener('input', onCountInput);
        field.removeEventListener('input', onGrowInput);
        field.style.height = '';
        if (originalInvalid === null) field.removeAttribute('aria-invalid');
        else field.setAttribute('aria-invalid', originalInvalid);
        if (count) {
          count.textContent = '';
          count.removeAttribute('data-ac-over');
        }
        if (status) status.textContent = '';
        delete root._acTextarea;
      },
    };

    root._acTextarea = api;
    return api;
  }

  global.AC = global.AC || {};
  global.AC.createTextarea = createTextarea;

  /* === [AUTO-INIT] delete this block if you construct instances yourself === */
  function initAll(scope) {
    (scope || document).querySelectorAll('[data-ac-textarea]').forEach(function (el) {
      createTextarea(el);
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
