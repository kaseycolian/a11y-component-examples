/* =============================================================================
   Field

   Wires a label, a control, a hint and an error message together. No
   dependencies.

   What it actually solves: aria-describedby is a space-separated LIST, and the
   common bug is `control.setAttribute('aria-describedby', errorId)` when an
   error appears, which silently throws the hint away. So this writes the list
   once, at init, naming the hint AND the error together. Showing an error only
   ever sets that element's text -- the list is never rewritten, so there is
   nothing to clobber.

   The error element stays in the DOM and stays rendered even while empty. A
   role="alert" that is created, unhidden, or `display: none`-toggled in the same
   tick as its text is not announced at all: the region has to already be in the
   accessibility tree for the insertion to register as a change.

   Vanilla:   <script src="component.js"></script> -- anything with
              [data-ac-field] is wired up automatically.

   Framework: delete the auto-init block at the bottom and call the factory from
              your own lifecycle:

                const f = AC.createField(ref.current);
                f.setError('Enter a date in the past.');
                f.destroy();   // on unmount
   ============================================================================= */
(function (global) {
  'use strict';

  var uid = 0;

  /**
   * @param {HTMLElement} root element carrying [data-ac-field]
   * @param {{ validate?: boolean, messages?: { missing?: string, invalid?: string } }} [options]
   */
  function createField(root, options) {
    // Idempotent: initialising twice would double up the listeners.
    if (!root || root._acField) return root && root._acField;

    var settings = options || {};
    var id = root.id || 'ac-field-' + ++uid;

    var label = root.querySelector('.ac-field__label');
    var hint = root.querySelector('.ac-field__hint');
    var error = root.querySelector('.ac-field__error');

    /* --- Which element carries the ARIA ------------------------------------
       For a single input it is the input. For a group of them it is the
       <fieldset>: describing one radio would describe only that radio, and the
       <legend> is already the group's accessible name. */

    var control =
      root.querySelector('[data-ac-control]') ||
      root.querySelector('fieldset') ||
      root.querySelector('input:not([type="hidden"]), select, textarea');

    if (!control) {
      throw new Error('createField: no control found inside the .ac-field root');
    }

    // A <fieldset> is the ARIA target but not the thing you validate or focus;
    // that is still the first real control inside it.
    var isGroup = control.tagName === 'FIELDSET';
    var validationTarget = isGroup
      ? control.querySelector('input:not([type="hidden"]), select, textarea')
      : control;

    /* --- Ids and the describedby list -------------------------------------- */

    if (hint && !hint.id) hint.id = id + '-hint';
    if (error && !error.id) error.id = id + '-error';

    // Keep whatever the author already put in aria-describedby -- it may point
    // at a character counter or a password policy we know nothing about -- and
    // add ours to the end, in DOM order, so what is heard matches what is read.
    var originalDescribedBy = control.getAttribute('aria-describedby');
    var described = (originalDescribedBy || '').split(/\s+/).filter(Boolean);

    [hint, error].forEach(function (el) {
      if (el && described.indexOf(el.id) === -1) described.push(el.id);
    });

    if (described.length) control.setAttribute('aria-describedby', described.join(' '));

    /* --- Error state -------------------------------------------------------- */

    // The value, not just whether it was there: server-rendered markup can
    // arrive with aria-invalid="false", and destroy() has to put that back.
    var originalAriaInvalid = control.getAttribute('aria-invalid');
    var hadAriaInvalid = originalAriaInvalid !== null;
    // Captured as markup, not text: a server-rendered message may contain a
    // <code> or a link, and destroy() has to hand back what it was given.
    var initialHtml = error ? error.innerHTML : '';
    var initialMessage = error ? error.textContent : '';
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

      if (message) {
        control.setAttribute('aria-invalid', 'true');
      } else if (hadAriaInvalid) {
        // The author declared it, so leave the attribute in place rather than
        // deleting markup we did not write.
        control.setAttribute('aria-invalid', 'false');
      } else {
        control.removeAttribute('aria-invalid');
      }
    }

    /**
     * Show an error, or clear it with '' / null. Say what to do about the
     * problem -- "Enter a date in the past" beats "Invalid date".
     * @param {string|null} message
     */
    function setError(message) {
      var next = message == null ? '' : String(message);
      if (pending) {
        cancelAnimationFrame(pending);
        pending = null;
      }

      // Re-asserting the same message must not re-announce it. Validating on
      // blur can easily fire twice for one mistake.
      if (next === currentMessage()) return;

      // Replacing one message with a different one needs a frame in between:
      // some screen readers coalesce a same-tick clear-and-set into no change
      // at all, and the new message goes unheard. Only the text is cycled --
      // aria-invalid and the invalid styling stay put, so there is no flicker
      // and no frame in which the control claims to be valid.
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

    /* --- Optional native validation ----------------------------------------
       Opt in with data-ac-validate. Checked on blur rather than on input,
       because erroring at someone mid-word is hostile; once an error is showing
       it clears the instant the value becomes valid, so the fix is acknowledged
       immediately. */

    function messageFor(el) {
      var explicit = el.getAttribute(
        el.validity.valueMissing ? 'data-ac-error-missing' : 'data-ac-error-invalid',
      );
      var fallbackKey = el.validity.valueMissing ? 'missing' : 'invalid';
      // validationMessage last: the browser's own wording ("Please fill out
      // this field.") says what is wrong but never what to do about it.
      return explicit || (settings.messages || {})[fallbackKey] || el.validationMessage;
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
      // Capture, because `blur` does not bubble -- and on a group we are
      // listening above several controls at once.
      control.addEventListener('blur', onBlur, true);
      control.addEventListener('input', onInput, true);
      // Radios and checkboxes report through `change`, not `input`, in older
      // engines; binding both is cheaper than feature-detecting.
      control.addEventListener('change', onInput, true);
    }

    var api = {
      /** The element carrying aria-describedby / aria-invalid. */
      control: control,
      /** The label element, if there is one. */
      label: label,
      setError: setError,
      clearError: clearError,
      /** @returns {boolean} */
      isInvalid: isInvalid,
      /** Run the control's own constraint validation now. @returns {boolean} */
      check: check,
      /** Move focus to the control -- what a submit handler wants for the first bad field. */
      focus: function () {
        if (validationTarget) validationTarget.focus();
      },
      destroy: function () {
        if (pending) cancelAnimationFrame(pending);
        control.removeEventListener('blur', onBlur, true);
        control.removeEventListener('input', onInput, true);
        control.removeEventListener('change', onInput, true);

        // Put back exactly what was there before, so destroy is the inverse of
        // create even on server-rendered markup that arrived already invalid.
        if (originalDescribedBy === null) control.removeAttribute('aria-describedby');
        else control.setAttribute('aria-describedby', originalDescribedBy);

        // Our own captured markup going back where it came from -- setError
        // itself only ever writes textContent, so no message is ever parsed.
        if (error) error.innerHTML = initialHtml;

        if (hadAriaInvalid) control.setAttribute('aria-invalid', originalAriaInvalid);
        else control.removeAttribute('aria-invalid');

        root.classList.toggle('ac-field--invalid', Boolean(initialMessage.trim()));

        delete root._acField;
      },
    };

    root._acField = api;
    return api;
  }

  global.AC = global.AC || {};
  global.AC.createField = createField;

  /* --- Auto-init. Delete this block if you initialise manually. ------------- */
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
