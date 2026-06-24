/* PTML Font Pairings — one per theme, loaded from Google Fonts */

window.PTMLFonts = {
  pairings: {
    'minimal-white':       { heading: 'Inter:700,800', body: 'Inter:400,500', css: "'Inter', sans-serif" },
    'editorial-serif':     { heading: 'Playfair Display:700,900', body: 'Source Serif 4:400,500', css: "'Playfair Display', serif" },
    'soft-pastel':         { heading: 'Nunito:700,800', body: 'Nunito:400,500', css: "'Nunito', sans-serif" },
    'sharp-mono':          { heading: 'Space Mono:700', body: 'Space Mono:400', css: "'Space Mono', monospace" },
    'arctic-cool':         { heading: 'Plus Jakarta Sans:600,700', body: 'Plus Jakarta Sans:400,500', css: "'Plus Jakarta Sans', sans-serif" },
    'sunset-warm':         { heading: 'DM Serif Display:400', body: 'DM Sans:400,500', css: "'DM Serif Display', serif" },
    'catppuccin-latte':    { heading: 'Figtree:600,700', body: 'Figtree:400,500', css: "'Figtree', sans-serif" },
    'catppuccin-mocha':    { heading: 'Figtree:600,700', body: 'Figtree:400,500', css: "'Figtree', sans-serif" },
    'dracula':             { heading: 'Fira Code:600,700', body: 'Fira Sans:400,500', css: "'Fira Code', monospace" },
    'tokyo-night':         { heading: 'Outfit:600,700', body: 'Outfit:300,400', css: "'Outfit', sans-serif" },
    'nord':                { heading: 'Rubik:600,700', body: 'Rubik:400,500', css: "'Rubik', sans-serif" },
    'solarized-light':     { heading: 'Merriweather:700,900', body: 'Merriweather:300,400', css: "'Merriweather', serif" },
    'gruvbox-dark':        { heading: 'IBM Plex Mono:600,700', body: 'IBM Plex Sans:400,500', css: "'IBM Plex Mono', monospace" },
    'rose-pine':           { heading: 'Crimson Pro:600,700', body: 'Crimson Pro:300,400', css: "'Crimson Pro', serif" },
    'neo-brutalism':       { heading: 'Archivo Black:400', body: 'Archivo:400,500', css: "'Archivo Black', sans-serif" },
    'glassmorphism':       { heading: 'Satoshi:700,900', body: 'Satoshi:400,500', css: "'Satoshi', sans-serif" },
    'bauhaus':             { heading: 'Poppins:700,900', body: 'Poppins:300,400', css: "'Poppins', sans-serif" },
    'swiss-grid':          { heading: 'Inter Tight:600,700', body: 'Inter:400,500', css: "'Inter Tight', sans-serif" },
    'terminal-green':      { heading: 'Source Code Pro:700', body: 'Source Code Pro:400', css: "'Source Code Pro', monospace" },
    'rainbow-gradient':    { heading: 'Quicksand:600,700', body: 'Quicksand:400,500', css: "'Quicksand', sans-serif" },
    'aurora':              { heading: 'Raleway:700,800', body: 'Raleway:300,400', css: "'Raleway', sans-serif" },
    'blueprint':           { heading: 'Barlow Condensed:600,700', body: 'Barlow:400,500', css: "'Barlow Condensed', sans-serif" },
    'memphis-pop':         { heading: 'Fredoka One:400', body: 'Nunito Sans:400', css: "'Fredoka One', sans-serif" },
    'cyberpunk-neon':      { heading: 'Orbitron:700,900', body: 'Rajdhani:400,500', css: "'Orbitron', sans-serif" },
    'y2k-chrome':          { heading: 'Azeret Mono:700', body: 'Azeret Mono:300,400', css: "'Azeret Mono', monospace" },
    'retro-tv':            { heading: 'Press Start 2P:400', body: 'VT323:400', css: "'Press Start 2P', monospace" },
    'japanese-minimal':    { heading: 'Zen Kaku Gothic New:700,900', body: 'Zen Kaku Gothic New:300,400', css: "'Zen Kaku Gothic New', sans-serif" },
    'vaporwave':           { heading: 'Syncopate:700', body: 'Jost:300,400', css: "'Syncopate', sans-serif" },
    'midcentury':          { heading: 'Abril Fatface:400', body: 'Lato:300,400', css: "'Abril Fatface', serif" },
    'corporate-clean':     { heading: 'Lexend:600,700', body: 'Lexend:300,400', css: "'Lexend', sans-serif" },
    'academic-paper':      { heading: 'Crimson Text:600,700', body: 'Crimson Text:400', css: "'Crimson Text', serif" },
    'news-broadcast':      { heading: 'Bebas Neue:400', body: 'Open Sans:400,500', css: "'Bebas Neue', sans-serif" },
    'pitch-deck-vc':       { heading: 'Manrope:700,800', body: 'Manrope:400,500', css: "'Manrope', sans-serif" },
    'magazine-bold':       { heading: 'Anton:400', body: 'Work Sans:300,400', css: "'Anton', sans-serif" },
    'engineering-whiteprint': { heading: 'JetBrains Mono:600,700', body: 'JetBrains Mono:300,400', css: "'JetBrains Mono', monospace" },
    'xiaohongshu-white':   { heading: 'Noto Serif SC:700,900', body: 'Noto Sans SC:300,400', css: "'Noto Serif SC', serif" }
  },

  // Build Google Fonts URL for a set of themes
  buildFontURL: function(themeNames) {
    var families = new Set();
    var self = this;
    themeNames.forEach(function(t) {
      var p = self.pairings[t];
      if (p) {
        families.add(p.heading);
        families.add(p.body);
      }
    });
    if (families.size === 0) return '';
    return 'https://fonts.googleapis.com/css2?family=' +
      Array.from(families).map(function(f) {
        return f.replace(/ /g, '+');
      }).join('&family=') +
      '&display=swap';
  },

  // Inject font CSS into page
  inject: function(themeNames) {
    var url = this.buildFontURL(themeNames || Object.keys(this.pairings));
    if (!url) return;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url;
    link.id = 'ptml-fonts';
    document.head.appendChild(link);
  },

  // Get CSS font-family value for a theme
  getFontCSS: function(themeName) {
    var p = this.pairings[themeName];
    if (!p) return '';
    return [
      '--font-heading: ' + p.css + ';',
      '--font-body: ' + p.css + ';'
    ].join('\n');
  },

  // Get font preview name
  getFontName: function(themeName) {
    var p = this.pairings[themeName];
    if (!p) return 'System default';
    var m = p.heading.match(/^([^(]+)/);
    return m ? m[1].trim() : p.heading;
  }
};