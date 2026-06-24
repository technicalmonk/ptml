/* PTML Thumbnail Generator — renders slides as SVG data URLs */

(function () {
  'use strict';

  function generate(deckContent, theme) {
    try {
      var parsed = PTML.parse(deckContent);
      if (!parsed || !parsed.slidesHTML) return null;
      var slides = parsed.slidesHTML.split('</section>');
      var slide1 = slides[0];
      if (!slide1) return null;
      var title = '';
      var subtitle = '';
      var h1Match = slide1.match(/<h1[^>]*>(.*?)<\/h1>/);
      var h2Match = slide1.match(/<h2[^>]*>(.*?)<\/h2>/);
      var ledeMatch = slide1.match(/<p class="lede">(.*?)<\/p>/);
      if (h1Match) title = stripTags(h1Match[1]);
      else if (h2Match) title = stripTags(h2Match[1]);
      if (ledeMatch) subtitle = stripTags(ledeMatch[1]);
      if (!title) title = 'Untitled';
      var svg = [
        '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180">',
        '  <rect width="320" height="180" fill="#f8f9fa" rx="8" ry="8"/>',
        '  <rect x="16" y="12" width="288" height="14" rx="3" fill="' + themeColor(theme) + '" opacity="0.12"/>',
        '  <text x="160" y="75" text-anchor="middle" font-family="Inter,-apple-system,sans-serif" font-size="22" font-weight="700" fill="#111827">' + svgEsc(subtitle ? trunc(subtitle, 40) : title) + '</text>',
        subtitle ? '  <text x="160" y="105" text-anchor="middle" font-family="Inter,-apple-system,sans-serif" font-size="11" fill="#9ca3af">' + svgEsc(trunc(subtitle, 55)) + '</text>' : '',
        '  <line x1="80" y1="130" x2="240" y2="130" stroke="#e5e7eb" stroke-width="1"/>',
        '</svg>'
      ].join('\n');
      return 'data:image/svg+xml,' + encodeURIComponent(svg);
    } catch (e) { return null; }
  }

  function stripTags(html) { return html.replace(/<[^>]*>/g, '').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').trim(); }
  function svgEsc(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function trunc(s, max) { return s && s.length > max ? s.substring(0, max - 1) + '\u2026' : s || ''; }

  function themeColor(theme) {
    var colors = { 'dracula':'#bd93f9','tokyo-night':'#7aa2f7','pitch-deck-vc':'#3b6cff',
      'aurora':'#7c3aed','nord':'#88c0d0','corporate-clean':'#2563eb','cyberpunk-neon':'#00ff88',
      'minimal-white':'#0066ff' };
    return colors[theme] || '#0066ff';
  }

  function updateDeckThumbnail(deck) {
    if (!deck || !deck.content) return;
    try {
      var m = deck.content.match(/^theme:\s*(.+)$/m);
      var theme = m ? m[1].trim() : 'minimal-white';
      deck.thumbnail = generate(deck.content, theme);
    } catch(e) { deck.thumbnail = null; }
  }

  window.ThumbnailGen = { generate: generate, updateDeckThumbnail: updateDeckThumbnail };
})();

// ── Slide-level helpers (used by builder slides panel) ────────

function slideThumbSVG(title, subtitle, accent) {
  var c = accent || '#0066ff';
  var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="112" viewBox="0 0 200 112">' +
    '<rect width="200" height="112" fill="#1a1a1e" rx="6"/>' +
    '<rect x="12" y="10" width="176" height="8" rx="3" fill="' + c + '" opacity="0.15"/>' +
    '<text x="100" y="48" text-anchor="middle" font-family="Inter,sans-serif" font-size="14" font-weight="700" fill="#e0e0e6">' + svgEscape(truncate(title, 28)) + '</text>' +
    (subtitle ? '<text x="100" y="68" text-anchor="middle" font-family="Inter,sans-serif" font-size="9" fill="#555">' + svgEscape(truncate(subtitle, 40)) + '</text>' : '') +
    '<line x1="50" y1="86" x2="150" y2="86" stroke="#333" stroke-width="1"/>' +
    '</svg>';
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

function getThemeAccent(theme) {
  var map = { 'dracula':'#bd93f9','tokyo-night':'#7aa2f7','pitch-deck-vc':'#3b6cff',
    'aurora':'#7c3aed','nord':'#88c0d0','corporate-clean':'#2563eb',
    'cyberpunk-neon':'#00ff88','minimal-white':'#0066ff','terminal-green':'#00ff66',
    'editorial-serif':'#b91c1c','solarized-light':'#268bd2','rose-pine':'#eb6f92',
    'neo-brutalism':'#ff6b35','glassmorphism':'#6366f1','gruvbox-dark':'#fabd2f',
    'catppuccin-mocha':'#cba6f7','catppuccin-latte':'#1e66f5','blueprint':'#1e40af',
    'swiss-grid':'#111827','academic-paper':'#7c3aed','news-broadcast':'#dc2626',
    'retro-tv':'#22c55e','vaporwave':'#ec4899','midcentury':'#d97706',
    'y2k-chrome':'#06b6d4','engineering-whiteprint':'#3b82f6','bauhaus':'#ef4444',
    'memphis-pop':'#f59e0b','japanese-minimal':'#1e293b','rainbow-gradient':'#8b5cf6',
    'arctic-cool':'#0ea5e9','sunset-warm':'#f97316','soft-pastel':'#a78bfa',
    'sharp-mono':'#6b7280','xiaohongshu-white':'#f43f5e','magazine-bold':'#e11d48' };
  return map[theme] || '#0066ff';
}

function svgEscape(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function truncate(s, max) { return s && s.length > max ? s.substring(0, max - 1) + '\u2026' : s || ''; }

function getSlideSubtitle(md, idx) {
  var body = md.replace(/^---\n[\s\S]*?\n---\n/, '');
  var parts = body.split(/\n---\n?/);
  if (idx >= parts.length) return '';
  var slide = parts[idx];
  var lede = slide.match(/<p class="lede">(.+?)<\/p>/);
  if (lede) return lede[1].replace(/<[^>]*>/g, '');
  var dim = slide.match(/<p class="dim">(.+?)<\/p>/);
  if (dim) return dim[1].replace(/<[^>]*>/g, '');
  return '';
}