/* PTML Pexels Image Picker — search royalty-free stock photos
 *
 * API key stored in localStorage as 'ptml:pexels-key'.
 * When unset, shows a prompt to enter it.
 */

(function () {
  'use strict';

  var DEFAULT_KEY = ''; // User provides their own

  function getKey() {
    return localStorage.getItem('ptml:pexels-key') || DEFAULT_KEY;
  }

  function setKey(k) {
    localStorage.setItem('ptml:pexels-key', k);
  }

  function hasKey() {
    return !!getKey();
  }

  function search(query, callback) {
    var key = getKey();
    if (!key) {
      showKeyPrompt(function() { search(query, callback); });
      return;
    }

    var url = 'https://api.pexels.com/v1/search?query=' +
      encodeURIComponent(query) + '&per_page=30&orientation=landscape';

    fetch(url, { headers: { Authorization: key } })
      .then(function(r) {
        if (!r.ok) throw new Error('Pexels API error: ' + r.status);
        return r.json();
      })
      .then(function(data) {
        var photos = (data.photos || []).map(function(p) {
          return {
            id: p.id,
            thumb: p.src.medium,
            full: p.src.large2x || p.src.large,
            original: p.src.original,
            alt: p.alt || 'Stock photo',
            photographer: p.photographer,
            photographerUrl: p.photographer_url,
            width: p.width,
            height: p.height
          };
        });
        callback(null, photos);
      })
      .catch(function(err) {
        callback(err.message, []);
      });
  }

  function showKeyPrompt(callback) {
    var modal = document.getElementById('modal-overlay');
    var content = document.getElementById('modal-content');

    content.innerHTML =
      '<h2 style="font-size:18px;margin-bottom:4px">Pexels API Key</h2>' +
      '<p style="color:var(--c-text-2);font-size:13px;margin-bottom:16px">' +
      'Enter your free Pexels API key to search royalty-free stock photos. ' +
      '<a href="https://www.pexels.com/api/" target="_blank">Get a key →</a></p>' +
      '<input class="input" id="pexels-key-input" placeholder="Paste your API key..." value="' +
      (getKey() || '') + '">' +
      '<div style="display:flex;gap:8px;margin-top:12px;justify-content:flex-end">' +
      '<button class="btn btn-ghost btn-sm" onclick="document.getElementById(\'modal-overlay\').classList.remove(\'show\')">Cancel</button>' +
      '<button class="btn btn-primary btn-sm" id="pexels-save-key">Save Key</button>' +
      '</div>';

    modal.classList.add('show');

    document.getElementById('pexels-save-key').onclick = function() {
      var key = document.getElementById('pexels-key-input').value.trim();
      if (key) setKey(key);
      modal.classList.remove('show');
      if (callback) callback();
    };
  }

  function showPicker(callback) {
    if (!hasKey()) {
      showKeyPrompt(function() { showPicker(callback); });
      return;
    }

    var modal = document.getElementById('modal-overlay');
    var content = document.getElementById('modal-content');

    content.innerHTML =
      '<h2 style="font-size:18px;margin-bottom:4px">Search Images</h2>' +
      '<p style="color:var(--c-text-2);font-size:13px;margin-bottom:12px">' +
      'Royalty-free stock photos from Pexels</p>' +
      '<div style="display:flex;gap:8px;margin-bottom:16px">' +
      '<input class="input" id="pexels-query" placeholder="Search photos..." style="flex:1">' +
      '<button class="btn btn-primary" id="pexels-search-btn">Search</button>' +
      '</div>' +
      '<div id="pexels-results" style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;max-height:50vh;overflow-y:auto">' +
      '<p style="color:var(--c-text-3);grid-column:1/-1;text-align:center;padding:40px">' +
      'Search for something — nature, office, technology, abstract...</p>' +
      '</div>' +
      '<div style="display:flex;gap:8px;margin-top:12px;justify-content:space-between">' +
      '<button class="btn btn-ghost btn-sm" id="pexels-change-key">Change API Key</button>' +
      '<button class="btn btn-ghost btn-sm" onclick="document.getElementById(\'modal-overlay\').classList.remove(\'show\')">Close</button>' +
      '</div>';

    modal.classList.add('show');

    var resultsDiv = document.getElementById('pexels-results');
    var queryInput = document.getElementById('pexels-query');

    function doSearch() {
      var q = queryInput.value.trim();
      if (!q) return;
      resultsDiv.innerHTML = '<p style="color:var(--c-text-3);grid-column:1/-1;text-align:center;padding:40px">Searching...</p>';

      search(q, function(err, photos) {
        if (err) {
          resultsDiv.innerHTML = '<p style="color:var(--c-red);grid-column:1/-1;text-align:center;padding:40px">' +
            'Error: ' + err + '</p>';
          return;
        }
        if (photos.length === 0) {
          resultsDiv.innerHTML = '<p style="color:var(--c-text-3);grid-column:1/-1;text-align:center;padding:40px">' +
            'No results. Try a different search.</p>';
          return;
        }
        resultsDiv.innerHTML = photos.map(function(p) {
          return '<div class="pexels-thumb" style="cursor:pointer;border-radius:8px;overflow:hidden;border:2px solid transparent;transition:all .15s" ' +
            'onmouseover="this.style.borderColor=\'var(--c-accent)\'" ' +
            'onmouseout="this.style.borderColor=\'transparent\'">' +
            '<img src="' + p.thumb + '" alt="' + p.alt + '" ' +
            'style="width:100%;aspect-ratio:16/9;object-fit:cover;display:block" ' +
            'onclick="window._pexelsSelect(\'' + p.original + '\',\'' + p.alt.replace(/'/g, "\\'") + '\',\'' + p.photographer.replace(/'/g, "\\'") + '\')">' +
            '<div style="padding:6px 8px;font-size:11px;color:var(--c-text-2)">' +
            'Photo by ' + p.photographer.split(' ')[0] + '</div>' +
            '</div>';
        }).join('');
      });
    }

    document.getElementById('pexels-search-btn').onclick = doSearch;
    queryInput.onkeydown = function(e) { if (e.key === 'Enter') doSearch(); };

    document.getElementById('pexels-change-key').onclick = function() {
      showKeyPrompt();
    };

    window._pexelsSelect = function(url, alt, photographer) {
      modal.classList.remove('show');
      var md = '![alt](url)';
      if (alt) md = '![' + alt + '](' + url + ')';
      else md = '![Image](' + url + ')';
      if (photographer) md += ' <!-- Photo by ' + photographer + ' from Pexels -->';
      if (callback) callback(md, url, alt);
      delete window._pexelsSelect;
    };
  }

  // API
  window.PexelsPicker = {
    show: showPicker,
    showKeyPrompt: showKeyPrompt,
    hasKey: hasKey,
    getKey: getKey,
    setKey: setKey
  };

})();