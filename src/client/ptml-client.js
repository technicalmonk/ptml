// PTML Client — storage + analytics via API
// Uses /api/* endpoints (Vercel serverless + Neon Postgres).
// Falls back to localStorage when offline or for anonymous users.

(function () {
  'use strict';

  const USER_KEY = 'ptml:user';
  const TOKEN_KEY = 'ptml_token';
  const LOCAL_DECKS_KEY = 'ptml:decks';

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

  // ── Token management ──────────────────────────────────────────
  function getToken() {
    return localStorage.getItem(TOKEN_KEY) || null;
  }

  function setToken(token) {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  }

  function authHeaders() {
    var token = getToken();
    return token ? { 'Authorization': 'Bearer ' + token } : {};
  }

  // ── User / Plan ──────────────────────────────────────────────
  function getUser() {
    try { return JSON.parse(localStorage.getItem(USER_KEY)) || null; }
    catch (e) { return null; }
  }

  function setUser(user) {
    if (user) {
      user.plan = 'pro';
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_KEY);
      setToken(null);
    }
  }

  function isLoggedIn() {
    return !!getToken() && !!getUser();
  }

  // Check session with server (async)
  async function checkSession() {
    if (!getToken()) return null;
    try {
      var resp = await fetch('/api/auth', {
        headers: authHeaders()
      });
      if (resp.ok) {
        var data = await resp.json();
        setUser(data.user);
        return data.user;
      } else {
        // Token expired or invalid
        setUser(null);
        return null;
      }
    } catch (e) {
      // Network error — return cached user
      return getUser();
    }
  }

  // Sign up
  async function signup(name, email, password) {
    var resp = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'signup', name, email, password })
    });
    var data = await resp.json();
    if (!resp.ok) throw new Error(data.error || 'Signup failed');
    setUser(data.user);
    setToken(data.token);
    return data.user;
  }

  // Sign in
  async function signin(email, password) {
    var resp = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'signin', email, password })
    });
    var data = await resp.json();
    if (!resp.ok) throw new Error(data.error || 'Signin failed');
    setUser(data.user);
    setToken(data.token);
    return data.user;
  }

  // Sign out
  function signout() {
    setUser(null);
  }

  function getPlan() { return 'pro'; }
  function isPro() { return true; }

  const PLAN_LIMITS = {
    maxSlides: Infinity,
    maxDecks: Infinity,
    themes: null,
    canExportPDF: true,
    canImportPPTX: true,
    canUseDesignAgent: true,
    canUseReviewAgent: true,
    analyticsLevel: 'enriched',
  };

  function getLimits() { return PLAN_LIMITS; }
  function getAvailableThemes() { return ALL_THEMES; }

  // ── Deck Storage (API with localStorage fallback) ────────────

  async function getDecks() {
    if (isLoggedIn()) {
      try {
        var resp = await fetch('/api/decks', { headers: authHeaders() });
        if (resp.ok) {
          var data = await resp.json();
          return data.decks;
        }
      } catch (e) { /* fall through to localStorage */ }
    }
    // Fallback: localStorage
    try { return JSON.parse(localStorage.getItem(LOCAL_DECKS_KEY)) || []; }
    catch (e) { return []; }
  }

  async function getDeck(id) {
    // Try API first (for full content)
    if (isLoggedIn()) {
      try {
        var resp = await fetch('/api/decks?id=' + encodeURIComponent(id), { headers: authHeaders() });
        if (resp.ok) {
          var data = await resp.json();
          return data.deck || null;
        }
      } catch (e) { /* fall through */ }
    }
    // Fallback: localStorage
    var decks = getLocalDecks();
    return decks.find(function(d) { return d.id === id; }) || null;
  }

  async function saveDeck(deck) {
    deck.updatedAt = new Date().toISOString();

    if (isLoggedIn()) {
      try {
        var resp = await fetch('/api/decks', {
          method: 'POST',
          headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()),
          body: JSON.stringify(deck)
        });
        if (resp.ok) {
          var data = await resp.json();
          // Update deck with server-generated UUID (first save)
          if (data.deck && data.deck.id && data.deck.id !== deck.id) {
            deck.id = data.deck.id;
          }
          return data.deck || deck;
        }
      } catch (e) { /* fall through */ }
    }

    // Fallback: localStorage
    var decks = getLocalDecks();
    var idx = decks.findIndex(function(d) { return d.id === deck.id; });
    if (idx >= 0) decks[idx] = deck;
    else {
      deck.createdAt = deck.createdAt || new Date().toISOString();
      decks.push(deck);
    }
    localStorage.setItem(LOCAL_DECKS_KEY, JSON.stringify(decks));
    return deck;
  }

  async function deleteDeck(id) {
    if (isLoggedIn()) {
      try {
        var resp = await fetch('/api/decks?id=' + encodeURIComponent(id), {
          method: 'DELETE',
          headers: authHeaders()
        });
        if (resp.ok) return;
      } catch (e) { /* fall through */ }
    }
    // Fallback: localStorage
    var decks = getLocalDecks().filter(function(d) { return d.id !== id; });
    localStorage.setItem(LOCAL_DECKS_KEY, JSON.stringify(decks));
  }

  // Create share link
  async function createShareLink(deckId) {
    if (!isLoggedIn()) {
      // Fallback: base64 encode in URL
      return null; // caller handles this
    }
    var resp = await fetch('/api/share', {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()),
      body: JSON.stringify({ deckId: deckId })
    });
    var data = await resp.json();
    if (!resp.ok) throw new Error(data.error || 'Failed to create share link');
    return data;
  }

  // Resolve a share slug to deck content
  async function resolveShare(slug) {
    var resp = await fetch('/api/share?slug=' + encodeURIComponent(slug));
    var data = await resp.json();
    if (!resp.ok) throw new Error(data.error || 'Deck not found');
    return data.deck;
  }

  // localStorage helpers
  function getLocalDecks() {
    try { return JSON.parse(localStorage.getItem(LOCAL_DECKS_KEY)) || []; }
    catch (e) { return []; }
  }

  function generateId() {
    return 'deck_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
  }

  // ── Export ───────────────────────────────────────────────────
  window.PTMLClient = {
    // User / Auth
    getUser, setUser, getPlan, isPro, getLimits, getAvailableThemes,
    isLoggedIn, checkSession, signup, signin, signout,
    getToken, setToken,
    // Decks
    getDecks, getDeck, saveDeck, deleteDeck, generateId,
    // Sharing
    createShareLink, resolveShare,
    // Constants
    ALL_THEMES, THEME_FONTS,
  };

})();
