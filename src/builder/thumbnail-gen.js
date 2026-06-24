/* PTML Thumbnail Generator — renders slide 1 as SVG data URL */

(function () {
  'use strict';

  function generate(deckContent, theme) {
    try {
      // Parse the deck, extract slide 1
      var parsed = PTML.parse(deckContent);
      if (!parsed || !parsed.slidesHTML) return null;

      // Get just the first slide's HTML
      var slides = parsed.slidesHTML.split('</section>');
      var slide1 = slides[0];
      if (!slide1) return null;

      // Extract H1 or H2 for a simplified thumbnail
      var title = '';
      var subtitle = '';
      var h1Match = slide1.match(/<h1[^>]*>(.*?)<\/h1>/);
      var h2Match = slide1.match(/<h2[^>]*>(.*?)<\/h2>/);
      var ledeMatch = slide1.match(/<p class="lede">(.*?)<\/p>/);
      var dimMatch = slide1.match(/<p class="dim">(.*?)<\/p>/);

      if (h1Match) title = stripTags(h1Match[1]);
      else if (h2Match) title = stripTags(h2Match[1]);

      if (ledeMatch) subtitle = stripTags(ledeMatch[1]);
      else if (dimMatch) subtitle = stripTags(dimMatch[1]);

      if (!title) title = 'Untitled';

      // Generate clean SVG thumbnail (16:9 aspect)
      var svg = [
        '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180">',
        '  <rect width="320" height="180" fill="#f8f9fa" rx="8" ry="8"/>',
        '  <rect x="16" y="12" width="288" height="14" rx="3" fill="' + themeColor(theme) + '" opacity="0.12"/>',
        '  <text x="160" y="75" text-anchor="middle" font-family="Inter,-apple-system,sans-serif" font-size="22" font-weight="700" fill="#111827">' + svgEscape(truncate(title, 40)) + '</text>',
        subtitle ? '  <text x="160" y="105" text-anchor="middle" font-family="Inter,-apple-system,sans-serif" font-size="11" fill="#9ca3af">' + svgEscape(truncate(subtitle, 55)) + '</text>' : '',
        '  <line x1="80" y1="130" x2="240" y2="130" stroke="#e5e7eb" stroke-width="1"/>',
        '  <circle cx="40" cy="155" r="3" fill="#0066ff"/>',
        '  <rect x="48" y="150" width="44" height="10" rx="2" fill="#e5e7eb"/>',
        '  <rect x="96" y="150" width="32" height="10" rx="2" fill="#e5e7eb"/>',
        '</svg>'
      ].join('\n');

      return 'data:image/svg+xml,' + encodeURIComponent(svg);
    } catch (e) {
      return null;
    }
  }

  function stripTags(html) {
    return html.replace(/<[^>]*>/g, '').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').trim();
  }

  function svgEscape(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function truncate(s, max) {
    return s.length > max ? s.substring(0, max - 1) + '…' : s;
  }

  function themeColor(theme) {
    var colors = {
      'dracula': '#bd93f9', 'tokyo-night': '#7aa2f7', 'pitch-deck-vc': '#3b6cff',
      'aurora': '#7c3aed', 'nord': '#88c0d0', 'corporate-clean': '#2563eb',
      'cyberpunk-neon': '#00ff88', 'minimal-white': '#0066ff'
    };
    return colors[theme] || '#0066ff';
  }

  // Updated thumbnail: generates SVG from deck content and stores on deck object
  function updateDeckThumbnail(deck) {
    if (!deck || !deck.content) return;
    try {
      var theme = extractTheme(deck.content);
      deck.thumbnail = generate(deck.content, theme);
    } catch(e) {
      deck.thumbnail = null;
    }
  }

  function extractTheme(md) {
    var m = md.match(/^theme:\s*(.+)$/m);
    return m ? m[1].trim() : 'minimal-white';
  }

  window.ThumbnailGen = {
    generate: generate,
    updateDeckThumbnail: updateDeckThumbnail,
  };
})();