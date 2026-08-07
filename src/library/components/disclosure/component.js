/* =============================================================================
   DISCLOSURE

   WHAT TO COPY
     [CORE]       examples 1 to 3, and the whole component. The factory: ids,
                  aria-expanded, aria-controls, and the panel's hidden state.
     [PAGE]       examples 4 to 7. This page wiring its four mistakes by hand,
                  because createDisclosure would repair three of them on sight.
                  Not component code — delete it.
     [AUTO-INIT]  delete if you construct instances yourself.

   Copy [CORE] and [AUTO-INIT] for the component. The rest is this page proving
   its own claims and can go.

   Two decisions are worth the words:

     There is no keydown handler, anywhere. The trigger is a <button>, so Enter
     and Space already fire a click, and a key handler beside them would double
     every activation. That is the reason the element matters more than the
     ARIA does.

     Ids are minted only where the markup has none, so hand-written ids survive.
     aria-controls is then written from the panel's real id rather than typed
     twice — example 7 is what typing it twice costs.

   No dependencies. Plain IIFE, so a paste into a <script> tag works.
   ============================================================================= */
(function (global) {
  'use strict';

  /* === [CORE] ============================================================== */

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

    // Read off the panel rather than copied from the markup, so the pair cannot
    // come apart when one of the two ids is renamed later.
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
      // The attribute goes on the control, never on the region: it is the
      // button's state, and the button is what a reader is standing on.
      trigger.setAttribute('aria-expanded', String(open));
      // hidden, never a stylesheet. It takes the panel out of the accessibility
      // tree and out of the tab order at the same moment it leaves the screen.
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

  /* === [PAGE] examples 4 to 7 — delete this ===============================
     Four mistakes, each wired by hand. Passing any of them to createDisclosure
     would fix three on the spot, which is the argument for the factory and the
     reason none of them can use it.

     Every readout below is measured from the DOM at load and after each press.
     Nothing here asserts anything the page cannot show. */

  var FOCUSABLE =
    'a[href], button, input, select, textarea, summary, [tabindex]:not([tabindex="-1"])';

  /** @param {HTMLElement} root element carrying [data-ac-disclosure-page] */
  function createDisclosurePage(root) {
    if (!root || root._acDisclosurePage) return root && root._acDisclosurePage;

    var cases = [];

    /**
     * Write a message into a status line.
     * @param {HTMLElement} node the pre-existing role="status"
     * @param {string} text
     * @param {boolean} [bad] mark it as the failing case
     */
    function say(node, text, bad) {
      if (!node) return;
      node.textContent = text;
      // Written as well as colored: the color is gone under forced colors, and
      // it was never the thing carrying the meaning (SC 1.4.1).
      if (bad) node.setAttribute('data-ac-disc-bad', 'true');
      else node.removeAttribute('data-ac-disc-bad');
    }

    /** Tab stops inside an element, asked of the DOM rather than assumed. */
    function stops(el) {
      if (!el) return 0;
      return el.querySelectorAll(FOCUSABLE).length;
    }

    /**
     * @param {string} key the data-ac-disc-case value
     * @param {(parts: { frame: HTMLElement, trigger: HTMLElement, panel: HTMLElement,
     *   out: (name: string) => HTMLElement, verdict: HTMLElement }) => void} wire
     */
    function wireCase(key, wire) {
      var frame = root.querySelector('[data-ac-disc-case="' + key + '"]');
      if (!frame) return;

      wire({
        frame: frame,
        trigger: frame.querySelector('[data-ac-disc-trigger]'),
        panel: frame.querySelector('[data-ac-disc-panel]'),
        out: function (name) {
          return frame.querySelector('[data-ac-disc-out="' + name + '"]');
        },
        verdict: frame.querySelector('[data-ac-disc-verdict]'),
      });
    }

    /** Register a click handler and remember how to take it back off. */
    function onClick(el, handler) {
      if (!el) return;
      el.addEventListener('click', handler);
      cases.push(function () {
        el.removeEventListener('click', handler);
      });
    }

    /* --- example 4 · aria-expanded on the panel ---------------------------- */

    wireCase('panel-state', function (parts) {
      function read() {
        var onButton = parts.trigger.getAttribute('aria-expanded');
        parts.out('trigger').textContent = onButton === null ? 'no aria-expanded' : onButton;
        parts.out('panel').textContent =
          'aria-expanded=' + parts.panel.getAttribute('aria-expanded');
        say(
          parts.verdict,
          'The state is on the region. Standing on the button a reader hears "Payment method, ' +
            'button" and nothing about a panel, open or closed.',
          true,
        );
      }

      onClick(parts.trigger, function () {
        var open = parts.panel.hidden;
        parts.panel.hidden = !open;
        parts.panel.setAttribute('aria-expanded', String(open));
        read();
      });

      read();
      cases.push(function () {
        say(parts.verdict, '');
      });
    });

    /* --- example 5 · panel hidden with CSS --------------------------------- */

    wireCase('css-hidden', function (parts) {
      var CLOSED = 'ac-disclosure__panel--css-closed';

      function read() {
        var closed = parts.panel.classList.contains(CLOSED);
        var inside = stops(parts.panel);

        parts.out('height').textContent =
          Math.round(parts.panel.getBoundingClientRect().height) + 'px';
        parts.out('stops').textContent = String(inside);

        say(
          parts.verdict,
          closed
            ? 'Closed, 0px tall, and still holding ' +
                inside +
                (inside === 1 ? ' tab stop' : ' tab stops') +
                '. The keyboard goes in and the page will not scroll to where it lands.'
            : 'Open. Same panel, same link, now where a sighted reader can see it too.',
          closed,
        );
      }

      onClick(parts.trigger, function () {
        var closed = parts.panel.classList.toggle(CLOSED);
        parts.trigger.setAttribute('aria-expanded', String(!closed));
        read();
      });

      // After layout, or the height is measured before the box exists.
      if (typeof global.requestAnimationFrame === 'function') global.requestAnimationFrame(read);
      else read();

      cases.push(function () {
        say(parts.verdict, '');
      });
    });

    /* --- example 6 · a div as the trigger ---------------------------------- */

    wireCase('div-trigger', function (parts) {
      function read() {
        parts.out('element').textContent = '<' + parts.trigger.tagName.toLowerCase() + '>';
        parts.out('stops').textContent = String(stops(parts.frame));
      }

      onClick(parts.trigger, function () {
        var open = parts.panel.hidden;
        parts.panel.hidden = !open;
        // Only so the chevron and the tint match a working one. The div has no
        // aria-expanded to hang them off, which is half of what is wrong here.
        parts.trigger.setAttribute('data-ac-disc-open', String(open));
        read();
        say(
          parts.verdict,
          'The div ran, from a pointer. It has no role, no tab stop and no accessible name, so ' +
            'no keyboard and no screen reader ever gets here.',
          true,
        );
      });

      read();
      say(
        parts.verdict,
        'Nothing in this example is in the tab order. Press the row with a mouse and it opens.',
        true,
      );

      cases.push(function () {
        say(parts.verdict, '');
      });
    });

    /* --- example 7 · aria-controls naming an id nobody built --------------- */

    wireCase('dangling', function (parts) {
      function read() {
        var names = parts.trigger.getAttribute('aria-controls');
        parts.out('controls').textContent = names;
        parts.out('target').textContent = document.getElementById(names)
          ? 'found'
          : 'nothing on this page has that id';

        say(
          parts.verdict,
          'The panel below is ' +
            parts.panel.id +
            '. The shortcut a screen reader offers for jumping to the controlled region goes ' +
            'nowhere, and nothing on screen says so.',
          true,
        );
      }

      onClick(parts.trigger, function () {
        var open = parts.panel.hidden;
        parts.panel.hidden = !open;
        parts.trigger.setAttribute('aria-expanded', String(open));
        read();
      });

      read();
      cases.push(function () {
        say(parts.verdict, '');
      });
    });

    var api = {
      destroy: function () {
        cases.forEach(function (undo) {
          undo();
        });
        cases = [];
        delete root._acDisclosurePage;
      },
    };

    root._acDisclosurePage = api;
    return api;
  }

  global.AC.createDisclosurePage = createDisclosurePage;

  /* === [AUTO-INIT] delete this block if you construct instances yourself === */
  function initAll(scope) {
    var host = scope || document;
    host.querySelectorAll('[data-ac-disclosure]').forEach(function (el) {
      createDisclosure(el);
    });
    host.querySelectorAll('[data-ac-disclosure-page]').forEach(function (el) {
      createDisclosurePage(el);
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
