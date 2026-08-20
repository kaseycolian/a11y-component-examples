/* ===========================================================================
   FIELD

   WHAT TO COPY
     [CORE]        every example. Wires describedby/invalid and exposes
                   setError. ~60 lines; this is the whole contract.
     [VALIDATION]  examples 2 and 6 only. Native constraint validation on blur.
                   Delete the block if your framework already validates.
     [AUTO-INIT]   delete if you construct instances yourself.

   Copy the file whole for the library version.

   Why this exists: aria-describedby is a space-separated LIST, and the usual
   bug is one line —

       control.setAttribute('aria-describedby', errorId);   // hint is now gone

   So the list is written ONCE, at init, naming the hint and the error together.
   Showing an error only sets that element's text. Nothing to clobber.

   The error element must stay in the DOM and stay rendered even while empty. A
   role="alert" created, unhidden, or display:none-toggled in the same tick as
   its text is not announced: the region has to already be in the accessibility
   tree for the insertion to count as a change.

   No dependencies. Plain IIFE, so a paste into a <script> tag works.
   =========================================================================== */
(function (global) {
  'use strict';

  var uid = 0;

  /**
   * @param {HTMLElement} root element carrying [data-ac-field]
   * @param {{ validate?: boolean, messages?: { missing?: string, invalid?: string } }} [options]
   */
  function createField(root, options) {
    // Idempotent: a second call would double up the listeners.
    if (!root || root._acField) return root && root._acField;

    var settings = options || {};
    var id = root.id || 'ac-field-' + ++uid;

    var label = root.querySelector('.ac-field__label');
    var hint = root.querySelector('.ac-field__hint');
    var error = root.querySelector('.ac-field__error');

    /* === [CORE] Which element carries the ARIA ============================
       One input: the input. A group of them: the <fieldset>, whose <legend> is
       already the group's name. On one radio it would describe only that radio. */

    var control =
      root.querySelector('[data-ac-control]') ||
      root.querySelector('fieldset') ||
      root.querySelector('input:not([type="hidden"]), select, textarea');

    if (!control) {
      throw new Error('createField: no control found inside the .ac-field root');
    }

    // A <fieldset> takes the ARIA but is not what you validate or focus.
    var isGroup = control.tagName === 'FIELDSET';
    var validationTarget = isGroup
      ? control.querySelector('input:not([type="hidden"]), select, textarea')
      : control;

    /* === [CORE] The describedby list, written once ======================== */

    if (hint && !hint.id) hint.id = id + '-hint';
    if (error && !error.id) error.id = id + '-error';

    // Whatever the author already had is kept, and kept first: it may point at a
    // character counter or a password policy this knows nothing about.
    var originalDescribedBy = control.getAttribute('aria-describedby');
    var described = (originalDescribedBy || '').split(/\s+/).filter(Boolean);

    [hint, error].forEach(function (el) {
      if (el && described.indexOf(el.id) === -1) described.push(el.id);
    });

    if (described.length) control.setAttribute('aria-describedby', described.join(' '));

    /* === [CORE] Error state =============================================== */

    // The value, not just its presence: markup can arrive aria-invalid="false".
    var originalAriaInvalid = control.getAttribute('aria-invalid');
    // Captured as markup: a server message may contain a <code> or a link, and
    // destroy() has to hand back what it was given.
    var initialHtml = error ? error.innerHTML : '';
    var pending = null;

    function currentMessage() {
      return error ? error.textContent.trim() : '';
    }

    function isInvalid() {
      return control.getAttribute('aria-invalid') === 'true';
    }

    function write(message) {
      if (error) error.textContent = message;
      root.classList.toggle('ac-field--invalid', Boolean(message));

      if (message) control.setAttribute('aria-invalid', 'true');
      else if (originalAriaInvalid !== null) control.setAttribute('aria-invalid', 'false');
      else control.removeAttribute('aria-invalid');
    }

    /**
     * Show an error, or clear it with '' / null. Say what to do about the
     * problem: "Enter a date in the past" beats "Invalid date".
     * @param {string|null} message
     */
    function setError(message) {
      var next = message == null ? '' : String(message);
      if (pending) {
        cancelAnimationFrame(pending);
        pending = null;
      }

      // Re-asserting the same message must not re-announce it. Blur validation
      // fires twice for one mistake more often than you would expect.
      if (next === currentMessage()) return;

      // Swapping one message for another needs a frame between them: some screen
      // readers coalesce a same-tick clear-and-set into no change at all. Only
      // the text cycles, so aria-invalid never claims the control is valid.
      if (next && currentMessage()) {
        error.textContent = '';
        pending = requestAnimationFrame(function () {
          pending = null;
          write(next);
        });
        return;
      }

      write(next);
    }

    function clearError() {
      setError('');
    }

    /* === [VALIDATION] optional — delete this block if your framework validates
       Opt in with data-ac-validate. Checked on blur, because erroring at someone
       mid-word is hostile; cleared the instant the value becomes valid, so the
       fix is acknowledged immediately. */

    function messageFor(el) {
      var explicit = el.getAttribute(
        el.validity.valueMissing ? 'data-ac-error-missing' : 'data-ac-error-invalid',
      );
      var key = el.validity.valueMissing ? 'missing' : 'invalid';
      // validationMessage last: the browser's wording says what is wrong but
      // never what to do about it.
      return explicit || (settings.messages || {})[key] || el.validationMessage;
    }

    function check() {
      if (!validationTarget) return true;
      if (validationTarget.checkValidity()) {
        clearError();
        return true;
      }
      setError(messageFor(validationTarget));
      return false;
    }

    function onBlur() {
      check();
    }

    function onInput() {
      // Only ever removes a message. Nothing new appears while typing.
      if (isInvalid() && validationTarget.checkValidity()) clearError();
    }

    var validates =
      typeof settings.validate === 'boolean'
        ? settings.validate
        : root.hasAttribute('data-ac-validate');

    if (validates && validationTarget) {
      // Capture: blur does not bubble, and on a group this listens above several
      // controls at once. `change` as well as `input` for radios and checkboxes.
      control.addEventListener('blur', onBlur, true);
      control.addEventListener('input', onInput, true);
      control.addEventListener('change', onInput, true);
    }

    /* === [CORE] API ====================================================== */

    var api = {
      /** The element carrying aria-describedby / aria-invalid. */
      control: control,
      label: label,
      setError: setError,
      clearError: clearError,
      /** @returns {boolean} */
      isInvalid: isInvalid,
      /** Run constraint validation now. @returns {boolean} */
      check: check,
      /** Focus the control — what a submit handler wants for the first bad field. */
      focus: function () {
        if (validationTarget) validationTarget.focus();
      },
      destroy: function () {
        if (pending) cancelAnimationFrame(pending);
        control.removeEventListener('blur', onBlur, true);
        control.removeEventListener('input', onInput, true);
        control.removeEventListener('change', onInput, true);

        // Exactly what was there before, so destroy is the inverse of create even
        // on markup that arrived already invalid.
        if (originalDescribedBy === null) control.removeAttribute('aria-describedby');
        else control.setAttribute('aria-describedby', originalDescribedBy);

        // Our own captured markup going back where it came from — setError only
        // ever writes textContent, so no message is ever parsed as HTML.
        if (error) error.innerHTML = initialHtml;

        if (originalAriaInvalid !== null) {
          control.setAttribute('aria-invalid', originalAriaInvalid);
        } else {
          control.removeAttribute('aria-invalid');
        }

        root.classList.toggle('ac-field--invalid', Boolean(currentMessage()));
        delete root._acField;
      },
    };

    root._acField = api;
    return api;
  }

  global.AC = global.AC || {};
  global.AC.createField = createField;

  /* === [AUTO-INIT] delete this block if you construct instances yourself === */
  function initAll(scope) {
    (scope || document).querySelectorAll('[data-ac-field]').forEach(function (el) {
      createField(el);
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
