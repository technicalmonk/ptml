/* PTML Thumbnail Generator — renders slides as actual HTML in SVG foreignObject */

(function () {
  'use strict';

  var cssCache = null;

  function loadCSS(theme, callback) {
    if (cssCache && cssCache.theme === theme) { callback(cssCache.css); return; }
    var basePath = location.pathname.replace(/\/src\/builder\/.*/, '/src/engine');
    var urls = [
      basePath + '/fonts.css',
      basePath + '/base.css',
      basePath + '/themes/' + theme + '.css',
      basePath + '/animations/animations.css'
    ];
    var count = 0, parts = [];
    urls.forEach(function(url, i) {
      fetch(url).then(function(r){return r.text()}).then(function(css){
        parts[i] = css; count++;
        if (count === urls.length) { cssCache = {theme:theme, css:parts.join('\n')}; callback(parts.join('\n')); }
      }).catch(function(){ parts[i]=''; count++; if (count===urls.length){ cssCache={theme:theme, css:parts.join('\n')}; callback(parts.join('\n')); }});
    });
  }

  function renderSlide(slideHTML, css, width, height) {
    var w = width || 320, h = height || 180;
    var inner = slideHTML.replace(/^\s*<section[^>]*>/, '').replace(/<\/section>\s*$/, '').trim();
    var svg = [
      '<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'">',
      '<defs><style>'+css+'</style></defs>',
      '<foreignObject width="'+w+'" height="'+h+'">',
      '<div xmlns="http://www.w3.org/1999/xhtml" style="width:'+w+'px;height:'+h+'px;overflow:hidden">',
      '<div class="deck" style="position:relative;width:'+w+'px;height:'+h+'px;overflow:hidden">',
      '<section class="slide is-active" style="position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;padding:18px 24px;opacity:1;transform:none;pointer-events:auto;z-index:2">',
      inner,
      '</section></div></div></foreignObject></svg>'
    ].join('\n');
    return 'data:image/svg+xml,' + encodeURIComponent(svg);
  }

  function generate(deckContent, theme, callback) {
    try {
      var parsed = PTML.parse(deckContent);
      if (!parsed || !parsed.slidesHTML) { if(callback)callback(null); return null; }
      var slides = parsed.slidesHTML.split('</section>');
      var slide1 = slides[0];
      if (!slide1) { if(callback)callback(null); return null; }
      var t = theme || 'minimal-white';
      if (callback) { loadCSS(t, function(css){ callback(renderSlide(slide1+'</section>', css, 320, 180)); }); return null; }
      return simpleThumbnail(slide1, t);
    } catch(e) { if(callback)callback(null); return null; }
  }

  function simpleThumbnail(slideHTML, theme) {
    var title = '', c = getThemeAccent(theme);
    var h1 = slideHTML.match(/<h1[^>]*>(.*?)<\/h1>/);
    var h2 = slideHTML.match(/<h2[^>]*>(.*?)<\/h2>/);
    if (h1) title = h1[1].replace(/<[^>]*>/g,'');
    else if (h2) title = h2[1].replace(/<[^>]*>/g,'');
    if (!title) title = 'Slide';
    return 'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="320" height="180" fill="#f8f9fa" rx="8"/><text x="160" y="90" text-anchor="middle" font-size="20" font-weight="700" fill="#111827">'+title+'</text></svg>');
  }

  function updateDeckThumbnail(deck, callback) {
    if (!deck || !deck.content) return;
    var m = deck.content.match(/^theme:\s*(.+)$/m);
    generate(deck.content, m?m[1].trim():'minimal-white', function(dataUrl){
      if (dataUrl) deck.thumbnail = dataUrl;
      if (callback) callback(dataUrl);
    });
  }

  function getThemeAccent(theme) {
    var map = { dracula:'#bd93f9','tokyo-night':'#7aa2f7','pitch-deck-vc':'#3b6cff',
      aurora:'#7c3aed',nord:'#88c0d0','corporate-clean':'#2563eb','cyberpunk-neon':'#00ff88',
      'minimal-white':'#0066ff','terminal-green':'#00ff66','editorial-serif':'#b91c1c',
      'solarized-light':'#268bd2','rose-pine':'#eb6f92','neo-brutalism':'#ff6b35',
      'glassmorphism':'#6366f1','gruvbox-dark':'#fabd2f' };
    return map[theme] || '#0066ff';
  }

  window.ThumbnailGen = { generate:generate, updateDeckThumbnail:updateDeckThumbnail, loadCSS:loadCSS, renderSlide:renderSlide };
})();

// Slide-level helpers
var _slideCSS = null;
function loadSlideCSS(theme, callback) {
  if (_slideCSS && _slideCSS.theme===theme) { callback(_slideCSS.css); return; }
  var basePath = location.pathname.replace(/\/src\/builder\/.*/, '/src/engine');
  fetch(basePath+'/base.css').then(function(r){return r.text()}).then(function(b){
    fetch(basePath+'/themes/'+theme+'.css').then(function(r){return r.text()}).then(function(t){
      _slideCSS = {theme:theme, css:b+'\n'+t}; callback(b+'\n'+t);
    }).catch(function(){ _slideCSS={theme:theme, css:b}; callback(b); });
  }).catch(function(){ callback(''); });
}

function slideThumbSVG(title, subtitle, accent) {
  var c = accent || '#0066ff';
  return 'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="112"><rect width="200" height="112" fill="#1a1a1e" rx="6"/><rect x="12" y="10" width="176" height="8" rx="3" fill="'+c+'" opacity="0.15"/><text x="100" y="48" text-anchor="middle" font-size="14" font-weight="700" fill="#e0e0e6">'+(title||'Slide')+'</text><line x1="50" y1="86" x2="150" y2="86" stroke="#333" stroke-width="1"/></svg>');
}

function renderSlideThumbnail(markdown, slideIdx, theme, callback) {
  try {
    var parsed = PTML.parse(markdown);
    if (!parsed || !parsed.slidesHTML) { callback(null); return; }
    var slides = parsed.slidesHTML.split('</section>');
    if (slideIdx >= slides.length) { callback(null); return; }
    var inner = (slides[slideIdx]+'</section>').replace(/^\s*<section[^>]*>/, '').replace(/<\/section>\s*$/,'').trim();
    loadSlideCSS(theme, function(css){
      callback(ThumbnailGen.renderSlide('<section class="slide is-active" style="position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;padding:10px 14px;opacity:1;transform:none;pointer-events:auto;z-index:2">'+inner+'</section>', css, 200, 112));
    });
  } catch(e) { callback(null); }
}

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

function getThemeAccent(theme) {
  var map = { dracula:'#bd93f9','tokyo-night':'#7aa2f7','pitch-deck-vc':'#3b6cff',
    aurora:'#7c3aed',nord:'#88c0d0','corporate-clean':'#2563eb','cyberpunk-neon':'#00ff88',
    'minimal-white':'#0066ff','terminal-green':'#00ff66','editorial-serif':'#b91c1c',
    'solarized-light':'#268bd2','rose-pine':'#eb6f92','neo-brutalism':'#ff6b35',
    'glassmorphism':'#6366f1','gruvbox-dark':'#fabd2f','catppuccin-mocha':'#cba6f7',
    'catppuccin-latte':'#1e66f5','blueprint':'#1e40af','swiss-grid':'#111827',
    'academic-paper':'#7c3aed','news-broadcast':'#dc2626','retro-tv':'#22c55e',
    'vaporwave':'#ec4899','midcentury':'#d97706','y2k-chrome':'#06b6d4',
    'engineering-whiteprint':'#3b82f6','bauhaus':'#ef4444','memphis-pop':'#f59e0b',
    'japanese-minimal':'#1e293b','rainbow-gradient':'#8b5cf6','arctic-cool':'#0ea5e9',
    'sunset-warm':'#f97316','soft-pastel':'#a78bfa','sharp-mono':'#6b7280',
    'xiaohongshu-white':'#f43f5e','magazine-bold':'#e11d48' };
  return map[theme] || '#0066ff';
}