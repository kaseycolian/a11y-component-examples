/* ===========================================================================
   DROPDOWN / LISTBOX

   WHAT TO COPY
     [CORE]        every example. Open and close, positioning, roving focus,
                   committing a choice, and the one event a host app needs.
     [IDS]         nice to have. Fills in wiring ids the markup left out.
     [TYPEAHEAD]   nice to have. Delete typeAhead() and the two single-character
                   key branches that call it.
     [FORM]        example 6 only. Two lines that mirror the chosen value into a
                   hidden input. Delete them and the input outside a form.
     [AUTO-INIT]   delete if you construct instances yourself.
     [PAGE]        this page's own readout. Never copy it.

   Copy the file whole for the library version.

   This script writes no markup. The trigger, the panel, every option and every
   piece of decoration are in component.html, which is the point: what the code
   panel shows is what runs, and the ARIA contract is readable without running
   anything. What is left here is the part markup cannot do.

   Focus model: when the panel opens, DOM focus moves onto the option itself
   (roving tabindex) rather than staying on the button with
   `aria-activedescendant`. Both are APG-legal. Real focus is used because
   activedescendant is unreliable on VoiceOver for iOS and on TalkBack, and
   mobile screen reader support is a requirement for this library.

   The panel anchors to its trigger at every viewport width. For a panel that
   rises from the bottom of the screen instead — a different focus and dismissal
   model — see `drawer`.

   No dependencies. Plain IIFE, so a paste into a <script> tag works.
   =========================================================================== */
(function (global) {
  'use strict';

  var uid = 0;

  /** The instance whose panel is currently open, if any. */
  var openInstance = null;

  var SUPPORTS_POPOVER =
    typeof HTMLElement !== 'undefined' &&
    Object.prototype.hasOwnProperty.call(HTMLElement.prototype, 'showPopover');

  /* Geometry, in px. GAP is the space between trigger and panel; EDGE is how
     close to a viewport edge the panel may come; the panel flips above the
     trigger when there is less than FLIP room below it and more room above. */
  var GAP = 6;
  var EDGE = 8;
  var FLIP = 200;
  var MIN_HEIGHT = 120;

  /** How long the type-ahead buffer survives between keystrokes, in ms. */
  var TYPEAHEAD_WINDOW = 800;

  /**
   * @param {HTMLElement} root  the .ac-dropdown element
   */
  function createDropdown(root) {
    if (!root || root._acDropdown) return root && root._acDropdown;

    var toggle = root.querySelector('.ac-dropdown__toggle');
    var panel = root.querySelector('[role="listbox"]');
    var valueEl = root.querySelector('.ac-dropdown__value');

    if (!toggle || !panel || !valueEl) {
      throw new Error(
        'ac-dropdown: needs a .ac-dropdown__toggle containing a .ac-dropdown__value, and a [role="listbox"].',
      );
    }

    /* === [FORM] delete this line and the one in paint() outside a form ===== */
    var formInput = root.querySelector('input[data-ac-dropdown-input]');

    /* === [IDS] optional — delete it if you always write the ids yourself ====
       Only fills in what the markup left out, so authored ids survive. The one
       thing it insists on is that the value span is among the things the
       trigger is labelled by: a trigger named by its label alone never says
       what is currently selected, which is the most common way this pattern is
       got wrong.

       Duplicate ids are yours to avoid. Paste the block twice and give the
       second copy its own — nothing here can tell which label belongs to which
       trigger once two of them claim the same id. */

    var n = ++uid;

    function ensureId(el, suffix) {
      if (!el.id) el.id = 'ac-dropdown-' + n + '-' + suffix;
      return el.id;
    }

    ensureId(toggle, 'toggle');
    toggle.setAttribute('aria-controls', ensureId(panel, 'panel'));

    var valueId = ensureId(valueEl, 'value');
    var names = (toggle.getAttribute('aria-labelledby') || '').split(/\s+/);
    var namedByValue = false;
    for (var i = 0; i < names.length; i++) {
      if (names[i] === valueId) namedByValue = true;
    }
    if (names[0] && !namedByValue) {
      toggle.setAttribute('aria-labelledby', names.join(' ') + ' ' + valueId);
    }

    /* === [CORE] the option list ===========================================
       `rows` is the options the keyboard can reach — everything with
       role="option" that is not aria-disabled, in visual order. Disabled ones
       stay in the DOM and in the accessibility tree, so a screen reader user
       learns they exist and why they are out; they just have no tabindex, and
       that is what makes the arrows skip them. */

    /** @type {HTMLElement[]} */
    var rows = [];

    function options() {
      return panel.querySelectorAll('[role="option"]');
    }

    function refresh() {
      rows = [];
      var all = options();
      for (var i = 0; i < all.length; i++) {
        if (all[i].getAttribute('aria-disabled') === 'true') {
          all[i].removeAttribute('tabindex');
        } else {
          all[i].tabIndex = -1;
          rows.push(all[i]);
        }
      }
    }

    function selected() {
      return panel.querySelector('[role="option"][aria-selected="true"]');
    }

    function optionFor(value) {
      var all = options();
      for (var i = 0; i < all.length; i++) {
        if (all[i].dataset.value === value) return all[i];
      }
      return null;
    }

    /** The text the trigger shows. Not the option's textContent, which also
        carries the tick and any secondary line. */
    function labelOf(option) {
      var primary = option.querySelector('.ac-dropdown__primary');
      return (primary || option).textContent.trim();
    }

    /* Paint a selection without announcing it. aria-selected is written on
       every option rather than only the chosen one, because it is also what the
       CSS selects on — there is no way to draw a row as chosen without saying
       so. */
    function paint(option) {
      var all = options();
      for (var i = 0; i < all.length; i++) {
        all[i].setAttribute('aria-selected', all[i] === option ? 'true' : 'false');
      }

      if (option) {
        valueEl.textContent = labelOf(option);
        valueEl.classList.remove('ac-dropdown__value--empty');
        root.dataset.value = option.dataset.value || '';
      } else {
        // Nothing selected: the markup's own empty text is already in the value
        // span, so leave it alone.
        root.removeAttribute('data-value');
      }

      /* [FORM] */
      if (formInput) formInput.value = option ? option.dataset.value || '' : '';
    }

    /* === [CORE] positioning ===============================================
       The panel is position:fixed and, where supported, in the top layer. That
       is what stops an ancestor with overflow:hidden or a transform from
       clipping it. Recomputed on scroll and resize rather than once at open
       time, so it cannot drift away from its trigger. */

    function position() {
      var rect = toggle.getBoundingClientRect();
      var below = window.innerHeight - rect.bottom - GAP - EDGE;
      var above = rect.top - GAP - EDGE;
      // Flip up only when below is genuinely cramped AND above has more room.
      var flipUp = below < FLIP && above > below;

      // Match the trigger's width, the way a native select does, but never let
      // the panel hang off either edge of a narrow viewport.
      panel.style.width = rect.width + 'px';
      panel.style.left =
        Math.max(EDGE, Math.min(rect.left, window.innerWidth - rect.width - EDGE)) + 'px';
      panel.style.maxHeight = Math.max(MIN_HEIGHT, flipUp ? above : below) + 'px';

      if (flipUp) {
        panel.style.top = '';
        panel.style.bottom = window.innerHeight - rect.top + GAP + 'px';
      } else {
        panel.style.bottom = '';
        panel.style.top = rect.bottom + GAP + 'px';
      }

      // A styling hook for consumers who want to square off the adjoining
      // corners.
      root.classList.toggle('ac-dropdown--up', flipUp);
    }

    /* === [CORE] open and close ============================================ */

    function isOpen() {
      return toggle.getAttribute('aria-expanded') === 'true';
    }

    /* aria-disabled, not the disabled attribute: the trigger stays focusable,
       so a keyboard user can reach it and hear why it is unavailable. The
       attribute is the whole state — there is no class to keep in sync. */
    function isDisabled() {
      return toggle.getAttribute('aria-disabled') === 'true';
    }

    function open() {
      if (isOpen() || isDisabled()) return;
      if (openInstance && openInstance !== api) openInstance.close(false);

      refresh();

      panel.hidden = false;
      if (SUPPORTS_POPOVER) {
        try {
          panel.showPopover();
        } catch (e) {
          /* already open, or popover unsupported at runtime */
        }
      }

      position();
      toggle.setAttribute('aria-expanded', 'true');
      openInstance = api;

      document.addEventListener('pointerdown', onDocumentPointerDown, true);
      window.addEventListener('resize', position);
      // `true` for capture so we reposition even when a nested element scrolls.
      window.addEventListener('scroll', position, true);

      // Focus the selected option so a screen reader announces the listbox and
      // where you are in it. Falling back to the first row when nothing is
      // selected keeps the arrow keys predictable.
      var target = selected();
      if (!target || rows.indexOf(target) === -1) target = rows[0];

      if (target) {
        target.focus();
        scrollRowIntoView(target);
      } else {
        // An empty listbox still has to take focus, or the message in it is
        // never read.
        panel.tabIndex = -1;
        panel.focus();
      }
    }

    function close(restoreFocus) {
      if (!isOpen()) return;

      if (SUPPORTS_POPOVER) {
        try {
          panel.hidePopover();
        } catch (e) {
          /* already closed */
        }
      }
      panel.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');
      root.classList.remove('ac-dropdown--up');
      if (openInstance === api) openInstance = null;

      document.removeEventListener('pointerdown', onDocumentPointerDown, true);
      window.removeEventListener('resize', position);
      window.removeEventListener('scroll', position, true);

      // Focus has to go somewhere. Hiding the element that holds it without
      // moving it first drops focus to <body>, and the user loses their place.
      if (restoreFocus !== false) toggle.focus();
    }

    function onDocumentPointerDown(event) {
      if (!root.contains(event.target)) close(false);
    }

    /* === [CORE] moving and choosing ======================================= */

    function scrollRowIntoView(row) {
      if (row.scrollIntoView) row.scrollIntoView({ block: 'nearest' });
    }

    function focusRow(index) {
      if (!rows.length) return;
      var clamped = Math.max(0, Math.min(rows.length - 1, index));
      rows[clamped].focus();
      scrollRowIntoView(rows[clamped]);
    }

    function currentRowIndex() {
      return rows.indexOf(document.activeElement);
    }

    function choose(option) {
      if (!option || option.getAttribute('aria-disabled') === 'true') return;
      var changed = option !== selected();

      paint(option);
      close();

      // How a consumer hears about it, since there is no native control here to
      // fire a change of its own. Dispatched after the panel closes and focus is
      // back on the trigger, so a handler that navigates is not racing us.
      if (changed) {
        root.dispatchEvent(
          new CustomEvent('ac:dropdown:change', {
            bubbles: true,
            detail: { value: option.dataset.value, option: option },
          }),
        );
      }
    }

    /* === [TYPEAHEAD] optional — delete this and the two key branches below == */

    var buffer = '';
    var bufferTime = 0;

    function typeAhead(char) {
      var now = Date.now();
      // A window between keystrokes, so "st" lands on Staging rather than
      // jumping to the first "s" and then the first "t".
      buffer = (now - bufferTime > TYPEAHEAD_WINDOW ? '' : buffer) + char.toLowerCase();
      bufferTime = now;

      for (var i = 0; i < rows.length; i++) {
        if (labelOf(rows[i]).toLowerCase().indexOf(buffer) === 0) {
          if (isOpen()) focusRow(i);
          else choose(rows[i]);
          return;
        }
      }
    }

    /* === [CORE] events ==================================================== */

    function onToggleClick() {
      if (isDisabled()) return;
      if (isOpen()) close();
      else open();
    }

    function onToggleKeydown(event) {
      if (isDisabled()) return;
      var key = event.key;

      if (key === 'ArrowDown' || key === 'ArrowUp' || key === 'Enter' || key === ' ') {
        event.preventDefault();
        open();
        return;
      }

      if (key === 'Home' || key === 'End') {
        event.preventDefault();
        open();
        focusRow(key === 'Home' ? 0 : rows.length - 1);
        return;
      }

      /* [TYPEAHEAD] closed, a letter commits straight away — the same as a
         native select. */
      if (key.length === 1 && /\S/.test(key)) {
        event.preventDefault();
        refresh();
        typeAhead(key);
      }
    }

    function onPanelKeydown(event) {
      var key = event.key;
      var index = currentRowIndex();

      if (key === 'ArrowDown') {
        event.preventDefault();
        focusRow(index === rows.length - 1 ? 0 : index + 1);
      } else if (key === 'ArrowUp') {
        event.preventDefault();
        focusRow(index <= 0 ? rows.length - 1 : index - 1);
      } else if (key === 'Home') {
        event.preventDefault();
        focusRow(0);
      } else if (key === 'End') {
        event.preventDefault();
        focusRow(rows.length - 1);
      } else if (key === 'Enter' || key === ' ') {
        event.preventDefault();
        if (index > -1) choose(rows[index]);
      } else if (key === 'Escape') {
        event.preventDefault();
        // Stop it here, or a surrounding dialog closes at the same time.
        event.stopPropagation();
        close();
      } else if (key === 'Tab') {
        // Move focus back to the trigger first, then let the browser carry on
        // tabbing from there — otherwise focus sits on an element we are hiding.
        close();
      } else if (key.length === 1 && /\S/.test(key)) {
        /* [TYPEAHEAD] */
        event.preventDefault();
        typeAhead(key);
      }
    }

    function onPanelClick(event) {
      var row = event.target.closest('[role="option"]');
      if (row && panel.contains(row)) choose(row);
    }

    function onPanelPointerMove(event) {
      // Only follow a real mouse. On touch this fires during a scroll drag and
      // would yank focus to whatever passed under the finger.
      if (event.pointerType !== 'mouse') return;
      var row = event.target.closest('[role="option"]');
      if (!row || rows.indexOf(row) === -1) return;
      if (document.activeElement !== row) row.focus();
    }

    toggle.addEventListener('click', onToggleClick);
    toggle.addEventListener('keydown', onToggleKeydown);
    panel.addEventListener('keydown', onPanelKeydown);
    panel.addEventListener('click', onPanelClick);
    panel.addEventListener('pointermove', onPanelPointerMove);

    /* === [CORE] API ======================================================= */

    var api = {
      /** Re-read the option list after you changed it. */
      refresh: refresh,
      /** The selected option's data-value, or null. */
      value: function () {
        var option = selected();
        return option ? option.dataset.value || '' : null;
      },
      /** Select by value and repaint. Fires nothing — it is not a user choice. */
      setValue: function (value) {
        var option = optionFor(value);
        if (option) paint(option);
        return !!option;
      },
      open: open,
      close: close,
      isOpen: isOpen,
      /** The root element, if you need to position something relative to it. */
      element: root,
      destroy: function () {
        close(false);
        toggle.removeEventListener('click', onToggleClick);
        toggle.removeEventListener('keydown', onToggleKeydown);
        panel.removeEventListener('keydown', onPanelKeydown);
        panel.removeEventListener('click', onPanelClick);
        panel.removeEventListener('pointermove', onPanelPointerMove);
        delete root._acDropdown;
      },
    };

    root._acDropdown = api;

    refresh();
    // data-value on the root wins over the markup's aria-selected, so a host app
    // can write the value before this script has run and not have to care which
    // of the two lands first.
    paint(root.hasAttribute('data-value') ? optionFor(root.dataset.value) : selected());

    return api;
  }

  global.AC = global.AC || {};
  global.AC.createDropdown = createDropdown;

  /* === [AUTO-INIT] delete this block if you construct instances yourself === */
  function initAll(scope) {
    (scope || document).querySelectorAll('[data-ac-dropdown]').forEach(function (el) {
      createDropdown(el);
    });
  }

  /* === [PAGE] this page's own readout — never copy this ====================
     Example 6, printing what the form would send. The hidden input is the whole
     mechanism: FormData reads it like any other field. */
  function createDropdownPage(root) {
    if (!root || root._acDropdownPage) return root && root._acDropdownPage;
    root._acDropdownPage = true;

    var form = root.querySelector('[data-ac-dd-form]');
    var out = root.querySelector('[data-ac-dd-out="form"]');
    if (!form || !out) return null;

    function report() {
      var entries = [];
      new FormData(form).forEach(function (value, key) {
        entries.push(key + '=' + value);
      });
      out.textContent = entries.length ? entries.join(' & ') : 'nothing';
    }

    form.addEventListener('ac:dropdown:change', report);
    report();

    return { destroy: function () { form.removeEventListener('ac:dropdown:change', report); } };
  }

  global.AC.createDropdownPage = createDropdownPage;

  function boot() {
    initAll();
    document.querySelectorAll('[data-ac-dropdown-page]').forEach(function (el) {
      createDropdownPage(el);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window);
