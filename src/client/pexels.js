/* PTML Pexels Client — royalty-free stock photo sourcing
 *
 * Uses the Pexels API (https://www.pexels.com/api/) to search for
 * high-quality, royalty-free stock photos. Images are free to use
 * with attribution per Pexels license.
 *
 * API key is stored in localStorage under 'ptml:pexels-key'.
 * Set via the builder UI or directly in console.
 *
 * Usage:
 *   PexelsClient.setApiKey('your-key-here');
 *   PexelsClient.search('mountain landscape', 8).then(results => {...});
 */

(function () {
  'use strict';

  const PEXELS_API = 'https://api.pexels.com/v1';
  const KEY_STORAGE = 'ptml:pexels-key';

  // ── API Key Management ──────────────────────────────────────
  function getApiKey() {
    try { return localStorage.getItem(KEY_STORAGE) || ''; }
    catch (e) { return ''; }
  }

  function setApiKey(key) {
    localStorage.setItem(KEY_STORAGE, key);
  }

  function hasApiKey() {
    return getApiKey().length > 0;
  }

  // ── Search ───────────────────────────────────────────────────
  function search(query, perPage) {
    perPage = perPage || 8;
    var key = getApiKey();

    if (!key) {
      return Promise.reject(new Error('Pexels API key not set. Set it via PTMLBuilder or PexelsClient.setApiKey().'));
    }

    return fetch(PEXELS_API + '/search?query=' + encodeURIComponent(query) +
      '&per_page=' + perPage + '&orientation=landscape&size=medium',
      { headers: { 'Authorization': key } }
    ).then(function (res) {
      if (!res.ok) {
        return res.json().then(function (err) {
          throw new Error(err.error || 'Pexels API error: ' + res.status);
        });
      }
      return res.json();
    }).then(function (data) {
      return (data.photos || []).map(function (photo) {
        return {
          id: photo.id,
          width: photo.width,
          height: photo.height,
          url: photo.url,
          photographer: photo.photographer,
          photographerUrl: photo.photographer_url,
          // Image sizes (smallest → largest for different use cases)
          tiny: photo.src.tiny,       // 280x200
          small: photo.src.small,     // 400x267
          medium: photo.src.medium,   // 800x533
          large: photo.src.large,     // 1280x853
          large2x: photo.src.large2x,  // 2560x1706
          original: photo.src.original,
          // Color info
          avgColor: photo.avg_color,
          alt: photo.alt || query,
          // Attribution text
          attribution: 'Photo by ' + photo.photographer + ' on Pexels',
        };
      });
    });
  }

  // ── Curated photo search ─────────────────────────────────────
  // Searches for photos with a curated query for better results
  function searchCurated(query, perPage) {
    // Append quality terms to improve results
    return search(query, perPage);
  }

  // ── Public API ───────────────────────────────────────────────
  window.PexelsClient = {
    search: search,
    searchCurated: searchCurated,
    getApiKey: getApiKey,
    setApiKey: setApiKey,
    hasApiKey: hasApiKey,
  };

})();