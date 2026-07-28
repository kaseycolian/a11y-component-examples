/* ===========================================================================
   TOOLTIP

   WHAT TO COPY
     [PLACE]      shared by both factories. Coordinates, flipping, clamping.
     [CORE]       examples 1, 2 and 5. AC.createTooltip.
     [TOGGLETIP]  example 4. AC.createToggletip.
     [AUTO-INIT]  delete if you construct instances yourself.

   Example 3 needs none of this — it is the native `title` attribute, kept as a
   comparison.

   Copy the file whole for the library version.

   Four decisions that are the reason this file is not five lines:

   SC 1.4.13 asks for hoverable, and a bubble with a gap under the trigger is not
   hoverable unless leaving is *delayed*. The pointer has to be able to cross
   from one to the other. So closing waits, and the bubble's own pointerenter
   cancels the wait.

   Esc has to dismiss with the pointer still on the trigger — which means
   dismissal is a third state, not the absence of hover. It is remembered until
   the pointer leaves or focus moves, or the tooltip would reappear immediately.

   Focus opens it only when the focus is *visible*, so clicking a button does not
   also fire a tooltip at the person who clicked it.

   Touch is filtered out by pointerType. Synthetic mouse events after a tap would
   otherwise leave a bubble stuck open with no way to dismiss it.

   No dependencies. Plain IIFE, so a paste into a <script> tag works.
   =========================================================================== */
(function (global) {
  'use strict';

  // Pointer only. A short wait keeps tooltips from flashing as the pointer
  // sweeps across a row of triggers. Focus is instant: a keyboard user arriving
  // at the control has already committed to it.
  var OPEN_DELAY = 120;

  // The hoverable half of SC 1.4.13 — long enough to cross the gap between the
  // trigger and the bubble. This is a grace period, not an animation, so it is
  // not gated on reduced motion.
  var CLOSE_DELAY = 180;

  var GAP = 8; // trigger to bubble
  var EDGE = 8; // bubble to viewport
  var uid = 0;

  /* === [PLACE] coordinates, flipping, clamping ===========================
     The bubble is position: fixed, so these are viewport coordinates and no
     ancestor's overflow can clip it. Shared by both factories below. */

  function place(trigger, bubble) {
    var t = trigger.getBoundingClientRect();

    // Measure in the default placement, or a bubble left flipped from last time
    // reports the wrong height.
    bubble.classList.remove('ac-tooltip--above');
    var b = bubble.getBoundingClientRect();

    var top = t.bottom + GAP;
    var above = t.top - GAP - b.height;
    // Flip only if there is room up there. A bubble squeezed off the top edge is
    // worse than one that overflows the bottom, which the page can scroll to.
    if (top + b.height > window.innerHeight - EDGE && above >= EDGE) {
      top = above;
      bubble.classList.add('ac-tooltip--above');
    }

    var center = t.left + t.width / 2;
    var left = Math.min(
      Math.max(center - b.width / 2, EDGE),
      Math.max(window.innerWidth - EDGE - b.width, EDGE),
    );

    bubble.style.top = Math.round(top) + 'px';
    bubble.style.left = Math.round(left) + 'px';

    // Keep the arrow pointing at the trigger after the clamp, but never let it
    // slide past the rounded corner.
    var arrow = Math.min(Math.max(center - left, 12), Math.max(b.width - 12, 12));
    bubble.style.setProperty('--ac-tooltip-arrow-x', Math.round(arrow) + 'px');
  }

  /* === [CORE] examples 1, 2 and 5 ======================================== */

  /**
   * @param {HTMLElement} root element carrying [data-ac-tooltip]
   * @param {{ openDelay?: number, closeDelay?: number }} [options]
   */
  function createTooltip(root, options) {
    // Idempotent: initializing twice would double up the listeners.
    if (!root || root._acTooltip) return root && root._acTooltip;

    var settings = options || {};
    var openDelay = typeof settings.openDelay === 'number' ? settings.openDelay : OPEN_DELAY;
    var closeDelay = typeof settings.closeDelay === 'number' ? settings.closeDelay : CLOSE_DELAY;

    var trigger =
      root.querySelector('[data-ac-tooltip-trigger]') ||
      root.querySelector('button, a[href], input, select, textarea, [tabindex]');
    var tip = root.querySelector('[role="tooltip"]') || root.querySelector('.ac-tooltip');
    if (!trigger || !tip) return null;

    // Mint an id and wire the relationship if the markup did not. Left alone if
    // it did, because which relationship it is matters: aria-describedby for a
    // named trigger, aria-labelledby when the bubble *is* the name.
    if (!tip.id) tip.id = 'ac-tooltip-' + ++uid;
    var refs = (
      (trigger.getAttribute('aria-describedby') || '') +
      ' ' +
      (trigger.getAttribute('aria-labelledby') || '')
    ).split(/\s+/);
    var wired = refs.indexOf(tip.id) > -1;
    if (!wired) trigger.setAttribute('aria-describedby', tip.id);

    // The bubble is never focusable and never a tab stop. There is nothing in it
    // to operate, and focus landing there would be a dead end.
    tip.removeAttribute('tabindex');
    tip.hidden = true;

    var hovering = false;
    var focused = false;
    var dismissed = false; // Esc, remembered until the user leaves and returns
    var shown = false;
    var timer = null;

    function reposition() {
      if (shown) place(trigger, tip);
    }

    function open() {
      if (shown) return;
      // Unhidden first: it has to be laid out before it can be measured.
      tip.hidden = false;
      shown = true;
      place(trigger, tip);
      // Only while open, so a page of triggers is not a page of listeners.
      // Capture on scroll, so scrolling an inner container counts too.
      window.addEventListener('scroll', reposition, true);
      window.addEventListener('resize', reposition);
      document.addEventListener('keydown', onKeydown, true);
    }

    function close() {
      if (!shown) return;
      shown = false;
      tip.hidden = true;
      tip.classList.remove('ac-tooltip--above');
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
      document.removeEventListener('keydown', onKeydown, true);
    }

    /** @param {number} delay 0 to act now */
    function sync(delay) {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      var should = (hovering || focused) && !dismissed;
      if (should === shown) {
        reposition();
        return;
      }
      if (!delay) {
        if (should) open();
        else close();
        return;
      }
      timer = setTimeout(function () {
        timer = null;
        if (should) open();
        else close();
      }, delay);
    }

    function onPointerEnter(event) {
      // Filtered, not supported: a tap fires synthetic mouse events, and the
      // bubble would stick open with no pointerleave ever coming.
      if (event.pointerType === 'touch') return;
      hovering = true;
      sync(openDelay);
    }

    function onPointerLeave() {
      hovering = false;
      // Leaving is what re-arms Esc. Without this the tooltip would stay
      // dismissed for the rest of the page's life.
      if (!focused) dismissed = false;
      sync(closeDelay);
    }

    // The bubble's own hover is the other half of "hoverable": entering it
    // cancels the pending close.
    function onTipEnter() {
      hovering = true;
      sync(0);
    }

    function onFocus() {
      // :focus-visible so a mouse click on the trigger does not also open the
      // tooltip at the person who just clicked it.
      var visible = true;
      try {
        visible = trigger.matches(':focus-visible');
      } catch (error) {
        // Older engine with no :focus-visible. Showing it is the safe default.
      }
      if (!visible) return;
      focused = true;
      sync(0);
    }

    function onBlur() {
      focused = false;
      if (!hovering) dismissed = false;
      sync(0);
    }

    function onKeydown(event) {
      if (event.key !== 'Escape' && event.key !== 'Esc') return;
      dismissed = true;
      sync(0);
      // Consumed, so an enclosing dropdown or drawer does not also close on the
      // same keystroke. Capture phase, or the enclosing handler runs first.
      event.stopPropagation();
    }

    trigger.addEventListener('pointerenter', onPointerEnter);
    trigger.addEventListener('pointerleave', onPointerLeave);
    trigger.addEventListener('focus', onFocus);
    trigger.addEventListener('blur', onBlur);
    tip.addEventListener('pointerenter', onTipEnter);
    tip.addEventListener('pointerleave', onPointerLeave);

    var api = {
      element: root,
      trigger: trigger,
      tip: tip,
      /** @returns {boolean} */
      isOpen: function () {
        return shown;
      },
      /** Show it from code — for a walkthrough or a test. */
      show: function () {
        dismissed = false;
        focused = true;
        sync(0);
      },
      hide: function () {
        hovering = false;
        focused = false;
        sync(0);
      },
      destroy: function () {
        close();
        if (timer) clearTimeout(timer);
        trigger.removeEventListener('pointerenter', onPointerEnter);
        trigger.removeEventListener('pointerleave', onPointerLeave);
        trigger.removeEventListener('focus', onFocus);
        trigger.removeEventListener('blur', onBlur);
        tip.removeEventListener('pointerenter', onTipEnter);
        tip.removeEventListener('pointerleave', onPointerLeave);
        // Only the wiring this factory added: markup that already had it keeps it.
        if (!wired) trigger.removeAttribute('aria-describedby');
        delete root._acTooltip;
      },
    };

    root._acTooltip = api;
    return api;
  }

  /* === [TOGGLETIP] example 4 =============================================
     A different pattern with the same paint. It opens on click, so it works on
     touch, and it announces by inserting text into a live region that is
     already in the accessibility tree.

     No aria-expanded and no aria-describedby: the button is not described by
     what it reveals, and this is not a disclosure — the content is a message,
     not a region. */

  /**
   * @param {HTMLElement} root element carrying [data-ac-toggletip]
   * @param {object} [options]
   */
  function createToggletip(root, options) {
    if (!root || root._acToggletip) return root && root._acToggletip;

    var trigger =
      root.querySelector('[data-ac-toggletip-trigger]') || root.querySelector('button');
    var live = root.querySelector('[data-ac-toggletip-live]');
    if (!trigger || !live) return null;

    var source = root.querySelector('template[data-ac-toggletip-text]');
    var text = source
      ? source.content.textContent.trim()
      : trigger.getAttribute('data-ac-toggletip-text') || '';

    var bubble = null;

    function reposition() {
      if (bubble) place(trigger, bubble);
    }

    function open() {
      if (bubble) return;
      bubble = document.createElement('span');
      bubble.className = 'ac-tooltip';
      bubble.textContent = text;
      // Inserted into the live region, which is what announces it. The bubble
      // itself carries no role: role="tooltip" would claim it describes the
      // button, and it does not.
      live.appendChild(bubble);
      place(trigger, bubble);
      window.addEventListener('scroll', reposition, true);
      window.addEventListener('resize', reposition);
      document.addEventListener('keydown', onKeydown, true);
      document.addEventListener('pointerdown', onOutside, true);
    }

    function close() {
      if (!bubble) return;
      // Removing text from a live region announces nothing, which is right:
      // there is no news in a message going away.
      live.removeChild(bubble);
      bubble = null;
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
      document.removeEventListener('keydown', onKeydown, true);
      document.removeEventListener('pointerdown', onOutside, true);
    }

    function onClick() {
      if (bubble) close();
      else open();
    }

    function onKeydown(event) {
      if (event.key !== 'Escape' && event.key !== 'Esc') return;
      close();
      // Focus never moved, so there is nothing to put back — it is still on the
      // button, which is where the user left it.
      event.stopPropagation();
    }

    function onOutside(event) {
      if (!root.contains(event.target)) close();
    }

    trigger.addEventListener('click', onClick);

    var api = {
      element: root,
      trigger: trigger,
      /** @returns {boolean} */
      isOpen: function () {
        return !!bubble;
      },
      show: open,
      hide: close,
      destroy: function () {
        close();
        trigger.removeEventListener('click', onClick);
        delete root._acToggletip;
      },
    };

    root._acToggletip = api;
    return api;
  }

  global.AC = global.AC || {};
  global.AC.createTooltip = createTooltip;
  global.AC.createToggletip = createToggletip;

  /* === [AUTO-INIT] delete this block if you construct instances yourself === */
  function initAll(scope) {
    var where = scope || document;
    where.querySelectorAll('[data-ac-tooltip]').forEach(function (el) {
      createTooltip(el);
    });
    where.querySelectorAll('[data-ac-toggletip]').forEach(function (el) {
      createToggletip(el);
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
