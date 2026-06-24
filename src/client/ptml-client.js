// PTML Client — storage + analytics + freemium gating
// All client-side for now, backed by localStorage. Swappable for API later.

(function () {
  'use strict';

  const STORAGE_KEY = 'ptml:decks';
  const ANALYTICS_KEY = 'ptml:analytics';
  const USER_KEY = 'ptml:user';

  const ALL_THEMES = [
    'minimal-white', 'editorial-serif', 'soft-pastel', 'sharp-mono',
    'arctic-cool', 'sunset-warm', 'catppuccin-latte', 'catppuccin-mocha',
    'dracula', 'tokyo-night', 'nord', 'solarized-light', 'gruvbox-dark',
    'rose-pine', 'neo-brutalism', 'glassmorphism', 'bauhaus', 'swiss-grid',
    'terminal-green', 'rainbow-gradient', 'aurora', 'blueprint', 'memphis-pop',
    'cyberpunk-neon', 'y2k-chrome', 'retro-tv', 'japanese-minimal',
    'vaporwave', 'midcentury', 'corporate-clean', 'academic-paper',
    'news-broadcast', 'pitch-deck-vc', 'magazine-bold', 'engineering-whiteprint',
    'xiaohongshu-white',
  ];

  // Font pairing metadata for each theme
  // { display, body, serif, mono }
  const THEME_FONTS = {
    'minimal-white':          { display: 'Inter', body: 'Inter', serif: 'Playfair Display', mono: 'JetBrains Mono' },
    'editorial-serif':        { display: 'Playfair Display', body: 'Lora', serif: 'Playfair Display', mono: 'JetBrains Mono' },
    'soft-pastel':            { display: 'Nunito', body: 'Nunito Sans', serif: 'Playfair Display', mono: 'JetBrains Mono' },
    'sharp-mono':             { display: 'Space Grotesk', body: 'DM Sans', serif: 'Playfair Display', mono: 'JetBrains Mono' },
    'arctic-cool':            { display: 'Montserrat', body: 'Open Sans', serif: 'Playfair Display', mono: 'JetBrains Mono' },
    'sunset-warm':            { display: 'DM Serif Display', body: 'Source Sans 3', serif: 'DM Serif Display', mono: 'JetBrains Mono' },
    'catppuccin-latte':       { display: 'Inter', body: 'Inter', serif: 'Playfair Display', mono: 'JetBrains Mono' },
    'catppuccin-mocha':       { display: 'Inter', body: 'Inter', serif: 'Playfair Display', mono: 'JetBrains Mono' },
    'dracula':                { display: 'Fira Sans', body: 'Fira Sans', serif: 'Playfair Display', mono: 'Fira Code' },
    'tokyo-night':            { display: 'Outfit', body: 'Inter', serif: 'Playfair Display', mono: 'JetBrains Mono' },
    'nord':                   { display: 'Rubik', body: 'Inter', serif: 'Playfair Display', mono: 'JetBrains Mono' },
    'solarized-light':        { display: 'Merriweather', body: 'Source Sans 3', serif: 'Merriweather', mono: 'JetBrains Mono' },
    'gruvbox-dark':           { display: 'Atkinson Hyperlegible', body: 'Atkinson Hyperlegible', serif: 'Playfair Display', mono: 'Fira Code' },
    'rose-pine':              { display: 'Inter', body: 'Inter', serif: 'Playfair Display', mono: 'JetBrains Mono' },
    'neo-brutalism':          { display: 'Archivo Black', body: 'Space Grotesk', serif: 'Playfair Display', mono: 'JetBrains Mono' },
    'glassmorphism':          { display: 'Poppins', body: 'Inter', serif: 'Playfair Display', mono: 'JetBrains Mono' },
    'bauhaus':                { display: 'Barlow Condensed', body: 'Barlow', serif: 'Playfair Display', mono: 'JetBrains Mono' },
    'swiss-grid':             { display: 'Inter', body: 'Inter', serif: 'Playfair Display', mono: 'JetBrains Mono' },
    'terminal-green':         { display: 'IBM Plex Mono', body: 'IBM Plex Sans', serif: 'Playfair Display', mono: 'IBM Plex Mono' },
    'rainbow-gradient':       { display: 'Fredoka', body: 'Nunito', serif: 'Playfair Display', mono: 'JetBrains Mono' },
    'aurora':                 { display: 'Outfit', body: 'Inter', serif: 'Playfair Display', mono: 'JetBrains Mono' },
    'blueprint':              { display: 'Roboto Mono', body: 'Roboto', serif: 'Playfair Display', mono: 'Roboto Mono' },
    'memphis-pop':            { display: 'Bangers', body: 'Open Sans', serif: 'Playfair Display', mono: 'JetBrains Mono' },
    'cyberpunk-neon':         { display: 'Orbitron', body: 'Rajdhani', serif: 'Playfair Display', mono: 'JetBrains Mono' },
    'y2k-chrome':             { display: 'Space Grotesk', body: 'Inter', serif: 'Playfair Display', mono: 'Space Mono' },
    'retro-tv':               { display: 'Playfair Display', body: 'Inter', serif: 'Playfair Display', mono: 'JetBrains Mono' },
    'japanese-minimal':       { display: 'Noto Serif JP', body: 'Noto Sans JP', serif: 'Noto Serif JP', mono: 'JetBrains Mono' },
    'vaporwave':              { display: 'Raleway', body: 'Inter', serif: 'Playfair Display', mono: 'JetBrains Mono' },
    'midcentury':             { display: 'Cormorant Garamond', body: 'Josefin Sans', serif: 'Cormorant Garamond', mono: 'JetBrains Mono' },
    'corporate-clean':        { display: 'Inter', body: 'Inter', serif: 'Playfair Display', mono: 'JetBrains Mono' },
    'academic-paper':         { display: 'Crimson Text', body: 'IBM Plex Sans', serif: 'Crimson Text', mono: 'JetBrains Mono' },
    'news-broadcast':         { display: 'Libre Baskerville', body: 'Source Sans 3', serif: 'Libre Baskerville', mono: 'JetBrains Mono' },
    'pitch-deck-vc':          { display: 'Inter', body: 'Inter', serif: 'Playfair Display', mono: 'JetBrains Mono' },
    'magazine-bold':          { display: 'Oswald', body: 'Roboto', serif: 'Playfair Display', mono: 'JetBrains Mono' },
    'engineering-whiteprint': { display: 'IBM Plex Mono', body: 'IBM Plex Sans', serif: 'Playfair Display', mono: 'IBM Plex Mono' },
    'xiaohongshu-white':      { display: 'Noto Serif SC', body: 'Noto Sans SC', serif: 'Noto Serif SC', mono: 'JetBrains Mono' },
  };

  // ── User / Plan ──────────────────────────────────────────────
  function getUser() {
    try { return JSON.parse(localStorage.getItem(USER_KEY)) || null; }
    catch (e) { return null; }
  }

  function setUser(user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  function getPlan() {
    const user = getUser();
    return user ? user.plan : 'free';
  }

  function isPro() {
    return getPlan() === 'pro';
  }

  const FREE_LIMITS = {
    maxSlides: 10,
    maxDecks: 3,
    themes: ['minimal-white', 'pitch-deck-vc', 'dracula', 'tokyo-night', 'aurora', 'corporate-clean'],
    canExportPDF: false,
    canImportPPTX: false,
    canUseDesignAgent: false,
    canUseReviewAgent: false,
    analyticsLevel: 'basic',
  };

  const PRO_LIMITS = {
    maxSlides: Infinity,
    maxDecks: Infinity,
    themes: null, // null = all themes
    canExportPDF: true,
    canImportPPTX: true,
    canUseDesignAgent: true,
    canUseReviewAgent: true,
    analyticsLevel: 'enriched',
  };

  function getLimits() {
    return isPro() ? PRO_LIMITS : FREE_LIMITS;
  }

  function getAvailableThemes() {
    const limits = getLimits();
    if (!limits.themes) return ALL_THEMES;
    return limits.themes;
  }

  // ── Deck Storage ──────────────────────────────────────────────
  function getDecks() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch (e) { return []; }
  }

  function getDeck(id) {
    return getDecks().find(d => d.id === id) || null;
  }

  function saveDeck(deck) {
    const decks = getDecks();
    const idx = decks.findIndex(d => d.id === deck.id);
    deck.updatedAt = new Date().toISOString();
    if (idx >= 0) decks[idx] = deck;
    else {
      deck.createdAt = deck.createdAt || new Date().toISOString();
      decks.push(deck);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(decks));
    return deck;
  }

  function deleteDeck(id) {
    const decks = getDecks().filter(d => d.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(decks));
  }

  function generateId() {
    return 'deck_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
  }

  // ── Analytics ────────────────────────────────────────────────
  function getAnalytics(deckId) {
    try {
      const all = JSON.parse(localStorage.getItem(ANALYTICS_KEY)) || {};
      return all[deckId] || { views: [], uniqueViewers: 0 };
    } catch (e) {
      return { views: [], uniqueViewers: 0 };
    }
  }

  function recordView(deckId, viewerId) {
    const all = {};
    try { Object.assign(all, JSON.parse(localStorage.getItem(ANALYTICS_KEY)) || {}); } catch (e) {}
    if (!all[deckId]) all[deckId] = { views: [], uniqueViewers: 0 };

    const view = {
      timestamp: new Date().toISOString(),
      viewerId: viewerId || 'anonymous',
      slide: 1,
    };
    all[deckId].views.push(view);

    // Count unique viewers
    const uniqueIds = new Set(all[deckId].views.map(v => v.viewerId));
    all[deckId].uniqueViewers = uniqueIds.size;
    all[deckId].totalViews = all[deckId].views.length;

    localStorage.setItem(ANALYTICS_KEY, JSON.stringify(all));
    return all[deckId];
  }

  function getAnalyticsSummary(deckId) {
    const data = getAnalytics(deckId);
    const views = data.views || [];
    const plan = getPlan();

    if (plan === 'free') {
      // Free: only view count + date/time
      return {
        totalViews: views.length,
        uniqueViewers: data.uniqueViewers,
        lastViewed: views.length > 0 ? views[views.length - 1].timestamp : null,
        level: 'basic',
        // Mask viewer details for free users
        recentViews: views.slice(-5).map(v => ({
          date: v.timestamp.split('T')[0],
          time: v.timestamp.split('T')[1].split('.')[0],
        })),
      };
    }

    // Pro: enriched analytics
    const byDay = {};
    views.forEach(v => {
      const day = v.timestamp.split('T')[0];
      byDay[day] = (byDay[day] || 0) + 1;
    });

    return {
      totalViews: views.length,
      uniqueViewers: data.uniqueViewers,
      lastViewed: views.length > 0 ? views[views.length - 1].timestamp : null,
      level: 'enriched',
      recentViews: views.slice(-20).map(v => ({
        timestamp: v.timestamp,
        viewerId: v.viewerId,
        slide: v.slide,
      })),
      viewsByDay: byDay,
      avgViewsPerDay: Object.keys(byDay).length > 0
        ? (views.length / Object.keys(byDay).length).toFixed(1)
        : 0,
    };
  }

  // ── Export ────────────────────────────────────────────────────
  function exportHTML(markdown, theme, embed) {
    const parsed = window.PTML.parse(markdown);
    return window.PTML.buildHTML(parsed, { basePath: '.', theme: theme, embed: embed });
  }

  // ── Public API ───────────────────────────────────────────────
  window.PTMLClient = {
    // User
    getUser, setUser, getPlan, isPro, getLimits, getAvailableThemes,
    // Decks
    getDecks, getDeck, saveDeck, deleteDeck, generateId,
    // Analytics
    recordView, getAnalytics, getAnalyticsSummary,
    // Export
    exportHTML,
    // Constants
    ALL_THEMES,
    THEME_FONTS,
  };

})();
