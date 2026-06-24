// PTML script loader — loads scripts in order
// Using external file because some browsers block inline scripts on page load
(function() {
  var scripts = [
    '../engine/runtime.js',
    '../parser/ptml-parser.js',
    '../client/ptml-client.js',
    'builder.js'
  ];
  function loadNext(i) {
    if (i >= scripts.length) return;
    var s = document.createElement('script');
    s.src = scripts[i];
    s.onload = function() { loadNext(i + 1); };
    s.onerror = function() { console.error('Failed to load: ' + scripts[i]); loadNext(i + 1); };
    document.head.appendChild(s);
  }
  loadNext(0);
})();
