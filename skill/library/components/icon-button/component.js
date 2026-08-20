/* ===========================================================================
   ICON BUTTON

   WHAT TO COPY
     [CORE]       the accessible name resolver. The one function here worth
                  lifting, and worth lifting as a dev-time assertion rather
                  than as runtime behavior.
     [NAMES]      example 3. Printing which source each name came from.
     [VOICE]      example 4. The SC 2.5.3 lookup, mocked.
     [SIZES]      example 5. Measuring the target and the glyph separately.
     [AUTO-INIT]  delete if you construct instances yourself.

   Copy the file whole for the library version.

   An icon button needs no JavaScript. It is a <button> with an attribute, and
   nothing in this file adds behavior to one — every section is this page
   checking a claim it makes rather than asking you to believe it.

   resolveName is the exception. Point it at your own icon buttons in a test
   and it fails the ones nobody labeled, which is the entire bug class this
   component exists for. It implements the accessible name computation in
   order for the simple cases here — aria-labelledby, aria-label, the element's
   own text with aria-hidden subtrees removed, then title. It does not follow
   labelledby chains, alt text, or CSS generated content, so it is a check and
   not a replacement for a real accessibility tree inspector.

   No dependencies. Plain IIFE, so a paste into a <script> tag works.
   =========================================================================== */
(function (global) {
  'use strict';

  /**
   * @param {HTMLElement} root a container holding one or more icon buttons.
   */
  function createIconButton(root) {
    // Idempotent: initializing twice would double up the listeners.
    if (!root || root._acIconButton) return root && root._acIconButton;

    /* === [CORE] the accessible name ====================================== */

    /**
     * The text an element contributes to a name, with the parts a screen reader
     * is told to skip removed. Cloned first, because the removal is a question
     * and not an edit.
     *
     * @param {Element} el
     * @returns {string}
     */
    function visibleText(el) {
      var copy = el.cloneNode(true);
      copy.querySelectorAll('[aria-hidden="true"]').forEach(function (node) {
        node.remove();
      });
      // Collapses the newlines and indentation the markup is written with, the
      // way the name computation does.
      return (copy.textContent || '').replace(/\s+/g, ' ').trim();
    }

    /**
     * @param {HTMLElement} el
     * @returns {{ name: string, from: string }} from is prose, for the readout.
     */
    function resolveName(el) {
      var by = el.getAttribute('aria-labelledby');
      if (by) {
        var text = by
          .split(/\s+/)
          .map(function (id) {
            var target = document.getElementById(id);
            return target ? visibleText(target) : '';
          })
          .join(' ')
          .trim();
        if (text) return { name: text, from: 'aria-labelledby' };
      }

      var label = el.getAttribute('aria-label');
      if (label && label.trim()) return { name: label.trim(), from: 'aria-label' };

      // Note that this asks the button, not its parent. A name on an ancestor
      // is never inherited by a child, which is the whole of example 3's
      // second case — nothing has to special-case it for it to fail.
      var own = visibleText(el);
      if (own) return { name: own, from: 'its own text' };

      var title = el.getAttribute('title');
      if (title && title.trim()) return { name: title.trim(), from: 'title, the last resort' };

      return { name: '', from: 'nothing' };
    }

    /**
     * Write a message into a status line. Shared by every example below.
     * @param {HTMLElement} node the pre-existing, initially empty role="status"
     * @param {string} text
     * @param {boolean} [bad] mark it as the failing case
     */
    function say(node, text, bad) {
      if (!node) return;
      node.textContent = text;
      // Written as well as colored: the color is gone under forced colors, and
      // it was never the thing carrying the meaning (SC 1.4.1).
      if (bad) node.setAttribute('data-ac-ib-bad', 'true');
      else node.removeAttribute('data-ac-ib-bad');
    }

    /* === [NAMES] example 3 =============================================== */

    var names = root.querySelector('[data-ac-ib-names]');
    var namesVerdict = names && names.querySelector('[data-ac-ib-names-verdict]');

    function measureNames() {
      if (!names) return;
      var unnamed = 0;

      names.querySelectorAll('[data-ac-ib-name]').forEach(function (btn) {
        var out = names.querySelector('[data-ac-ib-out="' + btn.dataset.acIbName + '"]');
        if (!out) return;

        var got = resolveName(btn);
        if (!got.name) unnamed += 1;

        out.textContent = got.name ? '"' + got.name + '" — from ' + got.from : 'no name — announces as "button"';
        if (got.name) out.removeAttribute('data-ac-ib-bad');
        else out.setAttribute('data-ac-ib-bad', 'true');
      });

      say(
        namesVerdict,
        unnamed === 0
          ? 'All four have a name.'
          : unnamed +
              ' of these four have no accessible name at all. They announce as "button", they pass ' +
              'every automated check that is looking for invalid markup, and the only way to find ' +
              'them is to ask each one what it is called.',
        unnamed > 0,
      );
    }

    /* === [VOICE] example 4 =============================================== */

    var voice = root.querySelector('[data-ac-ib-voice]');
    var voiceForm = voice && voice.querySelector('[data-ac-ib-voice-form]');
    var voiceLog = voice && voice.querySelector('[data-ac-ib-voice-log]');

    // What a speech engine strips before it starts looking for a control.
    var VERBS = /^(?:click|tap|press|push|touch|select)\s+/i;

    function onVoiceSubmit(event) {
      // The form exists so Enter in the field works. Nothing is being sent.
      event.preventDefault();

      var input = voiceForm.querySelector('input');
      var phrase = (input ? input.value : '').replace(VERBS, '').trim().toLowerCase();
      if (!phrase) {
        say(voiceLog, 'Type something to match.');
        return;
      }

      var hit = null;
      voice.querySelectorAll('[data-ac-ib-voice-btn]').forEach(function (btn) {
        if (hit) return;
        var got = resolveName(btn);
        if (got.name && got.name.toLowerCase().indexOf(phrase) !== -1) hit = got.name;
      });

      say(
        voiceLog,
        hit
          ? '"' + hit + '" matched "' + phrase + '", so voice control would activate it.'
          : 'Nothing is named "' +
              phrase +
              '". Voice control never reads the caption under the button — it matches what you say ' +
              'against the accessible name, so the word on the screen has to be in the name.',
        !hit,
      );
    }

    if (voiceForm) voiceForm.addEventListener('submit', onVoiceSubmit);

    /* === [SIZES] example 5 =============================================== */

    var sizes = root.querySelector('[data-ac-ib-sizes]');
    var sizesVerdict = sizes && sizes.querySelector('[data-ac-ib-sizes-verdict]');
    var FLOOR = 24; // SC 2.5.8, in CSS pixels.

    // Selected by the class that produced each one, so the readout cannot drift
    // out of step with the markup the way an index would.
    var SIZE_CASES = [
      { key: 'default', selector: '.ac-btn-icon:not(.ac-btn--sm):not(.ac-btn-icon--tiny)' },
      { key: 'sm', selector: '.ac-btn-icon.ac-btn--sm' },
      { key: 'tiny', selector: '.ac-btn-icon--tiny' },
    ];

    function box(el) {
      var rect = el.getBoundingClientRect();
      return Math.round(rect.width) + ' × ' + Math.round(rect.height);
    }

    function measureSizes() {
      if (!sizes) return;
      var under = [];

      SIZE_CASES.forEach(function (item) {
        var btn = sizes.querySelector(item.selector);
        var out = sizes.querySelector('[data-ac-ib-out="' + item.key + '"]');
        var glyphOut = sizes.querySelector('[data-ac-ib-out="' + item.key + '-glyph"]');
        if (!btn) return;

        var rect = btn.getBoundingClientRect();
        var glyph = btn.querySelector('.ac-btn-icon__glyph');
        var short = Math.round(rect.width) < FLOOR || Math.round(rect.height) < FLOOR;

        if (out) {
          out.textContent = box(btn);
          if (short) out.setAttribute('data-ac-ib-bad', 'true');
          else out.removeAttribute('data-ac-ib-bad');
        }
        if (glyphOut && glyph) glyphOut.textContent = box(glyph);
        if (short) under.push(resolveName(btn).name || 'the unnamed one');
      });

      say(
        sizesVerdict,
        under.length === 0
          ? 'All three clear ' + FLOOR + '×' + FLOOR + '.'
          : '"' +
              under.join('" and "') +
              '" is under ' +
              FLOOR +
              '×' +
              FLOOR +
              '. The glyph inside it is the same size as the one in the button twice its width — ' +
              'the target was never the icon, it was the padding around it.',
        under.length > 0,
      );
    }

    /* === [CORE] API ====================================================== */

    // Read after layout has settled. Measuring during construction can catch a
    // button mid-entrance and report a box it never actually has.
    function measureAll() {
      measureNames();
      measureSizes();
    }

    if (typeof global.requestAnimationFrame === 'function') {
      global.requestAnimationFrame(measureAll);
    } else {
      measureAll();
    }

    var api = {
      element: root,
      /** The one function worth lifting. See the file header. */
      resolveName: resolveName,
      /** Re-run both readouts, after a resize or a label change. */
      refresh: measureAll,
      destroy: function () {
        if (voiceForm) voiceForm.removeEventListener('submit', onVoiceSubmit);
        say(namesVerdict, '');
        say(voiceLog, '');
        say(sizesVerdict, '');
        delete root._acIconButton;
      },
    };

    root._acIconButton = api;
    return api;
  }

  global.AC = global.AC || {};
  global.AC.createIconButton = createIconButton;

  /* === [AUTO-INIT] delete this block if you construct instances yourself === */
  function initAll(scope) {
    (scope || document).querySelectorAll('[data-ac-icon-button]').forEach(function (el) {
      createIconButton(el);
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
