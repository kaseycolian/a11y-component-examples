/* =============================================================================
   Disclosure

   Wires a button to the panel it shows and hides. No dependencies.

   Vanilla:   drop this file in with <script src="component.js"></script>.
              Anything with [data-ac-disclosure] is wired up automatically.

   Framework: delete the auto-init block at the bottom and call the factory
              from your own lifecycle:

                const d = AC.createDisclosure(ref.current);
                // ...on unmount:
                d.destroy();
   ============================================================================= */
(function (global) {
  'use strict';

  var uid = 0;

  /**
   * @param {HTMLElement} root  element carrying [data-ac-disclosure]
   * @param {{ open?: boolean, onToggle?: (open: boolean) => void }} [options]
   */
  function createDisclosure(root, options) {
    // Idempotent: initializing twice would double up the listeners.
    if (!root || root._acDisclosure) return root && root._acDisclosure;

    var settings = options || {};
    var trigger = root.querySelector('.ac-disclosure__trigger');
    var panel = root.querySelector('.ac-disclosure__panel');

    if (!trigger || !panel) {
      throw new Error('createDisclosure: expected a .ac-disclosure__trigger and a .ac-disclosure__panel inside the root');
    }

    // Only mint ids that are not already there, so hand-written markup keeps
    // whatever ids it declared. The counter keeps multiple instances distinct.
    var id = 'ac-disclosure-' + ++uid;
    if (!panel.id) panel.id = id + '-panel';
    if (!trigger.id) trigger.id = id + '-trigger';

    trigger.setAttribute('aria-controls', panel.id);
    // Ties the panel back to its trigger, so a screen reader landing inside the
    // panel can still say which section it belongs to.
    if (!panel.hasAttribute('aria-labelledby')) {
      panel.setAttribute('aria-labelledby', trigger.id);
    }

    function isOpen() {
      return trigger.getAttribute('aria-expanded') === 'true';
    }

    function setOpen(open) {
      trigger.setAttribute('aria-expanded', String(open));
      panel.hidden = !open;
      if (typeof settings.onToggle === 'function') settings.onToggle(open);
    }

    function toggle() {
      setOpen(!isOpen());
    }

    // The panel is visible in the source so it still reads without JavaScript.
    // Closing it here (rather than shipping hidden markup) is what stops the
    // content flashing open before the script runs.
    var startOpen =
      typeof settings.open === 'boolean' ? settings.open : root.hasAttribute('data-ac-open');
    setOpen(startOpen);

    // A real <button> handles Enter and Space itself -- no keydown handler.
    trigger.addEventListener('click', toggle);

    var api = {
      /** @returns {boolean} */
      isOpen: isOpen,
      open: function () {
        setOpen(true);
      },
      close: function () {
        setOpen(false);
      },
      toggle: toggle,
      destroy: function () {
        trigger.removeEventListener('click', toggle);
        panel.hidden = false;
        trigger.removeAttribute('aria-expanded');
        delete root._acDisclosure;
      },
    };

    root._acDisclosure = api;
    return api;
  }

  global.AC = global.AC || {};
  global.AC.createDisclosure = createDisclosure;

  /* --- Auto-init. Delete this block if you initialize manually. ------------- */
  function initAll(scope) {
    (scope || document).querySelectorAll('[data-ac-disclosure]').forEach(function (el) {
      createDisclosure(el);
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
