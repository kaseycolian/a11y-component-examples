/* =============================================================================
   Dropdown / listbox

   Progressive enhancement of a real <select>. The native element stays in the
   DOM as the value store, so `.value`, `.selectedIndex`, `change` listeners and
   form submission keep working exactly as before -- you can drop this onto an
   existing form and nothing downstream needs to know.

   Focus model: when the panel opens, DOM focus moves onto the option itself
   (roving tabindex), rather than staying on the button with
   `aria-activedescendant`. Both are permitted by the APG. Real focus is used
   here because activedescendant is unreliable on VoiceOver for iOS and on
   TalkBack, and mobile screen reader support is a requirement for this library.

   Vanilla:   <script src="component.js"></script> and every
              <select data-ac-dropdown> on the page is enhanced.

   Framework: delete the auto-init block at the bottom and call
              AC.createDropdown(selectEl) yourself; call .destroy() on unmount.
   ============================================================================= */
(function (global) {
  'use strict';

  var uid = 0;

  /** The instance whose panel is currently open, if any. */
  var openInstance = null;

  var SUPPORTS_POPOVER =
    typeof HTMLElement !== 'undefined' &&
    Object.prototype.hasOwnProperty.call(HTMLElement.prototype, 'showPopover');

  /** Below this width the panel becomes a bottom sheet instead of an anchored popup. */
  var SHEET_BREAKPOINT = 640;

  function isSheet() {
    return window.matchMedia('(max-width: ' + SHEET_BREAKPOINT + 'px)').matches;
  }

  /**
   * @param {HTMLSelectElement} select
   * @param {{ emptyText?: string }} [options]
   */
  function createDropdown(select, options) {
    if (!select || select._acDropdown) return select && select._acDropdown;

    // A multi-select is a different pattern with a different keyboard model.
    // Enhancing it would quietly break it, so leave it as the native control.
    if (select.multiple) {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn('ac-dropdown: <select multiple> is not supported; leaving it native.', select);
      }
      return null;
    }

    var settings = options || {};
    var id = select.id || 'ac-dropdown-' + ++uid;
    var emptyText =
      settings.emptyText || select.getAttribute('data-ac-empty-text') || 'No options available';

    /* --- Build the shell -------------------------------------------------- */

    var wrap = document.createElement('div');
    wrap.className = 'ac-dropdown';

    var toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'ac-dropdown__toggle';
    toggle.id = id + '-toggle';
    toggle.setAttribute('aria-haspopup', 'listbox');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', id + '-panel');

    var valueEl = document.createElement('span');
    valueEl.className = 'ac-dropdown__value';

    var caret = document.createElement('span');
    caret.className = 'ac-dropdown__caret';
    caret.setAttribute('aria-hidden', 'true');
    caret.innerHTML =
      '<svg viewBox="0 0 16 16" focusable="false"><path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

    toggle.appendChild(valueEl);
    toggle.appendChild(caret);

    var panel = document.createElement('div');
    panel.className = 'ac-dropdown__panel';
    panel.id = id + '-panel';
    panel.setAttribute('role', 'listbox');
    panel.hidden = true;
    if (SUPPORTS_POPOVER) {
      // "manual" rather than "auto": we handle Escape and outside-click
      // ourselves, and auto's light-dismiss races with the toggle's own click.
      panel.setAttribute('popover', 'manual');
    }

    // Bottom-sheet header. Hidden by CSS on wide viewports; on a phone it gives
    // the sheet a visible title and a close control that is easy to hit.
    var sheetHead = document.createElement('div');
    sheetHead.className = 'ac-dropdown__sheet-head';
    var sheetTitle = document.createElement('span');
    sheetTitle.className = 'ac-dropdown__sheet-title';
    sheetTitle.id = id + '-sheet-title';
    var sheetClose = document.createElement('button');
    sheetClose.type = 'button';
    sheetClose.className = 'ac-dropdown__sheet-close';
    sheetClose.textContent = 'Close';
    sheetHead.appendChild(sheetTitle);
    sheetHead.appendChild(sheetClose);

    var list = document.createElement('div');
    list.className = 'ac-dropdown__list';

    panel.appendChild(sheetHead);
    panel.appendChild(list);

    /* --- Accessible name --------------------------------------------------
       Carry over whatever labeled the <select>. A <label for> is the common
       case and the one the original this is based on used to drop. */

    function resolveLabel() {
      var labelledBy = select.getAttribute('aria-labelledby');
      if (labelledBy) return { ids: labelledBy, text: null };

      var ariaLabel = select.getAttribute('aria-label');
      if (ariaLabel) return { ids: null, text: ariaLabel };

      // <label for="..."> or an ancestor <label>
      var labels = select.labels;
      if (labels && labels.length) {
        var ids = [];
        for (var i = 0; i < labels.length; i++) {
          if (!labels[i].id) labels[i].id = id + '-label-' + i;
          ids.push(labels[i].id);
        }
        return { ids: ids.join(' '), text: labels[0].textContent.trim() };
      }

      return { ids: null, text: null };
    }

    // The toggle's name is "<label>, <current value>", which is how a native
    // <select> announces. Referencing the value element rather than copying its
    // text means the name updates itself whenever the selection changes.
    valueEl.id = id + '-value';

    var label = resolveLabel();
    if (label.ids) {
      toggle.setAttribute('aria-labelledby', label.ids + ' ' + valueEl.id);
      panel.setAttribute('aria-labelledby', label.ids);
    } else if (label.text) {
      toggle.setAttribute('aria-label', label.text);
      panel.setAttribute('aria-label', label.text);
    }
    sheetTitle.textContent = label.text || 'Choose an option';

    // Descriptions (hints, error text) apply to the visible control too.
    var describedBy = select.getAttribute('aria-describedby');
    if (describedBy) toggle.setAttribute('aria-describedby', describedBy);

    /* --- Insert, and demote the native select to a value store ------------- */

    select.parentNode.insertBefore(wrap, select);
    wrap.appendChild(toggle);
    wrap.appendChild(panel);
    wrap.appendChild(select);

    select.classList.add('ac-dropdown__native');
    select.tabIndex = -1;
    // display:none already removes it from the accessibility tree; this makes
    // the intent explicit for anyone reading the DOM.
    select.setAttribute('aria-hidden', 'true');

    /* --- Options ----------------------------------------------------------- */

    /** @type {HTMLElement[]} rows in visual order, index-aligned to enabled option indexes */
    var rows = [];
    /** @type {number[]} select.options index for each row */
    var rowIndexes = [];

    function decorate(row, option) {
      var swatch = option.getAttribute('data-ac-swatch');
      var icon = option.getAttribute('data-ac-icon');

      if (icon) {
        var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'ac-dropdown__icon');
        svg.setAttribute('aria-hidden', 'true');
        svg.setAttribute('focusable', 'false');
        var use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
        use.setAttribute('href', '#' + icon);
        svg.appendChild(use);
        row.appendChild(svg);
      } else if (swatch) {
        var colors = swatch.split(',');
        var strip = document.createElement('span');
        strip.className = 'ac-dropdown__swatch';
        strip.setAttribute('aria-hidden', 'true');
        for (var i = 0; i < colors.length; i++) {
          var dot = document.createElement('span');
          // The only place a literal color is legitimate: it comes from the
          // author's data, not from the stylesheet.
          dot.style.background = colors[i].trim();
          strip.appendChild(dot);
        }
        row.appendChild(strip);
      }

      var text = document.createElement('span');
      text.className = 'ac-dropdown__text';

      var primary = document.createElement('span');
      primary.className = 'ac-dropdown__primary';
      primary.textContent = option.textContent.trim();
      text.appendChild(primary);

      var secondary = option.getAttribute('data-ac-secondary');
      if (secondary) {
        var sub = document.createElement('span');
        sub.className = 'ac-dropdown__secondary';
        sub.textContent = secondary;
        text.appendChild(sub);
      }

      row.appendChild(text);

      var check = document.createElement('span');
      check.className = 'ac-dropdown__check';
      check.setAttribute('aria-hidden', 'true');
      check.textContent = '✓';
      row.appendChild(check);
    }

    function buildRow(option, optionIndex) {
      var row = document.createElement('div');
      row.className = 'ac-dropdown__option';
      row.id = id + '-option-' + optionIndex;
      row.setAttribute('role', 'option');
      row.setAttribute('aria-selected', String(optionIndex === select.selectedIndex));
      row.dataset.index = String(optionIndex);

      if (option.disabled) {
        // aria-disabled rather than removing it: the option stays discoverable
        // so a screen reader user learns it exists and why it is unavailable.
        row.setAttribute('aria-disabled', 'true');
      } else {
        row.tabIndex = -1;
        rows.push(row);
        rowIndexes.push(optionIndex);
      }

      decorate(row, option);
      return row;
    }

    function rebuild() {
      list.textContent = '';
      rows = [];
      rowIndexes = [];

      var optionIndex = 0;
      var children = select.children;

      for (var i = 0; i < children.length; i++) {
        var child = children[i];

        if (child.tagName === 'OPTGROUP') {
          var group = document.createElement('div');
          group.setAttribute('role', 'group');
          group.className = 'ac-dropdown__group';
          var groupLabel = document.createElement('div');
          groupLabel.className = 'ac-dropdown__group-label';
          groupLabel.id = id + '-group-' + i;
          groupLabel.textContent = child.label;
          // aria-hidden on the visible text + aria-label on the group avoids
          // the label being announced twice, once as text and once as the name.
          groupLabel.setAttribute('aria-hidden', 'true');
          group.setAttribute('aria-label', child.label);
          group.appendChild(groupLabel);

          for (var j = 0; j < child.children.length; j++) {
            group.appendChild(buildRow(child.children[j], optionIndex++));
          }
          list.appendChild(group);
        } else if (child.tagName === 'OPTION') {
          list.appendChild(buildRow(child, optionIndex++));
        }
      }

      if (!select.options.length) {
        var empty = document.createElement('div');
        empty.className = 'ac-dropdown__empty';
        empty.textContent = emptyText;
        list.appendChild(empty);
      }

      syncValue();
      syncDisabled();
    }

    function syncValue() {
      var option = select.options[select.selectedIndex];
      valueEl.textContent = option ? option.textContent.trim() : emptyText;
      valueEl.classList.toggle('ac-dropdown__value--empty', !option);

      var allRows = list.querySelectorAll('[role="option"]');
      for (var i = 0; i < allRows.length; i++) {
        allRows[i].setAttribute(
          'aria-selected',
          String(Number(allRows[i].dataset.index) === select.selectedIndex),
        );
      }
    }

    function syncDisabled() {
      // aria-disabled, not the disabled attribute: the control stays focusable,
      // so a keyboard user can still reach it and hear why it is unavailable.
      toggle.setAttribute('aria-disabled', String(select.disabled));
      wrap.classList.toggle('ac-dropdown--disabled', select.disabled);
    }

    /* --- Positioning -------------------------------------------------------
       The panel is position:fixed and, where supported, in the top layer. That
       is what stops an ancestor with overflow:hidden or a transform from
       clipping it -- the failure the absolutely-positioned original had. */

    function position() {
      if (isSheet()) {
        // The sheet is laid out entirely in CSS; clear any inline anchoring.
        panel.style.top = '';
        panel.style.left = '';
        panel.style.width = '';
        panel.style.maxHeight = '';
        return;
      }

      var rect = toggle.getBoundingClientRect();
      var gap = 6;
      var margin = 8;
      var spaceBelow = window.innerHeight - rect.bottom - gap - margin;
      var spaceAbove = rect.top - gap - margin;
      var flipUp = spaceBelow < 200 && spaceAbove > spaceBelow;

      panel.style.width = rect.width + 'px';
      panel.style.left = Math.max(margin, Math.min(rect.left, window.innerWidth - rect.width - margin)) + 'px';
      panel.style.maxHeight = Math.max(120, flipUp ? spaceAbove : spaceBelow) + 'px';

      if (flipUp) {
        panel.style.top = '';
        panel.style.bottom = window.innerHeight - rect.top + gap + 'px';
      } else {
        panel.style.bottom = '';
        panel.style.top = rect.bottom + gap + 'px';
      }

      wrap.classList.toggle('ac-dropdown--up', flipUp);
    }

    /* --- Open / close ------------------------------------------------------ */

    function isOpen() {
      return toggle.getAttribute('aria-expanded') === 'true';
    }

    function open() {
      if (isOpen() || select.disabled) return;
      if (openInstance && openInstance !== api) openInstance.close(false);

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
      window.addEventListener('scroll', onScroll, true);

      // Focus the selected option so a screen reader announces the listbox and
      // where you are in it. Falling back to the first option when nothing is
      // selected keeps arrow keys predictable.
      var target = rows[indexOfSelected()] || rows[0];
      if (target) {
        target.focus();
        scrollRowIntoView(target);
      } else {
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
      wrap.classList.remove('ac-dropdown--up');
      if (openInstance === api) openInstance = null;

      document.removeEventListener('pointerdown', onDocumentPointerDown, true);
      window.removeEventListener('resize', position);
      window.removeEventListener('scroll', onScroll, true);

      // Focus has to go somewhere -- if we hid the element holding it without
      // moving it first, focus would fall to <body> and the user would lose
      // their place entirely.
      if (restoreFocus !== false) toggle.focus();
    }

    function onScroll() {
      position();
    }

    function onDocumentPointerDown(event) {
      if (!wrap.contains(event.target) && !panel.contains(event.target)) close(false);
    }

    function indexOfSelected() {
      var found = rowIndexes.indexOf(select.selectedIndex);
      return found === -1 ? 0 : found;
    }

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

    function choose(rowIndex) {
      var optionIndex = rowIndexes[rowIndex];
      if (typeof optionIndex !== 'number') return;

      if (select.selectedIndex !== optionIndex) {
        select.selectedIndex = optionIndex;
        // Dispatched on the native element, so existing handlers bound to the
        // <select> fire exactly as they did before this was enhanced.
        select.dispatchEvent(new Event('input', { bubbles: true }));
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }

      syncValue();
      close();
    }

    /* --- Type-ahead --------------------------------------------------------- */

    var buffer = '';
    var bufferTime = 0;

    function typeAhead(char) {
      var now = Date.now();
      buffer = (now - bufferTime > 800 ? '' : buffer) + char.toLowerCase();
      bufferTime = now;

      for (var i = 0; i < rows.length; i++) {
        var text = select.options[rowIndexes[i]].textContent.trim().toLowerCase();
        if (text.indexOf(buffer) === 0) {
          if (isOpen()) focusRow(i);
          else choose(i);
          return;
        }
      }
    }

    /* --- Events -------------------------------------------------------------- */

    function onToggleClick() {
      if (select.disabled) return;
      if (isOpen()) close();
      else open();
    }

    function onToggleKeydown(event) {
      if (select.disabled) return;
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

      if (key.length === 1 && /\S/.test(key)) {
        event.preventDefault();
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
        if (index > -1) choose(index);
      } else if (key === 'Escape') {
        event.preventDefault();
        // Stop it here, or a surrounding dialog closes at the same time.
        event.stopPropagation();
        close();
      } else if (key === 'Tab') {
        // Move focus back to the toggle first, then let the browser continue
        // tabbing from there -- otherwise focus is on an element we are hiding.
        close();
      } else if (key.length === 1 && /\S/.test(key)) {
        event.preventDefault();
        typeAhead(key);
      }
    }

    function onListClick(event) {
      var row = event.target.closest('[role="option"]');
      if (!row) return;
      if (row.getAttribute('aria-disabled') === 'true') return;
      var index = rows.indexOf(row);
      if (index > -1) choose(index);
    }

    function onListPointerMove(event) {
      // Only follow a real mouse. On touch this fires during a scroll drag and
      // would yank focus to whatever passed under the finger.
      if (event.pointerType !== 'mouse') return;
      var row = event.target.closest('[role="option"]');
      if (!row || row.getAttribute('aria-disabled') === 'true') return;
      var index = rows.indexOf(row);
      if (index > -1 && document.activeElement !== rows[index]) rows[index].focus();
    }

    function onSheetClose() {
      close();
    }

    function onNativeChange() {
      syncValue();
    }

    toggle.addEventListener('click', onToggleClick);
    toggle.addEventListener('keydown', onToggleKeydown);
    panel.addEventListener('keydown', onPanelKeydown);
    list.addEventListener('click', onListClick);
    list.addEventListener('pointermove', onListPointerMove);
    sheetClose.addEventListener('click', onSheetClose);
    select.addEventListener('change', onNativeChange);

    // Mirror the native element's own `hidden` and `disabled` so app code that
    // toggles them keeps working without knowing this wrapper exists.
    var observer = new MutationObserver(function () {
      wrap.hidden = select.hidden;
      syncDisabled();
      if (select.disabled && isOpen()) close(false);
    });
    observer.observe(select, { attributes: true, attributeFilter: ['hidden', 'disabled'] });
    wrap.hidden = select.hidden;

    var api = {
      /** Re-read the <select> after its options changed. */
      rebuild: rebuild,
      /** Re-read the current value after setting select.value programmatically. */
      sync: syncValue,
      open: open,
      close: close,
      isOpen: isOpen,
      /** The enhanced wrapper, if you need to position something relative to it. */
      element: wrap,
      destroy: function () {
        close(false);
        observer.disconnect();
        toggle.removeEventListener('click', onToggleClick);
        toggle.removeEventListener('keydown', onToggleKeydown);
        panel.removeEventListener('keydown', onPanelKeydown);
        list.removeEventListener('click', onListClick);
        list.removeEventListener('pointermove', onListPointerMove);
        sheetClose.removeEventListener('click', onSheetClose);
        select.removeEventListener('change', onNativeChange);

        select.classList.remove('ac-dropdown__native');
        select.removeAttribute('aria-hidden');
        select.tabIndex = 0;
        wrap.parentNode.insertBefore(select, wrap);
        wrap.remove();
        delete select._acDropdown;
      },
    };

    select._acDropdown = api;
    rebuild();
    return api;
  }

  global.AC = global.AC || {};
  global.AC.createDropdown = createDropdown;

  /* --- Auto-init. Delete this block if you initialize manually. -------------- */
  function initAll(scope) {
    (scope || document).querySelectorAll('select[data-ac-dropdown]').forEach(function (el) {
      createDropdown(el);
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
