/* ===========================================================================
   INPUT GROUP

   WHAT TO COPY
     [CORE]       shared plumbing for both behaviors below.
     [REVEAL]     example 2. Password show/hide.
     [COPY]       example 3. Copy to clipboard.
     [AUTO-INIT]  delete if you construct instances yourself.

   Examples 1, 4 and 5 need none of this file — a submit button, a text affix
   and an invalid state are all markup and CSS.

   Copy the file whole for the library version.

   Two decisions worth keeping:

     Reveal changes the button's NAME and sets no aria-pressed. "Show password,
     pressed" makes the user work out whether pressed describes the field's
     state or the button's next action. Pick one channel.

     Copy announces through a role="status" that already exists and is empty.
     Creating the element and its text in one go gives a screen reader nothing
     to notice changing, so nothing is read. The button's own name never
     changes: a name that changes under your finger reads as a different button.

   No dependencies. Plain IIFE, so a paste into a <script> tag works.
   =========================================================================== */
(function (global) {
  'use strict';

  /** How long the copy confirmation stays on screen. */
  var STATUS_MS = 4000;

  /**
   * @param {HTMLElement} root element carrying [data-ac-input-group]
   * @param {{ copiedText?: string, failedText?: string }} [options]
   */
  function createInputGroup(root, options) {
    // Idempotent: initializing twice would double up the listeners.
    if (!root || root._acInputGroup) return root && root._acInputGroup;

    var settings = options || {};

    /* === [CORE] find the parts ============================================
       Buttons name their input by id, so the markup stays readable and the
       script never has to guess which field a button belongs to. */

    var revealBtn = root.querySelector('[data-ac-reveal]');
    var copyBtn = root.querySelector('[data-ac-copy]');
    var status = root.querySelector('[data-ac-copy-status]');
    var timer = null;

    function inputFor(btn, attr) {
      var id = btn.getAttribute(attr);
      return (id && root.querySelector('#' + id)) || root.querySelector('.ac-input');
    }

    /* === [REVEAL] example 2 =============================================== */

    var revealInput = revealBtn ? inputFor(revealBtn, 'data-ac-reveal') : null;
    var showLabel = revealBtn ? revealBtn.getAttribute('data-ac-show-label') || 'Show password' : '';
    var hideLabel = revealBtn ? revealBtn.getAttribute('data-ac-hide-label') || 'Hide password' : '';
    var originalType = revealInput ? revealInput.type : null;

    function paintReveal() {
      var shown = revealInput.type === 'text';
      // The visible word is the first word of the accessible name, so speech
      // input ("click show") still reaches it (SC 2.5.3).
      revealBtn.textContent = shown ? hideLabel.split(' ')[0] : showLabel.split(' ')[0];
      revealBtn.setAttribute('aria-label', shown ? hideLabel : showLabel);
    }

    /** Where the caret was, snapshotted before the browser can lose it. */
    var lastSel = [0, 0];

    function onRevealBlur() {
      // Reaching for the button blurs the field, and the browser collapses the
      // selection to 0 on the way out -- but not until after this fires. So this
      // is the last moment the caret position is still readable.
      lastSel = [revealInput.selectionStart, revealInput.selectionEnd];
    }

    function onReveal() {
      var sel = document.activeElement === revealInput
        ? [revealInput.selectionStart, revealInput.selectionEnd]
        : lastSel;

      revealInput.type = revealInput.type === 'password' ? 'text' : 'password';
      paintReveal();

      // Changing `type` resets the selection, so put the caret back -- the user
      // was probably mid-word when they reached for the button. Twice: the reset
      // lands after this turn of the event loop on a field that is no longer
      // focused, so a synchronous restore alone gets overwritten.
      restoreCaret(sel);
      requestAnimationFrame(function () {
        restoreCaret(sel);
      });
    }

    function restoreCaret(sel) {
      try {
        revealInput.setSelectionRange(sel[0], sel[1]);
      } catch (e) {
        /* setSelectionRange throws on input types that do not support it */
      }
    }

    if (revealBtn && revealInput) {
      paintReveal();
      revealBtn.addEventListener('click', onReveal);
      revealInput.addEventListener('blur', onRevealBlur);
    }

    /* === [COPY] example 3 ================================================= */

    var copyInput = copyBtn ? inputFor(copyBtn, 'data-ac-copy') : null;

    function announce(message) {
      if (!status) return;
      status.textContent = message;
      // Clear it again, or a stale "Copied" sits there describing nothing.
      if (timer) clearTimeout(timer);
      timer = setTimeout(function () {
        status.textContent = '';
      }, STATUS_MS);
    }

    function fallbackCopy() {
      // execCommand is deprecated but still the only route without a secure
      // context or clipboard permission. Selecting the value is also a usable
      // outcome on its own: the user can finish with their own copy shortcut.
      copyInput.focus();
      copyInput.select();
      try {
        return document.execCommand('copy');
      } catch (e) {
        return false;
      }
    }

    function onCopy() {
      var done = function (ok) {
        announce(
          ok
            ? settings.copiedText || 'Copied to clipboard'
            : settings.failedText || 'Press Control C to copy the selected value',
        );
      };

      if (global.navigator && global.navigator.clipboard) {
        global.navigator.clipboard.writeText(copyInput.value).then(
          function () {
            done(true);
          },
          function () {
            done(fallbackCopy());
          },
        );
      } else {
        done(fallbackCopy());
      }
    }

    if (copyBtn && copyInput) copyBtn.addEventListener('click', onCopy);

    /* === [CORE] API ======================================================= */

    var api = {
      element: root,
      /** Show or hide the password without going through the button. */
      reveal: function (show) {
        if (!revealInput) return;
        revealInput.type = show === false ? 'password' : 'text';
        paintReveal();
      },
      destroy: function () {
        if (timer) clearTimeout(timer);
        if (revealBtn && revealInput) {
          revealBtn.removeEventListener('click', onReveal);
          revealInput.removeEventListener('blur', onRevealBlur);
          revealInput.type = originalType;
        }
        if (copyBtn && copyInput) copyBtn.removeEventListener('click', onCopy);
        if (status) status.textContent = '';
        delete root._acInputGroup;
      },
    };

    root._acInputGroup = api;
    return api;
  }

  global.AC = global.AC || {};
  global.AC.createInputGroup = createInputGroup;

  /* === [AUTO-INIT] delete this block if you construct instances yourself === */
  function initAll(scope) {
    (scope || document).querySelectorAll('[data-ac-input-group]').forEach(function (el) {
      createInputGroup(el);
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
