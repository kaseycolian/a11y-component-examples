/* theme-service — brand-mark-theme.js
   Re-colors the header brand mark with the ACTIVE theme's tokens.

   Why this exists: brand-mark.svg already paints from var(--accent-pink) /
   var(--accent-green), so an INLINE reference would follow the theme for free.
   But the header loads it as an <img>, and a browser renders an image in an
   isolated document that the page's custom properties never reach — on its own
   the <img> always shows the brand fallbacks baked into the file. So we read the
   resolved tokens off <html>, inline them onto the SVG root as custom
   properties, and hand the <img> a data: URI instead.

   Why <img> and not <svg><use href="brand-mark.svg#brand-mark">: an external
   <use> is a cross-origin reference, which browsers block when a page is opened
   straight from disk — verified in Chrome, where the mark then renders as
   nothing at all (0x0, no shadow content). docs/overview.html and
   themes/preview.html are both meant to open from file://, and a blank spot in
   the lockup is worse than static brand colors.

   Progressive enhancement: the plain <img> already shows the mark in its default
   brand colors. This upgrades it, and re-runs whenever data-theme changes. If
   anything fails (fetch blocked on file://, CSP, a parse error) the static src
   simply stands. The mark's glow is a CSS filter on the element, so it keeps
   following the theme either way.

   CSP note: the generated mark is a data: URI, so a strict policy needs
   `img-src data:`.

   Sibling of favicon-theme.js, which does the same trick for the tab icon. */
(function () {
  var script = document.currentScript;
  if (!script) return;

  // brand-mark.svg is a sibling of this script, so the URL holds wherever the
  // assets/ directory is mounted (repo layout or the deployed _site/).
  var svgUrl = new URL('brand-mark.svg', script.src).href;

  // The tokens brand-mark.svg looks up. Stamping them by their own names keeps
  // the file's var() lookups intact — we're only carrying the resolved values
  // across the image boundary, not renaming anything.
  var TOKENS = ['--accent-pink', '--accent-green'];

  var source = null;

  function paint() {
    if (!source) return;
    var marks = document.querySelectorAll('img.brand-mark');
    if (!marks.length) return;
    try {
      var cs = getComputedStyle(document.documentElement);
      var doc = new DOMParser().parseFromString(source, 'image/svg+xml');
      if (doc.querySelector('parsererror')) return;
      var svg = doc.documentElement;

      var decl = '';
      for (var i = 0; i < TOKENS.length; i++) {
        var value = cs.getPropertyValue(TOKENS[i]).trim();
        if (value) decl += TOKENS[i] + ':' + value + ';';
      }
      if (!decl) return;
      svg.setAttribute('style', decl);

      var href = 'data:image/svg+xml,' +
        encodeURIComponent(new XMLSerializer().serializeToString(svg));
      for (var j = 0; j < marks.length; j++) marks[j].src = href;
    } catch (e) {}
  }

  fetch(svgUrl)
    .then(function (r) { return r.text(); })
    .then(function (text) { source = text; paint(); })
    .catch(function () {});

  new MutationObserver(paint).observe(document.documentElement, {
    attributes: true, attributeFilter: ['data-theme']
  });
})();
