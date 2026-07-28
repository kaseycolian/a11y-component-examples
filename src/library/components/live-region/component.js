/* ===========================================================================
   LIVE REGION

   WHAT TO COPY
     [CORE]      AC.speak(element, text) — nine lines, and the fix for the bug
                 in example 5. Needed by examples 1, 3, 4 and 5.
     [ANNOUNCER] example 2. AC.createAnnouncer() for messages that belong to no
                 element. Depends on [CORE].
     [THROTTLE]  example 4. A status wired to a control that changes fast.
     [LOG]       example 5. Appending to a role="log".
     [BROKEN]    example 3. Three regions that never announce. Never copy this.
     [DEMO]      the buttons on this page. Delete it.
     [AUTO-INIT] delete if you construct instances yourself.

   Unlike every other component here this one exports no create<Name>(root):
   its product is a message, not an element. AC.speak() writes to a region you
   already have; AC.createAnnouncer() makes the pair of regions you do not.

   The whole component is two decisions.

   A screen reader announces a *change* to a region it is already watching, so
   the region has to exist, unhidden, before the text does — and setting a
   region to the string it already holds is not a change, so the second press of
   a Copy button is silent. Both are fixed by clearing and then writing a frame
   later, which is all AC.speak() is.

   Two frames, not one: requestAnimationFrame runs before the next paint, so a
   single one can still batch the clear and the write into the same reported
   state. Waiting for the frame after that guarantees the empty state was
   observed. In a hidden tab rAF does not run at all, so a message sent from a
   background tab is announced when the tab comes back — which is when there is
   anyone to hear it.

   No dependencies. Plain IIFE, so a paste into a <script> tag works.
   =========================================================================== */
(function (global) {
  'use strict';

  /* === [CORE] ============================================================ */

  /**
   * Write `text` into an existing live region so that it is announced even when
   * it is the same text the region already holds.
   *
   * @param {HTMLElement} el an element already carrying role="status",
   *   role="alert" or aria-live. It must be in the document and not hidden.
   * @param {string} text
   * @returns {number} the frame handle, so a caller can cancel a pending write
   */
  function speak(el, text) {
    if (!el) return 0;

    // Clear first. Without this, assigning the same string twice changes
    // nothing and announces nothing.
    el.textContent = '';

    return requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        el.textContent = text;
      });
    });
  }

  /* === [ANNOUNCER] example 2 =============================================
     One pair of regions, minted once and kept for the life of the page, for
     messages with no element of their own: a background save, a dropped
     socket, the result of a keyboard shortcut.

     Both regions are made and inserted here, at construction, and stay empty.
     Creating one at the moment there is something to say is the failure in
     example 3. */

  /** How long a message sits in the region before it is cleared out. */
  var CLEAR_MS = 7000;

  /**
   * @param {object} [options]
   * @param {HTMLElement} [options.root=document.body] where the regions are put
   * @param {number} [options.clearMs] 0 leaves messages in place
   * @returns {{announce: Function, destroy: Function, element: HTMLElement}}
   */
  function createAnnouncer(options) {
    var settings = options || {};
    var root = settings.root || document.body;

    // Idempotent, and deliberately so: an announcer is meant to be fetched
    // wherever a message happens rather than threaded through the app, and two
    // sets of regions would announce everything twice.
    if (root._acAnnouncer) return root._acAnnouncer;

    var clearMs = typeof settings.clearMs === 'number' ? settings.clearMs : CLEAR_MS;

    function region(role) {
      var el = document.createElement('p');
      el.className = 'ac-lr-clipped';
      el.setAttribute('role', role);
      root.appendChild(el);
      return el;
    }

    var polite = region('status');
    var assertive = region('alert');

    var frame = 0;
    var timer = null;

    var api = {
      /** Both regions, for a page that wants to mirror them. */
      element: polite,
      assertiveElement: assertive,

      /**
       * @param {string} text
       * @param {object} [opts]
       * @param {boolean} [opts.assertive] interrupt instead of queueing. For
       *   messages that are useless a few seconds later, and nothing else.
       */
      announce: function (text, opts) {
        var target = opts && opts.assertive ? assertive : polite;

        // One message at a time. A pending write from the last call would
        // otherwise land on top of this one a frame later.
        if (frame) cancelAnimationFrame(frame);
        if (timer) clearTimeout(timer);
        polite.textContent = '';
        assertive.textContent = '';

        frame = speak(target, text);

        // Clearing a region announces nothing, so this is free — and a region
        // still holding a message from four screens ago describes nothing.
        if (clearMs) {
          timer = setTimeout(function () {
            target.textContent = '';
          }, clearMs);
        }
      },

      destroy: function () {
        if (frame) cancelAnimationFrame(frame);
        if (timer) clearTimeout(timer);
        if (polite.parentNode) polite.parentNode.removeChild(polite);
        if (assertive.parentNode) assertive.parentNode.removeChild(assertive);
        delete root._acAnnouncer;
      },
    };

    root._acAnnouncer = api;
    return api;
  }

  global.AC = global.AC || {};
  global.AC.speak = speak;
  global.AC.createAnnouncer = createAnnouncer;

  /* === [DEMO] the buttons on this page — delete this whole block ==========
     Everything below wires the five examples up. The patterns inside [THROTTLE]
     and [LOG] are real; the plumbing that finds the buttons is not. */

  /** Example 4. How long typing has to stop before the status speaks. */
  var IDLE_MS = 900;
  /** Example 4. Above this many guests the message changes. */
  var CROWD = 20;
  /** Example 5. */
  var LOG_LINES = [
    'Kick drum, one.',
    'Snare, two.',
    'Guitar up 3 dB.',
    'Monitor two is feeding back.',
    'Vocals, check.',
  ];

  function wire(root) {
    if (!root || root._acLiveRegionDemo) return root && root._acLiveRegionDemo;

    var frames = [];
    var timers = [];
    var injected = null;
    var logIndex = 0;

    function say(el, text) {
      frames.push(speak(el, text));
    }

    /* --- examples 1 and 2 ---------------------------------------------- */

    var announcer = createAnnouncer();
    var mirror = root.querySelector('[data-ac-announcer-mirror]');

    // The mirror is aria-hidden in the markup, so it repeats the region on
    // screen without being a second thing to read.
    var watch = new MutationObserver(function () {
      mirror.textContent =
        announcer.assertiveElement.textContent || announcer.element.textContent || '—';
    });

    if (mirror) {
      mirror.textContent = '—';
      [announcer.element, announcer.assertiveElement].forEach(function (region) {
        watch.observe(region, { childList: true, characterData: true, subtree: true });
      });
    }

    function onClick(event) {
      var btn = event.target.closest('button');
      if (!btn || !root.contains(btn)) return;

      // Example 1 — write to a region already on the page.
      if (btn.hasAttribute('data-ac-announce')) {
        say(
          root.querySelector('#' + btn.getAttribute('data-ac-target')),
          btn.getAttribute('data-ac-announce'),
        );
        return;
      }

      // Example 2 — hand it to the announcer instead.
      if (btn.hasAttribute('data-ac-announcer')) {
        announcer.announce(btn.getAttribute('data-ac-announcer'), {
          assertive: btn.hasAttribute('data-ac-assertive'),
        });
        return;
      }

      if (btn.hasAttribute('data-ac-fail')) return fail(btn.getAttribute('data-ac-fail'));
      if (btn.hasAttribute('data-ac-repeat')) return repeat(btn.getAttribute('data-ac-repeat'));
      if (btn.hasAttribute('data-ac-log')) return addLogLine();
    }

    /* === [BROKEN] example 3 — three regions that never announce ==========
       Every one of these leaves the right text in the DOM. That is what makes
       them expensive: nothing you can look at says anything is wrong. */

    function fail(which) {
      var el;
      var verdict;

      if (which === 'inject') {
        // The region and its text arrive together, so there was never a change
        // to notice. Replaces the last one, or this page would grow forever.
        if (injected) injected.parentNode.removeChild(injected);
        injected = document.createElement('p');
        injected.className = 'ac-lr-region ac-lr-region--broken';
        injected.setAttribute('role', 'status');
        injected.textContent = 'Sold out.';
        root.querySelector('[data-ac-fail-slot="inject"]').appendChild(injected);
        el = injected;
        verdict = 'created already full, so nothing changed';
      } else if (which === 'hidden') {
        // display: none keeps it out of the accessibility tree, so nothing is
        // watching it. Unhiding it and filling it together fails the same way
        // as the case above.
        el = root.querySelector('#lr-fail-hidden');
        el.textContent = 'Sold out.';
        verdict = 'the region is display: none';
      } else {
        // Cleared and re-set inside one frame. The browser reports the state it
        // last painted, and the empty one was never painted.
        el = root.querySelector('#lr-fail-sametick');
        var wasEmpty = el.textContent === '';
        el.textContent = '';
        el.textContent = 'Sold out.';
        verdict = wasEmpty
          ? 'announced — the region really was empty. Press it again.'
          : 'unchanged since the last press, so silent';
      }

      var out = root.querySelector('[data-ac-fail-mirror="' + which + '"]');
      if (out) out.textContent = '"' + el.textContent + '" — ' + verdict;
    }

    /* === [THROTTLE] example 4 ============================================
       Two copies of the same number on two different clocks. The visible one
       moves per keystroke, because that is readable. The announced one waits
       for a pause, because a region wired to every keystroke reads a stream of
       numbers over the top of itself. */

    var guests = root.querySelector('[data-ac-guests]');
    var guestCount = root.querySelector('[data-ac-guests-count]');
    var guestStatus = root.querySelector('[data-ac-guests-status]');
    var idle = null;

    function guestWords(n) {
      if (n > CROWD) return n + ' on the list — past the ' + CROWD + ' the room holds.';
      return n + ' on the list.';
    }

    function onGuestInput() {
      var n = parseInt(guests.value, 10);
      if (isNaN(n)) n = 0;

      guestCount.textContent = n + ' on the list';

      if (idle) clearTimeout(idle);
      idle = setTimeout(function () {
        say(guestStatus, guestWords(n));
      }, IDLE_MS);
      timers.push(idle);
    }

    if (guests) guests.addEventListener('input', onGuestInput);

    /* --- example 5, the repeat ------------------------------------------ */

    function repeat(which) {
      var el = root.querySelector('#lr-repeat');
      // Same visible result, same string, both times.
      if (which === 'naive') el.textContent = 'Copied.';
      else say(el, 'Copied.');
    }

    /* === [LOG] example 5 =================================================
       A log appends and a status replaces — that is the whole difference. Each
       new child is read as it arrives, so the same line twice is announced
       twice, and the earlier ones stay put to be read back. */

    function addLogLine() {
      var line = document.createElement('li');
      line.textContent = LOG_LINES[logIndex % LOG_LINES.length];
      logIndex += 1;
      root.querySelector('#lr-log').appendChild(line);
    }

    root.addEventListener('click', onClick);

    var api = {
      destroy: function () {
        root.removeEventListener('click', onClick);
        if (guests) guests.removeEventListener('input', onGuestInput);
        watch.disconnect();
        frames.forEach(cancelAnimationFrame);
        timers.forEach(clearTimeout);
        if (injected && injected.parentNode) injected.parentNode.removeChild(injected);
        announcer.destroy();
        delete root._acLiveRegionDemo;
      },
    };

    root._acLiveRegionDemo = api;
    return api;
  }

  /* === [AUTO-INIT] delete this block if you construct instances yourself === */
  function initAll(scope) {
    (scope || document).querySelectorAll('[data-ac-live-region]').forEach(function (el) {
      wire(el);
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
