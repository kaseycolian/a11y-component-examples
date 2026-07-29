/* ===========================================================================
   JUMP NAV

   WHAT TO COPY
     [CORE]        every example. The factory: which section is current, and
                   the one attribute that says so.
     [FOCUS]       the page's own probe — whether the browser will really give
                   an element focus. Example 2 is built on it.
     [LANDING]     example 2. What the jump focused, and what it cost.
     [CLEARANCE]   example 3. The overlap between the target and the bar.
     [COST]        example 4. Counting scroll events against section changes.
     [LANDMARKS]   example 5. What a landmark menu would list.
     [AUTO-INIT]   delete if you construct instances yourself.

   Copy [CORE] and [AUTO-INIT] for the component. The rest is this page
   checking its own claims and can go.

   Two decisions are worth the words:

     An IntersectionObserver, not a scroll handler. A scroll handler runs tens
     of times per flick and has to be throttled by hand; the observer only
     speaks when a section crosses the band, which is the event anyone
     actually wanted. Example 4 has both numbers.

     Nothing is announced. aria-current changes as a consequence of scrolling,
     and scrolling is not news — a live region here would read a heading out
     over whatever the reader was already listening to.

   The factory never adds tabindex="-1" to a target. That is in the markup, so
   the keyboard behaves the same before the script loads and after, and it is
   what makes example 2's failure possible in the first place.

   No dependencies. Plain IIFE, so a paste into a <script> tag works.
   =========================================================================== */
(function (global) {
  'use strict';

  /* === [CORE] ============================================================== */

  /**
   * @param {HTMLElement} root the <nav> carrying [data-ac-jump-nav]
   * @param {object} [options]
   * @param {Element} [options.scrollRoot] the scrolling box the sections live
   *   in. Also read from [data-ac-jump-root] as a selector. Omit for the page.
   * @param {string} [options.rootMargin] the band that counts as "here".
   *   Shrink the top by the height of a sticky header.
   * @returns {{current: Function, links: HTMLElement[], targets: Element[],
   *            destroy: Function}|null}
   */
  function createJumpNav(root, options) {
    // Idempotent: initializing twice would double up the observer.
    if (!root || root._acJumpNav) return root && root._acJumpNav;

    var settings = options || {};
    var links = Array.prototype.slice.call(root.querySelectorAll('a[href^="#"]'));
    if (!links.length) return null;

    var selector = root.getAttribute('data-ac-jump-root');
    var scrollRoot = settings.scrollRoot || (selector ? document.querySelector(selector) : null);

    // The band is the top 30% of the scrollport: the section whose heading is
    // in it is the one being read. A sticky header eats into it, so an app
    // with one passes "-<header height> 0px -70% 0px".
    var rootMargin = settings.rootMargin || root.getAttribute('data-ac-jump-margin') || '0px 0px -70% 0px';

    var targets = links.map(function (link) {
      var hash = link.getAttribute('href').slice(1);
      if (!hash) return null;
      try {
        hash = decodeURIComponent(hash);
      } catch (err) {
        /* a malformed escape is still a valid id */
      }
      return document.getElementById(hash);
    });

    var inBand = [];
    var passed = [];
    var current = null;

    function mark(target) {
      if (target === current) return;
      current = target;

      links.forEach(function (link, i) {
        // "location" is a position within the page you are on. "page" is a
        // link to the page you are on, and it is a different claim — Tabs'
        // example 5 has the two side by side.
        if (target && targets[i] === target) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });

      root.dispatchEvent(
        new CustomEvent('ac:jump-nav:change', {
          bubbles: true,
          detail: { target: target, link: links[targets.indexOf(target)] || null },
        }),
      );
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          var i = targets.indexOf(entry.target);
          if (i < 0) return;
          inBand[i] = entry.isIntersecting;
          passed[i] = !!entry.rootBounds && entry.boundingClientRect.top < entry.rootBounds.top;
        });

        var chosen = -1;
        for (var i = 0; i < targets.length; i++) {
          if (inBand[i]) {
            chosen = i;
            break;
          }
        }

        // Nothing in the band and nothing marked yet: a deep link, or a scroll
        // position the browser restored on reload. Fall back to the last
        // section already gone past. Once something is marked it stays marked
        // between two sections — you are still in the one you were reading.
        if (chosen < 0 && current === null) {
          for (var j = targets.length - 1; j >= 0; j--) {
            if (passed[j]) {
              chosen = j;
              break;
            }
          }
        }

        if (chosen >= 0) mark(targets[chosen]);
      },
      { root: scrollRoot, rootMargin: rootMargin, threshold: 0 },
    );

    targets.forEach(function (target) {
      if (target) observer.observe(target);
    });

    var api = {
      current: function () {
        return current;
      },
      links: links,
      targets: targets,
      destroy: function () {
        observer.disconnect();
        links.forEach(function (link) {
          link.removeAttribute('aria-current');
        });
        current = null;
        delete root._acJumpNav;
      },
    };

    root._acJumpNav = api;
    return api;
  }

  global.AC = global.AC || {};
  global.AC.createJumpNav = createJumpNav;

  /* ==========================================================================
     Everything below is this page checking its own claims. None of it is part
     of a jump nav; delete it all when you copy.
     ========================================================================== */

  function createJumpPage(root) {
    if (!root || root._acJumpPage) return root && root._acJumpPage;

    var cleanups = [];

    function on(el, type, fn, opts) {
      if (!el) return;
      el.addEventListener(type, fn, opts);
      cleanups.push(function () {
        el.removeEventListener(type, fn, opts);
      });
    }

    function say(key, text, bad) {
      var el = root.querySelector('[data-ac-jn-out="' + key + '"]');
      if (!el) return;
      el.textContent = text;
      if (bad) el.setAttribute('data-ac-jn-bad', 'true');
      else el.removeAttribute('data-ac-jn-bad');
    }

    function nameOf(el) {
      var labelledby = el.getAttribute('aria-labelledby');
      if (labelledby) {
        return labelledby
          .split(/\s+/)
          .map(function (part) {
            var source = document.getElementById(part);
            return source ? source.textContent : '';
          })
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
      }
      var label = el.getAttribute('aria-label');
      if (label) return label.trim();
      return (el.textContent || '').replace(/\s+/g, ' ').trim();
    }

    function roleOf(el) {
      var role = el.getAttribute('role');
      if (role) return role;
      var tag = el.tagName.toLowerCase();
      if (tag === 'a') return el.hasAttribute('href') ? 'link' : 'generic';
      if (/^h[1-6]$/.test(tag)) return 'heading';
      return tag;
    }

    /* A target that cannot take focus does not leave focus on the link. The
       browser runs the focusing steps for the document's viewport instead, so
       activeElement comes back as <body> and the next Tab starts at the top of
       the page rather than at the section that was asked for. */
    function describe(el) {
      if (!el || el === document.body) return '<body> — Tab restarts at the top of the page';
      return (nameOf(el) || 'no name') + ' (' + roleOf(el) + ')';
    }

    /** The resolved motion token, not matchMedia: the page's own toggle is
        invisible to the media query. Motion Preferences has the argument. */
    function motionOn(el) {
      var style = getComputedStyle(el);
      var value = style.getPropertyValue('--ac-motion') || style.getPropertyValue('--motion');
      return parseFloat(value) !== 0;
    }

    /** Run fn once the box has stopped scrolling.

        "Has not moved for three frames" is not enough on its own: a smooth
        scroll and a fragment jump both start *after* the frame the request was
        made in, so a naive settle fires while the box is still sitting at its
        old position and reports the state before the thing it was watching for.
        So a move has to have been seen, or twenty frames gone by without one.
        Capped either way — a scroll that never settles must not leave a
        readout saying "press a link". */
    function whenSettled(box, fn) {
      var start = box ? box.scrollTop : 0;
      var last = null;
      var still = 0;
      var frames = 0;
      var moved = false;

      (function tick() {
        var top = box ? box.scrollTop : 0;
        if (top !== start) moved = true;
        still = top === last ? still + 1 : 0;
        last = top;

        if ((still >= 3 && (moved || frames > 20)) || frames > 120) fn();
        else {
          frames += 1;
          requestAnimationFrame(tick);
        }
      })();
    }

    /* === [FOCUS] =========================================================
       Whether the browser will give this element focus — asked, not guessed.
       A selector can only list the elements that are usually focusable, and
       every case on this page is one that is unusually focusable or unusually
       not.

       focus() on something that cannot take it is a no-op rather than a move,
       so the probe has to blur and restore focus itself: skip the blur and a
       keyboard reader is left parked wherever the last probe landed. */

    function canFocus(el) {
      var previous = document.activeElement;
      if (el === previous) return true;

      el.focus({ preventScroll: true });
      var got = document.activeElement === el;

      if (got) {
        el.blur();
        if (previous && previous !== document.body && typeof previous.focus === 'function') {
          previous.focus({ preventScroll: true });
        }
      }
      return got;
    }

    var FOCUSABLE = 'a[href], button, input, select, textarea, summary, [tabindex], [contenteditable]';

    /** Everything the Tab key reaches inside `scope`, `scope` included.
        tabIndex < 0 is focusable but not tabbable, which is exactly the
        difference between example 2's two working cases. */
    function tabStops(scope) {
      var found = [];
      if (scope.tabIndex >= 0 && canFocus(scope)) found.push(scope);
      scope.querySelectorAll(FOCUSABLE).forEach(function (el) {
        if (el.disabled) return;
        if (el.tabIndex < 0) return;
        if (!canFocus(el)) return;
        found.push(el);
      });
      return found;
    }

    /* === [LANDING] ========================================================
       Example 2. The stop counts are taken once, at load: the markup does not
       change, and re-probing after a jump would move focus away from the
       heading the reader just landed on.

       The landing itself is read two frames after the click, because
       following a fragment is the click's default action and runs after the
       event has been dispatched. */

    var LAND_CASES = ['none', 'minus', 'zero'];

    function wireLanding() {
      LAND_CASES.forEach(function (key) {
        var box = root.querySelector('[data-ac-jn-land-case="' + key + '"]');
        if (!box) return;

        var doc = box.querySelector('.ac-jn-doc');
        var stops = tabStops(doc);
        say(
          'stops-' + key,
          stops.length + ' — ' + stops.map(describe).join(' · '),
          stops.length > 1,
        );

        on(box.querySelector('.ac-jump-nav'), 'click', function (event) {
          if (!event.target.closest('a[href^="#"]')) return;
          requestAnimationFrame(function () {
            requestAnimationFrame(function () {
              var active = document.activeElement;
              var landed = !!active && active.classList.contains('ac-jump-nav__target');
              say('land-' + key, describe(active), !landed);
            });
          });
        });
      });
    }

    /* === [CLEARANCE] ======================================================
       Example 3. SC 2.4.11, measured: the bar's bottom edge against the
       target's top edge. Both are viewport coordinates and both move with the
       page, so the difference holds however far down the page the demo is. */

    var CLEAR_CASES = ['under', 'clear'];

    function wireClearance() {
      CLEAR_CASES.forEach(function (key) {
        var box = root.querySelector('[data-ac-jn-clear-case="' + key + '"]');
        if (!box) return;

        var doc = box.querySelector('.ac-jn-doc');
        var bar = box.querySelector('[data-ac-jn-bar]');

        on(box.querySelector('.ac-jump-nav'), 'click', function (event) {
          var link = event.target.closest('a[href^="#"]');
          if (!link) return;
          var target = document.getElementById(link.getAttribute('href').slice(1));
          if (!target || !bar) return;

          whenSettled(doc, function () {
            var overlap = Math.round(bar.getBoundingClientRect().bottom - target.getBoundingClientRect().top);
            if (overlap > 0) say('clear-' + key, 'obscured by ' + overlap + 'px', true);
            else say('clear-' + key, 'clear by ' + Math.abs(overlap) + 'px');
          });
        });
      });
    }

    /* === [COST] ===========================================================
       Example 4. Both instruments on one document: every scroll event on one
       side, every section change on the other. The gap between the two
       numbers is the whole argument for the observer, and the third row is
       what a live region on the nav would have had to read out. */

    function wireCost() {
      var box = root.querySelector('[data-ac-jn-cost]');
      if (!box) return;

      var doc = box.querySelector('.ac-jn-doc');
      var nav = box.querySelector('[data-ac-jump-nav]');
      var scrolls = 0;
      var changes = 0;

      function refresh() {
        say('cost-scroll', String(scrolls), scrolls > changes);
        say('cost-change', String(changes));
        say(
          'cost-verdict',
          scrolls
            ? scrolls + ' section names, ' + changes + ' of them a change'
            : '—',
          scrolls > changes,
        );
      }

      // Passive: this listener is here to be counted, and a non-passive
      // scroll listener is its own performance bug.
      on(doc, 'scroll', function () {
        scrolls += 1;
      }, { passive: true });

      on(nav, 'ac:jump-nav:change', function () {
        changes += 1;
      });

      on(box.querySelector('[data-ac-jn-cost-run]'), 'click', function () {
        scrolls = 0;
        changes = 0;
        doc.scrollTo({ top: doc.scrollHeight, behavior: motionOn(doc) ? 'smooth' : 'auto' });
        whenSettled(doc, refresh);
      });

      on(box.querySelector('[data-ac-jn-cost-reset]'), 'click', function () {
        doc.scrollTo({ top: 0, behavior: 'auto' });
        // Zeroed after the box has settled, not before: a scroll event is
        // dispatched asynchronously, so the scroll back up would be counted
        // into the run it was meant to clear.
        whenSettled(doc, function () {
          scrolls = 0;
          changes = 0;
          refresh();
        });
      });

      refresh();
    }

    /* === [LANDMARKS] ======================================================
       Example 5. Nothing is measured. The failure is a missing attribute, and
       a landmark menu is the only place it shows. Scoped to <nav> on purpose:
       the scrolling box on this page is a named region and would otherwise
       appear in a list that is not about it. */

    function wireLandmarks() {
      ['unnamed', 'named'].forEach(function (key) {
        var box = root.querySelector('[data-ac-jn-mark-case="' + key + '"]');
        if (!box) return;

        var navs = Array.prototype.slice.call(box.querySelectorAll('nav'));
        var entries = navs.map(function (nav) {
          var name = nav.getAttribute('aria-label') || '';
          var labelledby = nav.getAttribute('aria-labelledby');
          if (!name && labelledby) {
            var source = document.getElementById(labelledby);
            name = source ? source.textContent.replace(/\s+/g, ' ').trim() : '';
          }
          return name || 'navigation';
        });

        var same = entries.length > 1 && entries[0] === entries[1];
        say('mark-' + key, entries.join(' · '), same);
      });
    }

    /* --- wiring ---------------------------------------------------------- */

    wireLanding();
    wireClearance();
    wireCost();
    wireLandmarks();

    var api = {
      destroy: function () {
        cleanups.forEach(function (fn) {
          fn();
        });
        cleanups = [];
        delete root._acJumpPage;
      },
    };

    root._acJumpPage = api;
    return api;
  }

  global.AC.createJumpPage = createJumpPage;

  /* === [AUTO-INIT] delete this block if you construct instances yourself === */
  function initAll(scope) {
    var host = scope || document;
    host.querySelectorAll('[data-ac-jump-nav]').forEach(function (el) {
      createJumpNav(el);
    });
    host.querySelectorAll('[data-ac-jump-page]').forEach(function (el) {
      createJumpPage(el);
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
