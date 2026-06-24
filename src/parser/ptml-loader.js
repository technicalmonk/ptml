/* PTML — Runtime Loader
 *
 * Auto-detects .md deck files and renders them as HTML presentations.
 * Usage in HTML:
 *   <div data-ptml src="presentation.md"></div>
 *   <script src="ptml-parser.js"></script>
 *   <script src="ptml-loader.js"></script>
 *
 * Or via URL: ptml-viewer.html?deck=presentation.md
 */

(function () {
  'use strict';

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  // Fetch and render a markdown deck
  function loadDeck(mdUrl, container, options) {
    options = options || {};
    var basePath = options.basePath || inferBasePath();

    return fetch(mdUrl)
      .then(function (r) {
        if (!r.ok) throw new Error('Failed to load deck: ' + mdUrl + ' (' + r.status + ')');
        return r.text();
      })
      .then(function (markdown) {
        var parsed = PTML.parse(markdown);
        var html = PTML.buildHTML(parsed, {
          basePath: basePath,
          theme: options.theme
        });

        // Replace entire document or inject into container
        if (container === document.documentElement) {
          document.open();
          document.write(html);
          document.close();
        } else {
          container.innerHTML = html;
        }

        // Load runtime scripts
        loadScript(basePath + '/runtime.js', function () {
          loadScript(basePath + '/animations/fx-runtime.js', function () {
            // Dispatch a load event so runtime.js initializes
            window.dispatchEvent(new Event('DOMContentLoaded'));
          });
        });

        return parsed;
      })
      .catch(function (err) {
        console.error('[PTML]', err);
        container.innerHTML = '<div style="padding:40px;color:#e0445a;font-family:monospace">' +
          '<h2>PTML Load Error</h2><pre>' + err.message + '</pre></div>';
      });
  }

  function loadScript(src, callback) {
    var s = document.createElement('script');
    s.src = src;
    s.onload = callback || function () {};
    s.onerror = function () {
      console.warn('[PTML] Failed to load script: ' + src);
      if (callback) callback();
    };
    document.head.appendChild(s);
  }

  function inferBasePath() {
    // Find the script tag for ptml-loader.js and derive base path
    var scripts = document.querySelectorAll('script[src]');
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].src;
      if (src.indexOf('ptml-loader') >= 0) {
        // base path is the parent of the parser directory
        // e.g., /src/parser/ptml-loader.js -> /src/engine
        return src.replace(/[^/]+$/, '').replace(/parser\/$/, 'engine');
      }
    }
    return '.';
  }

  // Auto-load: check URL params for ?deck=
  ready(function () {
    // Check for ?deck= URL parameter (viewer mode)
    var params = new URLSearchParams(location.search);
    var deckUrl = params.get('deck');

    if (deckUrl) {
      loadDeck(deckUrl, document.documentElement);
      return;
    }

    // Check for data-ptml elements
    var mounts = document.querySelectorAll('[data-ptml]');
    if (mounts.length > 0) {
      mounts.forEach(function (el) {
        var src = el.getAttribute('src') || el.getAttribute('data-src');
        if (src) loadDeck(src, el);
      });
    }
  });

  // Export
  window.PTMLLoader = { loadDeck: loadDeck };
})();
