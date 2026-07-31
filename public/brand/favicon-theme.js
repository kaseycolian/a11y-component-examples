/* theme-service — favicon-theme.js
   Re-colors the site favicon with the ACTIVE theme's tokens.

   Why this exists: the browser renders a favicon in an isolated context, so the
   page's CSS custom properties never reach it — linking favicon.svg on its own
   always paints the fallback colors baked into the file. So we read the
   resolved token values off <html>, inline them onto the SVG root as custom
   properties, and hand the browser a data: URI instead.

   Progressive enhancement: the static <link rel="icon"> in the page already
   shows the icon in its default colors. This upgrades it, and re-runs whenever
   data-theme changes. If anything fails (fetch blocked on file://, CSP, a parse
   error) the static link simply stands.

   CSP note: the generated icon is a data: URI, so a strict policy needs
   `img-src data:`. */
(function () {
  var script = document.currentScript;
  if (!script) return;

  // favicon.svg is a sibling of this script, so the URL holds wherever the
  // assets/ directory is mounted (repo layout or the deployed _site/).
  var svgUrl = new URL('favicon.svg', script.src).href;

  // custom property inside favicon.svg  ->  the theme token it should follow
  var MAP = {
    '--a11y-theme-primary':   '--accent-pink',
    '--a11y-theme-secondary': '--accent-blue',
    '--a11y-theme-accent':    '--accent-green',
    '--a11y-theme-bg':        '--bg'
  };

  var source = null;

  function paint() {
    if (!source) return;
    try {
      var cs = getComputedStyle(document.documentElement);
      var doc = new DOMParser().parseFromString(source, 'image/svg+xml');
      if (doc.querySelector('parsererror')) return;
      var svg = doc.documentElement;

      var decl = '';
      for (var prop in MAP) {
        var value = cs.getPropertyValue(MAP[prop]).trim();
        if (value) decl += prop + ':' + value + ';';
      }
      if (!decl) return;
      svg.setAttribute('style', decl);

      // Let viewBox drive the size; the source's width/height="100%" has no
      // viewport to resolve against once the SVG is a standalone icon.
      svg.removeAttribute('width');
      svg.removeAttribute('height');

      var href = 'data:image/svg+xml,' +
        encodeURIComponent(new XMLSerializer().serializeToString(svg));

      // Swapping href on the existing <link> doesn't reliably repaint the tab,
      // so append a fresh one and drop the old (append first = no icon flicker).
      var stale = document.querySelectorAll('link[rel~="icon"]');
      var link = document.createElement('link');
      link.rel = 'icon';
      link.type = 'image/svg+xml';
      link.href = href;
      document.head.appendChild(link);
      for (var i = 0; i < stale.length; i++) {
        if (stale[i].parentNode) stale[i].parentNode.removeChild(stale[i]);
      }
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
