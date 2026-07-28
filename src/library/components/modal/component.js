/* ===========================================================================
   MODAL

   WHAT TO COPY
     [CORE]       all examples. Open, close, focus, the scroll lock.
     [BACKDROP]   example 1. Click-outside to dismiss, opt-in.
     [STATUS]     examples 2 and 3. Reporting the outcome after the dialog has
                  gone.
     [AUTO-INIT]  delete if you construct instances yourself.

   Copy the file whole for the library version.

   This file is short because <dialog>.showModal() already does the hard parts:
   the top layer, ::backdrop, inertness for the rest of the page, Tab kept
   inside, Esc, and focus back to the opener on close. What is left is the four
   things it does *not* do:

   Focus placement. showModal() focuses the first focusable thing it finds, which
   is usually the close button — so a screen reader user hears "Close, button"
   and has to go looking for what the dialog says. We focus the dialog itself
   instead, which reads the name and then the content, unless data-ac-focus names
   something better: the first field in a form, the *safe* button in a
   confirmation.

   The scroll lock. showModal() makes the page inert and leaves it scrolling.

   The outcome. Closing a dialog says nothing at all: focus is back on a trigger
   the person already knows about. Anything that happened has to be reported, and
   it has to be reported **after** the close — a live region outside the dialog is
   inert while the dialog is open, so a message written on the click is never
   announced.

   Enforcing that Esc is not the only way out. There is nothing to enforce in
   code; it is a visible close button in the markup, because touch has no Esc key.

   No dependencies. Plain IIFE, so a paste into a <script> tag works.
   =========================================================================== */
(function (global) {
  'use strict';

  var uid = 0;
  // Shared, so a dialog opened from a dialog does not unlock the page when the
  // inner one closes.
  var openCount = 0;

  /**
   * @param {HTMLDialogElement} root a <dialog> carrying [data-ac-modal]
   * @param {{ focus?: string, backdropClose?: boolean, onClose?: Function,
   *           onCancel?: Function }} [options]
   */
  function createModal(root, options) {
    // Idempotent: initializing twice would double up the listeners.
    if (!root || root._acModal) return root && root._acModal;
    // A <dialog> in a browser without showModal() is display: none and there is
    // nothing to enhance. Whatever is inside needs another route to it.
    if (typeof root.showModal !== 'function') return null;

    var settings = options || {};
    if (!root.id) root.id = 'ac-modal-' + ++uid;

    /* === [CORE] the parts =============================================== */

    var triggers = Array.prototype.slice.call(
      document.querySelectorAll('[data-ac-modal-open="' + root.id + '"]'),
    );
    var focusSelector = settings.focus || root.getAttribute('data-ac-focus') || '';
    var opener = null;

    function open(from) {
      if (root.open) return;

      // The browser restores focus to whatever was focused when showModal() ran,
      // so this is only a fallback for when that element is gone by then.
      opener = from || document.activeElement;

      root.showModal();
      openCount++;
      document.documentElement.setAttribute('data-ac-modal-lock', 'true');

      // See the header: showModal() has already focused the first focusable
      // element, which is the wrong one often enough to always override.
      var target = focusSelector ? root.querySelector(focusSelector) : null;
      if (!target) {
        // tabindex="-1" so the dialog itself can hold focus, which is what makes
        // a screen reader read the name and then the body.
        root.tabIndex = -1;
        target = root;
      }
      target.focus();
    }

    /** @param {string} [value] becomes dialog.returnValue */
    function close(value) {
      if (!root.open) return;
      root.close(typeof value === 'string' ? value : '');
    }

    /* === [STATUS] examples 2 and 3 ====================================== */

    // Outside the dialog, because a region inside it is removed from the page
    // along with the dialog and never gets the chance to speak.
    var status = document.querySelector('[data-ac-modal-status="' + root.id + '"]');
    var pending = '';

    // Stashed rather than written: everything outside an open modal is inert, and
    // a live region in inert content does not announce. It goes out on close.
    function stash(el) {
      pending = (el && el.getAttribute('data-ac-said')) || '';
    }

    function onClickInside(event) {
      var closer = event.target.closest ? event.target.closest('[data-ac-modal-close]') : null;
      if (!closer) return;
      stash(closer);
      close(closer.value || 'close');
    }

    // <form method="dialog"> closes the dialog itself, so the message is taken
    // from the button that submitted. Read here and not on the click, because a
    // click that fails validation leaves the dialog open -- and a message stashed
    // then would be announced later by whatever finally closed it.
    function onSubmit(event) {
      stash(event.submitter);
    }

    /* === [BACKDROP] example 1 =========================================== */

    var backdropClose = settings.backdropClose;
    if (typeof backdropClose !== 'boolean') {
      // Off unless asked for: a stray click should not be able to throw away
      // half-typed work.
      backdropClose = root.getAttribute('data-ac-backdrop-close') === 'true';
    }
    var downOnBackdrop = false;

    // A click on ::backdrop is dispatched to the dialog element itself, so
    // target === root means "outside". This is also why the dialog carries no
    // padding of its own — that padding would be part of root.
    function onPointerDown(event) {
      downOnBackdrop = event.target === root;
    }

    function onBackdropClick(event) {
      // Both ends checked, or a selection drag that starts on the text and
      // finishes on the backdrop closes the dialog under the user's hand.
      if (!backdropClose || !downOnBackdrop || event.target !== root) return;
      close('dismiss');
    }

    /* === [CORE] wiring ================================================== */

    function onTriggerClick(event) {
      open(event.currentTarget);
    }

    function onCancel(event) {
      // Esc fires cancel, then close. preventDefault() here is how a dialog with
      // unsaved work refuses to disappear -- and then you owe the user a sentence
      // saying what to do instead.
      if (typeof settings.onCancel === 'function' && settings.onCancel(event) === false) {
        event.preventDefault();
      }
    }

    function onClose() {
      openCount = Math.max(0, openCount - 1);
      if (!openCount) document.documentElement.removeAttribute('data-ac-modal-lock');

      if (status) {
        // Cleared first, so the same message twice in a row is still a change the
        // live region reports.
        status.textContent = '';
        if (pending) {
          var words = pending;
          pending = '';
          requestAnimationFrame(function () {
            status.textContent = words;
          });
        }
      }

      // The browser has already put focus back. This only covers the case where
      // it could not -- an opener that has been re-rendered since.
      if (document.activeElement === document.body && opener && opener.isConnected) {
        opener.focus();
      }

      if (typeof settings.onClose === 'function') settings.onClose(root.returnValue);
    }

    triggers.forEach(function (trigger) {
      trigger.addEventListener('click', onTriggerClick);
    });
    root.addEventListener('click', onClickInside);
    root.addEventListener('submit', onSubmit);
    root.addEventListener('pointerdown', onPointerDown);
    root.addEventListener('click', onBackdropClick);
    root.addEventListener('cancel', onCancel);
    root.addEventListener('close', onClose);

    var api = {
      element: root,
      triggers: triggers,
      open: open,
      close: close,
      /** @returns {boolean} */
      isOpen: function () {
        return root.open;
      },
      destroy: function () {
        if (root.open) {
          root.close();
          // The `close` event is queued, not synchronous, so it would fire after
          // the listener below has gone -- leaving the page locked forever. The
          // unlock is done here instead.
          openCount = Math.max(0, openCount - 1);
          if (!openCount) document.documentElement.removeAttribute('data-ac-modal-lock');
        }
        triggers.forEach(function (trigger) {
          trigger.removeEventListener('click', onTriggerClick);
        });
        root.removeEventListener('click', onClickInside);
        root.removeEventListener('submit', onSubmit);
        root.removeEventListener('pointerdown', onPointerDown);
        root.removeEventListener('click', onBackdropClick);
        root.removeEventListener('cancel', onCancel);
        root.removeEventListener('close', onClose);
        delete root._acModal;
      },
    };

    root._acModal = api;
    return api;
  }

  global.AC = global.AC || {};
  global.AC.createModal = createModal;

  /* === [AUTO-INIT] delete this block if you construct instances yourself === */
  function initAll(scope) {
    (scope || document).querySelectorAll('[data-ac-modal]').forEach(function (el) {
      createModal(el);
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
