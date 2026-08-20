/* ===========================================================================
   DRAWER

   WHAT TO COPY
     [CORE]        every example. Open/close, focus management, Escape,
                   scroll lock, the backdrop.
     [TRAP]        modal drawers only. Delete it and pass data-ac-modal="false"
                   everywhere if none of yours are modal.
     [AUTO-INIT]   delete if you construct instances yourself.

   Copy the file whole for the library version.

   This component is almost entirely focus management, and that is the reason it
   exists. The visual part — a panel that slides in from an edge — is ten lines of
   CSS. What takes care is:

     on open    focus moves into the panel, so a keyboard or screen reader user is
                actually where the new content is
     while open focus is trapped (modal only), so Tab cannot wander behind a
                backdrop nobody can see past
     on close   focus returns to the trigger, so nobody is dumped at <body> and
                loses their place

   Modal and non-modal are genuinely different, so this does not fudge it. A modal
   drawer gets role="dialog" + aria-modal="true", a backdrop, a scroll lock and a
   trap. A non-modal one gets role="region", none of those, and no aria-modal —
   claiming aria-modal while leaving the page operable makes a screen reader stop
   announcing everything outside the panel, which is a lie the user pays for.

   No dependencies. Plain IIFE, so a paste into a <script> tag works.
   =========================================================================== */
(function (global) {
  'use strict';

  var uid = 0;

  var SUPPORTS_POPOVER =
    typeof HTMLElement !== 'undefined' &&
    Object.prototype.hasOwnProperty.call(HTMLElement.prototype, 'showPopover');

  /** Things that can hold focus. :not([inert] *) is not reliable, so depth is checked below. */
  var FOCUSABLE = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',');

  /** How many modal drawers are open, so nested ones do not unlock the body early. */
  var modalDepth = 0;

  /**
   * @param {HTMLElement} root element carrying [data-ac-drawer]
   * @param {{ modal?: boolean, edge?: string, onOpen?: Function, onClose?: Function }} [options]
   */
  function createDrawer(root, options) {
    // Idempotent: a second call would double up the listeners.
    if (!root || root._acDrawer) return root && root._acDrawer;

    var settings = options || {};
    var id = root.id || 'ac-drawer-' + ++uid;
    if (!root.id) root.id = id;

    /* === [CORE] Configuration ============================================= */

    var modal =
      typeof settings.modal === 'boolean'
        ? settings.modal
        : root.getAttribute('data-ac-modal') !== 'false';

    var edge = settings.edge || root.getAttribute('data-ac-edge') || 'bottom';
    root.setAttribute('data-ac-edge', edge);

    // The roles have to agree with the behavior, so they are set here rather than
    // trusted from the markup.
    root.setAttribute('role', modal ? 'dialog' : 'region');
    if (modal) root.setAttribute('aria-modal', 'true');
    else root.removeAttribute('aria-modal');

    var closers = root.querySelectorAll('[data-ac-drawer-close]');
    // Triggers live outside the drawer, so they are found by what they point at.
    var triggers = document.querySelectorAll('[data-ac-drawer-open="' + id + '"]');

    /* === [CORE] Backdrop ==================================================
       Built here rather than authored, so a non-modal drawer cannot accidentally
       ship one. aria-hidden because it is a click target, not content. */

    var backdrop = null;
    if (modal) {
      backdrop = document.createElement('div');
      backdrop.className = 'ac-drawer__backdrop';
      backdrop.setAttribute('aria-hidden', 'true');
      backdrop.hidden = true;
      root.parentNode.insertBefore(backdrop, root);
    }

    if (SUPPORTS_POPOVER) {
      // "manual", not "auto": auto's light-dismiss closes on any outside click
      // before our own handlers see it, and it fights the Escape handling below.
      root.setAttribute('popover', 'manual');
    }

    /** The element focus came from, so it can be given back. */
    var returnFocusTo = null;

    function isOpen() {
      return root.getAttribute('data-ac-open') === 'true';
    }

    /* === [TRAP] modal only ================================================ */

    function focusable() {
      var found = root.querySelectorAll(FOCUSABLE);
      var out = [];
      for (var i = 0; i < found.length; i++) {
        // getClientRects().length, not offsetParent: offsetParent is null for any
        // position:fixed element, and this panel is fixed.
        if (found[i].getClientRects().length > 0) out.push(found[i]);
      }
      return out;
    }

    function onTrapKeydown(event) {
      if (event.key !== 'Tab') return;

      var items = focusable();
      if (!items.length) {
        // Nothing to tab to, so keep focus on the panel rather than letting it
        // escape to the page behind the backdrop.
        event.preventDefault();
        root.focus();
        return;
      }

      var first = items[0];
      var last = items[items.length - 1];

      // Wrap at both ends. Checked against activeElement rather than the event
      // target so it still works when focus is on the panel itself.
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      } else if (!root.contains(document.activeElement)) {
        // Focus got out some other way (a browser find bar, a stray script).
        event.preventDefault();
        first.focus();
      }
    }

    /* === [CORE] Open and close ============================================ */

    function open(opener) {
      if (isOpen()) return;

      returnFocusTo =
        opener || (triggers.length ? triggers[0] : null) || document.activeElement;

      if (backdrop) backdrop.hidden = false;
      root.hidden = false;
      if (SUPPORTS_POPOVER) {
        try {
          root.showPopover();
        } catch (e) {
          /* already open, or unsupported at runtime */
        }
      }

      // Force a paint of the off-screen transform before flipping to open, or the
      // browser coalesces both style changes into one and the slide never runs.
      // Under reduced motion the transform is already 0, so this costs nothing.
      void root.offsetHeight;

      root.setAttribute('data-ac-open', 'true');
      for (var i = 0; i < triggers.length; i++) {
        triggers[i].setAttribute('aria-expanded', 'true');
      }

      if (modal) {
        modalDepth++;
        // scrollbar-gutter in the CSS is what stops this shifting the layout
        // sideways as the scrollbar disappears.
        document.documentElement.setAttribute('data-ac-drawer-lock', 'true');
        document.addEventListener('keydown', onTrapKeydown, true);
      }

      document.addEventListener('keydown', onEscape, true);

      // Focus something inside, or the user is told a panel opened and left
      // standing outside it. First focusable, else the panel itself.
      var items = focusable();
      if (items.length) {
        items[0].focus();
      } else {
        root.tabIndex = -1;
        root.focus();
      }

      if (typeof settings.onOpen === 'function') settings.onOpen();
    }

    function close(restoreFocus) {
      if (!isOpen()) return;

      // Move focus out BEFORE hiding: hiding the element that holds focus drops it
      // to <body>, and the user loses their place in the page entirely.
      if (restoreFocus !== false && returnFocusTo && returnFocusTo.isConnected) {
        returnFocusTo.focus();
      }

      if (SUPPORTS_POPOVER) {
        try {
          root.hidePopover();
        } catch (e) {
          /* already closed */
        }
      }
      root.hidden = true;
      if (backdrop) backdrop.hidden = true;
      root.removeAttribute('data-ac-open');

      for (var i = 0; i < triggers.length; i++) {
        triggers[i].setAttribute('aria-expanded', 'false');
      }

      if (modal) {
        modalDepth = Math.max(0, modalDepth - 1);
        // Only the last one out unlocks, or a nested drawer would free the page
        // while its parent is still open.
        if (modalDepth === 0) {
          document.documentElement.removeAttribute('data-ac-drawer-lock');
        }
        document.removeEventListener('keydown', onTrapKeydown, true);
      }

      document.removeEventListener('keydown', onEscape, true);

      if (typeof settings.onClose === 'function') settings.onClose();
    }

    function onEscape(event) {
      if (event.key !== 'Escape') return;
      // A non-modal drawer must not swallow Escape from the rest of the page — the
      // user may be dismissing something else entirely. A modal one always reacts,
      // since focus is trapped inside it anyway.
      if (!modal && !root.contains(document.activeElement)) return;
      event.preventDefault();
      // Stop it here so a surrounding dialog does not also close.
      event.stopPropagation();
      close();
    }

    function onTriggerClick(event) {
      if (isOpen()) close();
      else open(event.currentTarget);
    }

    function onCloseClick() {
      close();
    }

    function onBackdropClick() {
      close();
    }

    for (var t = 0; t < triggers.length; t++) {
      triggers[t].addEventListener('click', onTriggerClick);
      triggers[t].setAttribute('aria-expanded', String(isOpen()));
      if (!triggers[t].getAttribute('aria-controls')) {
        triggers[t].setAttribute('aria-controls', id);
      }
    }

    for (var c = 0; c < closers.length; c++) {
      closers[c].addEventListener('click', onCloseClick);
    }

    if (backdrop) backdrop.addEventListener('click', onBackdropClick);

    // Closed to start with, but readable without JS: the markup ships `hidden`
    // only if you want it hidden pre-script. Either way the state is explicit.
    root.hidden = true;
    root.removeAttribute('data-ac-open');

    /* === [CORE] API ======================================================= */

    var api = {
      open: function () {
        open(null);
      },
      close: close,
      /** @returns {boolean} */
      isOpen: isOpen,
      /** True when this drawer is modal: backdrop, scroll lock and focus trap. */
      isModal: modal,
      element: root,
      destroy: function () {
        close(false);
        for (var i = 0; i < triggers.length; i++) {
          triggers[i].removeEventListener('click', onTriggerClick);
          triggers[i].removeAttribute('aria-expanded');
        }
        for (var j = 0; j < closers.length; j++) {
          closers[j].removeEventListener('click', onCloseClick);
        }
        if (backdrop) {
          backdrop.removeEventListener('click', onBackdropClick);
          backdrop.remove();
        }
        document.removeEventListener('keydown', onEscape, true);
        document.removeEventListener('keydown', onTrapKeydown, true);
        root.hidden = false;
        delete root._acDrawer;
      },
    };

    root._acDrawer = api;
    return api;
  }

  global.AC = global.AC || {};
  global.AC.createDrawer = createDrawer;

  /* === [AUTO-INIT] delete this block if you construct instances yourself === */
  function initAll(scope) {
    (scope || document).querySelectorAll('[data-ac-drawer]').forEach(function (el) {
      createDrawer(el);
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
