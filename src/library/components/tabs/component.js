/* ===========================================================================
   TABS

   WHAT TO COPY
     [CORE]       every example. The factory: pairing, roving tabindex, the
                  keyboard map, and the one event a host app needs.
     [FOCUS]      the page's own probe — whether the browser will really give
                  an element focus. Examples 2 and 4 are built on it.
     [STOPS]      examples 2 and 4. What the Tab key reaches, in order.
     [NAIVE]      example 2. The two broken strips, wired by hand.
     [ACTIVATION] example 3. Counting panels activated on the way across.
     [CURRENT]    example 5. Which attribute the active item is wearing.
     [AUTO-INIT]  delete if you construct instances yourself.

   Copy [CORE] and [AUTO-INIT] for the component. The rest is this page
   checking its own claims and can go.

   Two decisions are worth the words:

     Roving tabindex. Only the selected tab is tabindex="0", so the whole
     strip is one Tab stop and one more Tab reaches the panel. The arrows are
     what move inside it — which is a keyboard map a person has to discover,
     and the tradeoff is Chip Toggle's example 5 seen from the other side.

     The factory never touches the panel's tabindex. It is in the markup
     because a widget whose tab order changes the moment a script loads has
     two keyboard maps, and only one of them was reviewed.

   No dependencies. Plain IIFE, so a paste into a <script> tag works.
   =========================================================================== */
(function (global) {
  'use strict';

  var uid = 0;

  /* === [CORE] ============================================================== */

  /**
   * @param {HTMLElement} root element carrying [data-ac-tabs]
   * @param {object} [options]
   * @param {'automatic'|'manual'} [options.activation] also read from
   *   [data-ac-activation]. Automatic selects as the arrows move, which is
   *   right whenever the panels are already in the DOM.
   * @returns {{select: Function, selected: Function, tabs: HTMLElement[],
   *            panels: HTMLElement[], destroy: Function}|null}
   */
  function createTabs(root, options) {
    // Idempotent: initializing twice would double up the listeners.
    if (!root || root._acTabs) return root && root._acTabs;

    var list = root.querySelector('[role="tablist"]');
    if (!list) return null;

    var tabs = Array.prototype.slice.call(list.querySelectorAll('[role="tab"]'));
    if (!tabs.length) return null;

    var settings = options || {};
    var manual = (settings.activation || root.getAttribute('data-ac-activation')) === 'manual';
    var id = root.id || 'ac-tabs-' + ++uid;

    var minted = [];
    var cleanups = [];

    /** Set an attribute only if the markup did not, and remember that we did,
        so destroy() really is the inverse of create(). */
    function mint(el, attr, value) {
      if (el.hasAttribute(attr)) return el.getAttribute(attr);
      el.setAttribute(attr, value);
      minted.push([el, attr]);
      return value;
    }

    function on(el, type, fn) {
      el.addEventListener(type, fn);
      cleanups.push(function () {
        el.removeEventListener(type, fn);
      });
    }

    // Pairing. aria-controls wins when the markup has it; otherwise the panels
    // are taken in DOM order, which is the only pairing a reader can check by
    // eye. Both directions are wired, because a panel that does not point back
    // at its tab has no accessible name.
    var loose = Array.prototype.slice.call(root.querySelectorAll('[role="tabpanel"]'));
    var panels = tabs.map(function (tab, i) {
      var controls = tab.getAttribute('aria-controls');
      var panel = controls ? document.getElementById(controls) : loose[i];
      if (!panel) return null;
      mint(tab, 'id', id + '-tab-' + (i + 1));
      mint(panel, 'id', id + '-panel-' + (i + 1));
      mint(tab, 'aria-controls', panel.id);
      mint(panel, 'aria-labelledby', tab.id);
      return panel;
    });

    var selected = 0;
    tabs.forEach(function (tab, i) {
      if (tab.getAttribute('aria-selected') === 'true') selected = i;
    });

    /**
     * @param {number} index
     * @param {{focus?: boolean}} [opts]
     */
    function select(index, opts) {
      if (index < 0 || index >= tabs.length) return;
      var changed = index !== selected;
      selected = index;

      tabs.forEach(function (tab, i) {
        var isOn = i === index;
        tab.setAttribute('aria-selected', isOn ? 'true' : 'false');
        // Roving tabindex. The one line that decides whether this strip is a
        // single Tab stop or one per tab.
        tab.tabIndex = isOn ? 0 : -1;
        // `hidden`, never opacity and never a class that only moves it off
        // screen: an unselected panel has to leave the accessibility tree and
        // take its tab stops with it. Example 2 is what the other way costs.
        if (panels[i]) panels[i].hidden = !isOn;
      });

      if (opts && opts.focus) tabs[index].focus();

      if (changed) {
        root.dispatchEvent(
          new CustomEvent('ac:tabs:change', {
            bubbles: true,
            detail: { index: index, tab: tabs[index], panel: panels[index] },
          }),
        );
      }
    }

    /** Manual activation only: move focus and the roving tabindex with it,
        leaving aria-selected where it was. Tab still returns to the tab the
        person was last on, which is the reason the tabindex moves at all. */
    function moveFocus(index) {
      tabs.forEach(function (tab, i) {
        tab.tabIndex = i === index ? 0 : -1;
      });
      tabs[index].focus();
    }

    on(list, 'click', function (event) {
      var tab = event.target.closest && event.target.closest('[role="tab"]');
      var index = tabs.indexOf(tab);
      // No focus argument: the click has already moved it. Enter and Space
      // arrive here too, because a native <button> fires a click for both —
      // which is the whole of manual activation's keyboard story.
      if (index >= 0) select(index);
    });

    on(list, 'keydown', function (event) {
      if (event.altKey || event.ctrlKey || event.metaKey) return;

      var tab = event.target.closest && event.target.closest('[role="tab"]');
      var from = tabs.indexOf(tab);
      if (from < 0) return;

      // A stacked list gets Up/Down instead. Answering to both would make the
      // strip swallow the arrow keys the page scrolls with.
      var vertical = list.getAttribute('aria-orientation') === 'vertical';
      var forward = vertical ? 'ArrowDown' : 'ArrowRight';
      var back = vertical ? 'ArrowUp' : 'ArrowLeft';

      var next = null;
      if (event.key === forward) next = (from + 1) % tabs.length;
      else if (event.key === back) next = (from - 1 + tabs.length) % tabs.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = tabs.length - 1;

      if (next === null) return;
      event.preventDefault();

      if (manual) moveFocus(next);
      else select(next, { focus: true });
    });

    // Whatever the markup said is now made true everywhere else.
    select(selected);

    var api = {
      select: function (index) {
        select(index);
      },
      selected: function () {
        return selected;
      },
      tabs: tabs,
      panels: panels,
      destroy: function () {
        cleanups.forEach(function (fn) {
          fn();
        });
        minted.forEach(function (pair) {
          pair[0].removeAttribute(pair[1]);
        });
        cleanups = [];
        minted = [];
        delete root._acTabs;
        // The selection itself is left alone. Putting every panel back on
        // screen would be a worse ending than leaving one showing.
      },
    };

    root._acTabs = api;
    return api;
  }

  global.AC = global.AC || {};
  global.AC.createTabs = createTabs;

  /* ==========================================================================
     Everything below is this page checking its own claims. None of it is part
     of a tab strip; delete it all when you copy.
     ========================================================================== */

  function createTabsPage(root) {
    if (!root || root._acTabsPage) return root && root._acTabsPage;

    var cleanups = [];

    function on(el, type, fn) {
      if (!el) return;
      el.addEventListener(type, fn);
      cleanups.push(function () {
        el.removeEventListener(type, fn);
      });
    }

    function say(key, text, bad) {
      var el = root.querySelector('[data-ac-tb-out="' + key + '"]');
      if (!el) return;
      el.textContent = text;
      if (bad) el.setAttribute('data-ac-tb-bad', 'true');
      else el.removeAttribute('data-ac-tb-bad');
    }

    /* === [FOCUS] =========================================================
       Whether the browser will give this element focus — asked, not guessed.
       A selector can only list the elements that are usually focusable, and
       every failure on this page is an element that is unusually focusable or
       unusually not.

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

    /* === [STOPS] ========================================================== */

    var FOCUSABLE = 'a[href], button, input, select, textarea, summary, [tabindex], [contenteditable]';

    /** Everything the Tab key reaches inside `scope`, in order. tabIndex < 0
        is focusable but not tabbable, which is exactly the difference roving
        tabindex trades on. */
    function tabStops(scope) {
      var found = [];
      scope.querySelectorAll(FOCUSABLE).forEach(function (el) {
        if (el.disabled) return;
        if (el.tabIndex < 0) return;
        if (!canFocus(el)) return;
        found.push(el);
      });
      return found;
    }

    function roleOf(el) {
      var role = el.getAttribute('role');
      if (role) return role;
      var tag = el.tagName.toLowerCase();
      if (tag === 'a') return el.hasAttribute('href') ? 'link' : 'generic';
      return tag;
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

    /** Whether a stop can actually be seen. Opacity is inherited down the box
        tree without appearing on the element itself, so this has to walk up. */
    function seen(el) {
      var rect = el.getBoundingClientRect();
      if (!rect.width || !rect.height) return false;
      var node = el;
      while (node && node.nodeType === 1) {
        var style = getComputedStyle(node);
        if (style.visibility === 'hidden' || parseFloat(style.opacity) === 0) return false;
        node = node.parentElement;
      }
      return true;
    }

    function describe(el) {
      return (nameOf(el) || 'no name') + ' (' + roleOf(el) + ')';
    }

    /* Example 2. */
    function refreshStops() {
      ['roving', 'opacity', 'good'].forEach(function (key) {
        var widget = root.querySelector('[data-ac-tb-stop-case="' + key + '"]');
        if (!widget) return;

        var stops = tabStops(widget);
        var names = stops.map(function (el) {
          return seen(el) ? describe(el) : describe(el) + ' — not visible';
        });
        say('stops-' + key, stops.length + ' stops — ' + names.join(' · '), key !== 'good');
      });
    }

    /* Example 4. What Tab reaches immediately after the selected tab, which is
       the question "does the panel get a stop of its own" in a form the
       browser can answer. */
    function refreshLanding() {
      ['skipped', 'link', 'good'].forEach(function (key) {
        var widget = root.querySelector('[data-ac-tb-land-case="' + key + '"]');
        if (!widget) return;

        var scope = widget.closest('.ac-tb-case') || widget;
        var stops = tabStops(scope);
        var current = widget.querySelector('[role="tab"][aria-selected="true"]');
        var index = stops.indexOf(current);
        var next = index >= 0 ? stops[index + 1] : null;

        say('land-' + key, next ? describe(next) : 'nothing else here', key !== 'good');
      });
    }

    /* === [NAIVE] ==========================================================
       Example 2's two broken strips. The APG keyboard map is repeated here on
       purpose so that each strip has exactly one thing wrong with it: the
       first never roves the tabindex, the second hides its panels with
       opacity. Everything else about them is correct. */

    function wireNaive(widget) {
      var mode = widget.getAttribute('data-ac-tb-naive');
      var tabs = Array.prototype.slice.call(widget.querySelectorAll('[role="tab"]'));
      var panels = Array.prototype.slice.call(widget.querySelectorAll('[role="tabpanel"]'));
      var roving = mode !== 'roving';

      function pick(index, moveFocus) {
        tabs.forEach(function (tab, i) {
          tab.setAttribute('aria-selected', i === index ? 'true' : 'false');
          if (roving) tab.tabIndex = i === index ? 0 : -1;
        });
        panels.forEach(function (panel, i) {
          if (mode === 'opacity') panel.setAttribute('data-ac-tb-shown', i === index ? 'true' : 'false');
          else panel.hidden = i !== index;
        });
        if (moveFocus) tabs[index].focus();
        refreshStops();
      }

      on(widget, 'click', function (event) {
        var tab = event.target.closest && event.target.closest('[role="tab"]');
        var index = tabs.indexOf(tab);
        if (index >= 0) pick(index, false);
      });

      on(widget, 'keydown', function (event) {
        var tab = event.target.closest && event.target.closest('[role="tab"]');
        var from = tabs.indexOf(tab);
        if (from < 0) return;

        var next = null;
        if (event.key === 'ArrowRight') next = (from + 1) % tabs.length;
        else if (event.key === 'ArrowLeft') next = (from - 1 + tabs.length) % tabs.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = tabs.length - 1;

        if (next === null) return;
        event.preventDefault();
        pick(next, true);
      });
    }

    /* === [ACTIVATION] =====================================================
       Example 3. One counter per strip, fed by the component's own change
       event, plus the pair of tabs the two modes can disagree about. The
       focused tab is read off the roving tabindex rather than tracked: the
       tab carrying tabindex="0" is by definition where Tab returns. */

    var counts = { auto: 0, manual: 0 };

    function refreshActivation(key) {
      var widget = root.querySelector('[data-ac-tb-act-case="' + key + '"]');
      if (!widget) return;

      var current = widget.querySelector('[role="tab"][aria-selected="true"]');
      var focused = widget.querySelector('[role="tab"][tabindex="0"]');

      say('act-' + key + '-count', String(counts[key]));
      say(
        'act-' + key + '-pair',
        (focused ? nameOf(focused) : '—') + ' / ' + (current ? nameOf(current) : '—'),
      );
    }

    function wireActivation() {
      ['auto', 'manual'].forEach(function (key) {
        var widget = root.querySelector('[data-ac-tb-act-case="' + key + '"]');
        if (!widget) return;

        on(widget, 'ac:tabs:change', function () {
          counts[key] += 1;
          refreshActivation(key);
        });
        // The arrows move focus without selecting under manual activation, so
        // the pair has to be re-read on plain movement as well.
        on(widget, 'keyup', function () {
          refreshActivation(key);
        });
        on(widget, 'focusin', function () {
          refreshActivation(key);
        });

        refreshActivation(key);
      });

      on(root.querySelector('[data-ac-tb-act-reset]'), 'click', function () {
        ['auto', 'manual'].forEach(function (key) {
          var widget = root.querySelector('[data-ac-tb-act-case="' + key + '"]');
          if (widget && widget._acTabs) widget._acTabs.select(0);
          counts[key] = 0;
          refreshActivation(key);
        });
      });
    }

    /* === [CURRENT] ========================================================
       Example 5. Nothing here is measured; it is read straight off the two
       rows, because the failure is an attribute that names an element nobody
       built and there is nothing on screen to see. */

    function refreshCurrent() {
      var strip = root.querySelector('[data-ac-tb-cur-case="tabs"]');
      var nav = root.querySelector('[data-ac-tb-cur-case="nav"]');
      if (!strip || !nav) return;

      var active = strip.querySelector('[aria-selected="true"]');
      say(
        'cur-tabs',
        active ? nameOf(active) + ' — ' + roleOf(active) + ', aria-selected=true' : 'none',
        true,
      );

      var controls = active && active.getAttribute('aria-controls');
      var target = controls ? document.getElementById(controls) : null;
      say(
        'cur-tabs-controls',
        controls ? controls + (target ? '' : ' — no such element') : 'not set',
        !target,
      );

      var current = nav.querySelector('[aria-current]');
      say(
        'cur-nav',
        current
          ? nameOf(current) + ' — link, aria-current=' + current.getAttribute('aria-current')
          : 'none',
      );
    }

    function wireCurrent() {
      var strip = root.querySelector('[data-ac-tb-cur-case="tabs"]');
      var nav = root.querySelector('[data-ac-tb-cur-case="nav"]');

      on(strip, 'click', function (event) {
        var item = event.target.closest && event.target.closest('[role="tab"]');
        if (!item) return;
        strip.querySelectorAll('[role="tab"]').forEach(function (el) {
          var isOn = el === item;
          el.setAttribute('aria-selected', isOn ? 'true' : 'false');
          el.tabIndex = isOn ? 0 : -1;
        });
        refreshCurrent();
      });

      on(nav, 'click', function (event) {
        var item = event.target.closest && event.target.closest('a[href]');
        if (!item) return;
        nav.querySelectorAll('a[href]').forEach(function (el) {
          // aria-current="location" and not "page": these move you within the
          // page they are on. "page" is for a link to the page you are on.
          if (el === item) el.setAttribute('aria-current', 'location');
          else el.removeAttribute('aria-current');
        });
        refreshCurrent();
      });

      refreshCurrent();
    }

    /* --- wiring ---------------------------------------------------------- */

    root.querySelectorAll('[data-ac-tb-naive]').forEach(wireNaive);
    wireActivation();
    wireCurrent();

    // Both stop walks are re-run whenever any strip on the page changes, since
    // what Tab reaches is exactly what the change moved.
    on(root, 'ac:tabs:change', function () {
      refreshStops();
      refreshLanding();
    });

    refreshStops();
    refreshLanding();

    var api = {
      refresh: function () {
        refreshStops();
        refreshLanding();
        refreshCurrent();
      },
      destroy: function () {
        cleanups.forEach(function (fn) {
          fn();
        });
        cleanups = [];
        delete root._acTabsPage;
      },
    };

    root._acTabsPage = api;
    return api;
  }

  global.AC.createTabsPage = createTabsPage;

  /* === [AUTO-INIT] delete this block if you construct instances yourself === */
  function initAll(scope) {
    var host = scope || document;
    host.querySelectorAll('[data-ac-tabs]').forEach(function (el) {
      createTabs(el);
    });
    host.querySelectorAll('[data-ac-tabs-page]').forEach(function (el) {
      createTabsPage(el);
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
