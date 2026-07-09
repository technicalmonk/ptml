/* PTML Builder — main app controller
 *
 * Manages: deck CRUD, live preview, theme picker, slide nav,
 * analytics dashboard, export, freemium gating.
 */

(function () {
'use strict';

// ── State ─────────────────────────────────────────────────────
let currentDeck = null;
let currentView = 'decks'; // decks | theme | fonts | analytics | export
let saveTimer = null;

// ── DOM refs ───────────────────────────────────────────────────
var editor = document.getElementById('editor');
const preview = document.getElementById('preview');
const previewEmpty = document.getElementById('preview-empty');
const deckTitle = document.getElementById('deck-title');
const panelHeader = document.getElementById('panel-header');
const panelBody = document.getElementById('panel-body');
const modalOverlay = document.getElementById('modal-overlay');
const modalContent = document.getElementById('modal-content');
const toast = document.getElementById('toast');
const planBadge = document.getElementById('plan-badge');

// ── Init ───────────────────────────────────────────────────────
function init() {
  // Init user if not set
  if (!PTMLClient.getUser()) {
    PTMLClient.setUser({ id: 'user_' + Date.now(), name: 'Guest' });
  }
  updatePlanBadge();

  // Nav buttons
  document.getElementById('nav-decks').onclick = () => switchView('decks');
  document.getElementById('nav-theme').onclick = () => switchView('theme');
  document.getElementById('nav-fonts').onclick = () => switchView('fonts');
  document.getElementById('nav-analytics').onclick = () => switchView('analytics');
  document.getElementById('nav-export').onclick = () => switchView('export');

  // Brand logo → dashboard
  document.querySelector('.sidebar .brand').onclick = () => goDashboard();

  // Editor live preview
  editor.addEventListener('input', () => {
    updatePreview();
    scheduleAutosave();
  });

  // Init formatting toolbar
  PTMLToolbar.init(editor, {
    onUpdate: function(md) {
      if (currentDeck) currentDeck.content = md;
      updatePreview();
      scheduleAutosave();
    },
    onModeChange: function(newMode) {
      document.getElementById('mode-toggle').textContent = newMode === 'markdown' ? 'Markdown' : 'Text';
      editor = document.getElementById('editor');
    }
  });

  deckTitle.addEventListener('input', () => {
    if (currentDeck) {
      currentDeck.title = deckTitle.value;
      scheduleAutosave();
    }
  });

  // Dashboard signals: open specific deck, inspiration, or template chooser
  var openDeckId = localStorage.getItem('ptml:open-deck');
  var openInspiration = localStorage.getItem('ptml:open-inspiration');
  var newDeckFlag = localStorage.getItem('ptml:new-deck');
  localStorage.removeItem('ptml:open-deck');
  localStorage.removeItem('ptml:open-inspiration');
  localStorage.removeItem('ptml:new-deck');

  if (openDeckId) {
    var deck = PTMLClient.getDeck(openDeckId);
    if (deck) {
      loadDeck(deck.id);
      switchView('decks');
      return;
    }
  }

  if (openInspiration) {
    loadInspiration(openInspiration);
    return;
  }

  if (newDeckFlag === 'template-chooser') {
    TemplateChooser.show(function(template) {
      currentDeck = {
        id: PTMLClient.generateId(),
        title: template.title || 'Untitled Deck',
        content: template.content,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      PTMLClient.saveDeck(currentDeck);
      loadDeckUI();
      switchView('decks');
    });
    return;
  }

  // Fallback: Load most recent deck or show template chooser
  const decks = PTMLClient.getDecks();
  if (decks.length > 0) {
    loadDeck(decks[decks.length - 1].id);
    switchView('decks');
  } else {
    TemplateChooser.show(function(template) {
      currentDeck = {
        id: PTMLClient.generateId(),
        title: template.title || 'Untitled Deck',
        content: template.content,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      PTMLClient.saveDeck(currentDeck);
      loadDeckUI();
      switchView('decks');
    });
    return;
  }

}

// ── Views ──────────────────────────────────────────────────────
function switchView(view) {
  currentView = view;
  // Update sidebar active state
  document.querySelectorAll('.sidebar button').forEach(b => b.classList.remove('active'));
  const navMap = { decks: 'nav-decks', theme: 'nav-theme', fonts: 'nav-fonts', analytics: 'nav-analytics', export: 'nav-export' };
  if (navMap[view]) document.getElementById(navMap[view]).classList.add('active');

  if (view === 'decks') renderSlidesPanel();
  else if (view === 'theme') renderThemePanel();
  else if (view === 'fonts') renderFontsPanel();
  else if (view === 'analytics') renderAnalyticsPanel();
  else if (view === 'export') renderExportPanel();
}

// ── Slides Panel ───────────────────────────────────────────────
function renderSlidesPanel() {
  panelHeader.textContent = 'Slides';

  let html = `<button onclick="newDeck()" style="width:100%;padding:10px;border:1px dashed rgba(255,255,255,0.15);border-radius:8px;background:transparent;color:#666;font-size:12px;cursor:pointer">+ New Deck</button>`;

  if (currentDeck) {
    const slideCount = countSlides(currentDeck.content);
    html += `<div style="margin-top:16px"><div style="font-size:11px;color:#555;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px">Current Deck (${slideCount} slides)</div>`;
    for (let i = 0; i < slideCount; i++) {
      const title = getSlideTitle(currentDeck.content, i);
      const subtitle = getSlideSubtitle(currentDeck.content, i);
      html += `<div class="slide-thumb" onclick="goToSlide(${i})" style="background-image:url(${slideThumbSVG(title, subtitle, getThemeAccent(extractTheme(currentDeck.content)||'minimal-white'))});background-size:cover;background-position:center">
        <span class="slide-thumb-num">${i + 1}</span>
      </div>`;
    }
    html += '</div>';
  } else {
    html += '<div style="padding:20px;text-align:center;color:#555;font-size:13px">No deck open.<br>Create one or select from the Dashboard.</div>';
  }

  panelBody.innerHTML = html;
}

function renderThemePanel() {
  panelHeader.textContent = 'Theme';
  const all = PTMLClient.ALL_THEMES;
  const currentTheme = currentDeck ? extractTheme(currentDeck.content) : 'minimal-white';

  let html = '<div class="theme-grid">';
  all.forEach(theme => {
    const isActive = theme === currentTheme;
    html += `<div class="theme-chip ${isActive ? 'active' : ''}"
      onclick="setTheme('${theme}')">
      ${theme.replace(/-/g, ' ')}
    </div>`;
  });
  html += '</div>';

  panelBody.innerHTML = html;
}

function renderFontsPanel() {
  panelHeader.textContent = 'Fonts';
  if (!currentDeck) {
    panelBody.innerHTML = '<p style="color:#555;font-size:13px;padding:20px">No deck selected.</p>';
    return;
  }

  const currentTheme = extractTheme(currentDeck.content) || 'minimal-white';
  const fonts = PTMLClient.THEME_FONTS[currentTheme] || PTMLClient.THEME_FONTS['minimal-white'];

  let html = '<div style="margin-bottom:16px;padding:12px;background:#1a1a1e;border-radius:8px;border:1px solid rgba(255,255,255,0.06)">';
  html += '<div style="font-size:10px;color:#555;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px">Current Theme</div>';
  html += '<div style="font-size:14px;color:#e0e0e6;font-weight:600">' + currentTheme.replace(/-/g, ' ') + '</div>';
  html += '</div>';

  html += '<div style="display:flex;flex-direction:column;gap:12px">';

  // Display font
  html += '<div style="padding:10px 12px;background:#1a1a1e;border-radius:8px;border:1px solid rgba(255,255,255,0.06)">';
  html += '<div style="font-size:10px;color:#555;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px">Display / Headings</div>';
  html += '<div style="font-size:16px;font-weight:700;color:#e0e0e6">' + fonts.display + '</div>';
  html += '</div>';

  // Body font
  html += '<div style="padding:10px 12px;background:#1a1a1e;border-radius:8px;border:1px solid rgba(255,255,255,0.06)">';
  html += '<div style="font-size:10px;color:#555;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px">Body</div>';
  html += '<div style="font-size:14px;font-weight:400;color:#ccc">' + fonts.body + '</div>';
  html += '</div>';

  // Serif font
  html += '<div style="padding:10px 12px;background:#1a1a1e;border-radius:8px;border:1px solid rgba(255,255,255,0.06)">';
  html += '<div style="font-size:10px;color:#555;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px">Serif</div>';
  html += '<div style="font-size:14px;color:#aaa;font-style:italic">' + fonts.serif + '</div>';
  html += '</div>';

  // Mono font
  html += '<div style="padding:10px 12px;background:#1a1a1e;border-radius:8px;border:1px solid rgba(255,255,255,0.06)">';
  html += '<div style="font-size:10px;color:#555;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px">Code / Mono</div>';
  html += '<div style="font-size:13px;font-family:monospace;color:#a0d0ff">' + fonts.mono + '</div>';
  html += '</div>';

  html += '</div>';

  html += '<div style="margin-top:16px;padding:12px;background:rgba(59,108,255,0.08);border-radius:8px;border:1px solid rgba(59,108,255,0.15)">';
  html += '<div style="font-size:11px;color:#888;line-height:1.5">Fonts are paired with each theme. Change the theme to update the font pairing. All fonts are loaded from Google Fonts.</div>';
  html += '</div>';

  panelBody.innerHTML = html;
}

function renderAnalyticsPanel() {
  panelHeader.textContent = 'Analytics';
  if (!currentDeck) {
    panelBody.innerHTML = '<p style="color:#555;font-size:13px;padding:20px">No deck selected.</p>';
    return;
  }

  const summary = PTMLClient.getAnalyticsSummary(currentDeck.id);
  let html = '<div class="stats-grid">';
  html += `<div class="stat-card"><div class="stat-value">${summary.totalViews}</div><div class="stat-label">Total Views</div></div>`;
  html += `<div class="stat-card"><div class="stat-value">${summary.uniqueViewers || '—'}</div><div class="stat-label">Unique Viewers</div></div>`;
  html += '</div>';

  if (summary.lastViewed) {
    const date = new Date(summary.lastViewed);
    html += `<p style="color:#555;font-size:12px;margin-bottom:16px">Last viewed: ${date.toLocaleString()}</p>`;
  } else {
    html += '<p style="color:#555;font-size:12px;margin-bottom:16px">No views yet. Share your deck to start tracking.</p>';
  }

  if (summary.level === 'enriched' && summary.recentViews) {
    html += '<table class="analytics-table"><thead><tr><th>Timestamp</th><th>Viewer</th><th>Slide</th></tr></thead><tbody>';
    summary.recentViews.slice(-10).reverse().forEach(v => {
      html += `<tr><td>${v.timestamp ? new Date(v.timestamp).toLocaleString() : '—'}</td><td>${v.viewerId || '—'}</td><td>${v.slide || '—'}</td></tr>`;
    });
    html += '</tbody></table>';

    if (summary.avgViewsPerDay) {
      html += `<p style="color:#555;font-size:12px;margin-top:16px">Avg ${summary.avgViewsPerDay} views/day</p>`;
    }
  } else if (summary.recentViews && summary.recentViews.length > 0) {
    html += '<table class="analytics-table"><thead><tr><th>Date</th><th>Time</th></tr></thead><tbody>';
    summary.recentViews.forEach(v => {
      html += `<tr><td>${v.date}</td><td>${v.time}</td></tr>`;
    });
    html += '</tbody></table>';
  }

  panelBody.innerHTML = html;
}

function renderExportPanel() {
  panelHeader.textContent = 'Export';
  if (!currentDeck) {
    panelBody.innerHTML = '<p style="color:#555;font-size:13px;padding:20px">No deck selected.</p>';
    return;
  }

  let html = '<div style="display:flex;flex-direction:column;gap:12px">';

  // HTML export
  html += `<button onclick="exportDeck('html')" style="padding:14px;border:1px solid rgba(255,255,255,0.08);border-radius:10px;background:#1a1a1e;color:#e0e0e6;font-size:13px;cursor:pointer;text-align:left">
    <div style="font-weight:600;margin-bottom:2px">📄 Export as HTML</div>
    <div style="font-size:11px;color:#555">Standalone .html file with external assets</div>
  </button>`;

  // Embed (single file)
  html += `<button onclick="exportDeck('embed')" style="padding:14px;border:1px solid rgba(255,255,255,0.08);border-radius:10px;background:#1a1a1e;color:#e0e0e6;font-size:13px;cursor:pointer;text-align:left">
    <div style="font-weight:600;margin-bottom:2px">📦 Export as Single File (Embed)</div>
    <div style="font-size:11px;color:#555">All CSS/JS inlined — one self-contained file</div>
  </button>`;

  // PDF
  html += `<button onclick="exportDeck('pdf')"
    style="padding:14px;border:1px solid rgba(255,255,255,0.08);border-radius:10px;background:#1a1a1e;color:#e0e0e6;font-size:13px;cursor:pointer;text-align:left">
    <div style="font-weight:600;margin-bottom:2px">📄 Export as PDF</div>
    <div style="font-size:11px;color:#555">Print-ready PDF document</div>
  </button>`;

  // Share link
  html += `<button onclick="copyShareLink()" style="padding:14px;border:1px solid rgba(255,255,255,0.08);border-radius:10px;background:#1a1a1e;color:#e0e0e6;font-size:13px;cursor:pointer;text-align:left">
    <div style="font-weight:600;margin-bottom:2px">🔗 Copy Share Link</div>
    <div style="font-size:11px;color:#555">Share a link to the live viewer</div>
  </button>`;

  html += '</div>';

  panelBody.innerHTML = html;
}

// ── Deck operations ────────────────────────────────────────────
function newDeck() {
  currentDeck = {
    id: PTMLClient.generateId(),
    title: 'Untitled Deck',
    content: '---\ntheme: minimal-white\ntitle: Untitled Deck\n---\n\n# Welcome to PTML\n\nWrite your slides in Markdown here.\n\n---\n\n## Second Slide\n\n- Bullet one\n- Bullet two\n',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  PTMLClient.saveDeck(currentDeck);
  loadDeckUI();
  showToast('New deck created', 'success');
}

function loadDeck(id) {
  const deck = PTMLClient.getDeck(id);
  if (!deck) { showToast('Deck not found', 'error'); return; }
  currentDeck = deck;
  loadDeckUI();
  if (currentView === 'decks') renderSlidesPanel();
}

function loadDeckUI() {
  if (!currentDeck) return;
  deckTitle.value = currentDeck.title || 'Untitled';
  editor.value = currentDeck.content || '';
  updatePreview();
  // Default to Text (rich text) view
  setTimeout(function() { PTMLToolbar.switchToRichText(); }, 100);
}

function loadInspiration(id) {
  var map = {
    'insp-ptml': { file: '../examples/ptml-overview.md', title: 'PTML Overview' },
    'insp-code': { file: '../examples/code-showcase.md', title: 'Code Showcase' },
    'insp-min': { file: '../examples/minimal-deck.md', title: 'Minimal Deck' },
    'insp-pitch': { file: 'templates/pitch-deck.md', title: 'Pitch Deck' },
    'insp-tech': { file: 'templates/tech-talk.md', title: 'Tech Talk' },
    'insp-weekly': { file: 'templates/weekly-report.md', title: 'Weekly Report' },
  };
  var entry = map[id];
  if (!entry) { showToast('Inspiration not found', 'error'); return; }
  fetch(entry.file)
    .then(function(r) { return r.text(); })
    .then(function(md) {
      currentDeck = {
        id: PTMLClient.generateId(),
        title: entry.title,
        content: md,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      PTMLClient.saveDeck(currentDeck);
      loadDeckUI();
      switchView('decks');
    })
    .catch(function() { showToast('Failed to load inspiration', 'error'); });
}

function saveDeck() {
  if (!currentDeck) return;
  currentDeck.title = deckTitle.value;
  // Content is already synced by toolbar's onUpdate callback

  ThumbnailGen.updateDeckThumbnail(currentDeck);
  PTMLClient.saveDeck(currentDeck);
  showToast('Saved', 'success');
  if (currentView === 'decks') renderSlidesPanel();
}

function scheduleAutosave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    if (currentDeck) {
      currentDeck.title = deckTitle.value;
      // Content already synced by toolbar onUpdate
      ThumbnailGen.updateDeckThumbnail(currentDeck);
      PTMLClient.saveDeck(currentDeck);
    }
  }, 1500);
}

// ── Preview ────────────────────────────────────────────────────
function updatePreview() {
  if (!editor.value.trim()) {
    previewEmpty.style.display = 'flex';
    preview.style.display = 'none';
    return;
  }

  try {
    const parsed = PTML.parse(editor.value);
    const html = PTML.buildHTML(parsed, { basePath: '../engine' });
    preview.srcdoc = html;
    previewEmpty.style.display = 'none';
    preview.style.display = 'block';
  } catch (e) {
    console.error('[PTML Builder] Preview error:', e);
  }
}

// ── Theme ──────────────────────────────────────────────────────
function setTheme(theme) {
  if (!currentDeck) return;
  // Update theme in front matter
  const content = currentDeck.content;
  if (/^theme:\s*.+$/m.test(content)) {
    currentDeck.content = content.replace(/^theme:\s*.+$/m, 'theme: ' + theme);
  } else if (/^---\n[\s\S]*?\n---/m.test(content)) {
    // Has front matter but no theme line — add it
    currentDeck.content = content.replace(/^---\n/, `---\ntheme: ${theme}\n`);
  } else {
    // No front matter — prepend
    currentDeck.content = `---\ntheme: ${theme}\n---\n\n` + content;
  }
  editor.value = currentDeck.content;
  updatePreview();
  scheduleAutosave();
  renderThemePanel();
  showToast('Theme: ' + theme, 'success');
}

// ── Export ──────────────────────────────────────────────────────
function exportDeck(format) {
  if (!currentDeck) return;
  const theme = extractTheme(currentDeck.content) || 'minimal-white';

  if (format === 'html' || format === 'embed') {
    const parsed = PTML.parse(currentDeck.content);
    const html = PTML.buildHTML(parsed, { basePath: '.', theme: theme });
    const blob = new Blob([html], { type: 'text/html' });
    downloadBlob(blob, (currentDeck.title || 'deck').replace(/[^a-z0-9-]/gi, '-') + '.html');
    showToast('Exported as HTML', 'success');
  } else if (format === 'pdf') {
    // Generate HTML and open print dialog
    const parsed = PTML.parse(currentDeck.content);
    const html = PTML.buildHTML(parsed, { basePath: '../engine', theme: theme });
    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 500);
    showToast('Opening print dialog...', 'success');
  }
}

function copyShareLink() {
  if (!currentDeck) return;
  const url = location.origin + '/public/viewer.html?deck=' + currentDeck.id;
  // For now, copy to clipboard
  navigator.clipboard.writeText(url).then(() => {
    showToast('Share link copied: ' + url.substring(0, 50) + '...', 'success');
  }).catch(() => {
    showToast('Share link: ' + url, 'success');
  });
}

// ── Freemium (removed — all users get Pro) ────────────────────
function togglePlan() {
  // No-op: all users are Pro
}

function showUpgradeModal() {
  // No-op: all features are free
  closeModal();
}

function upgradeToPro() {
  // No-op: all users are Pro
  closeModal();
}

function closeModal() {
  modalOverlay.classList.remove('show');
}

modalOverlay.onclick = (e) => { if (e.target === modalOverlay) closeModal(); };

function updatePlanBadge() {
  planBadge.textContent = 'PRO';
  planBadge.style.background = 'rgba(0,102,255,0.15)';
  planBadge.style.color = '#0066ff';
}

// ── Pexels Image Search ───────────────────────────────────────
function showPexelsModal() {
  const hasKey = window.PexelsClient && PexelsClient.hasApiKey();
  const savedKey = hasKey ? PexelsClient.getApiKey() : '';

  modalContent.innerHTML = `
    <h2>🖼 Search Stock Photos</h2>
    <p>Royalty-free images from Pexels. Free to use with attribution.</p>
    ${!hasKey ? `
    <div style="margin-bottom:16px">
      <label style="display:block;font-size:12px;color:#888;margin-bottom:4px">Pexels API Key</label>
      <input id="pexels-key-input" type="text" placeholder="Paste your Pexels API key..." value="${escapeHtml(savedKey)}"
        style="width:100%;padding:10px 14px;border:1px solid rgba(255,255,255,0.1);border-radius:8px;
        background:#1a1a1e;color:#e0e0e6;font-size:13px;outline:none">
      <button onclick="savePexelsKey()" style="margin-top:8px;padding:8px 16px;border:none;border-radius:6px;
        background:#3b6cff;color:#fff;font-size:12px;font-weight:600;cursor:pointer">Save Key</button>
      <div style="margin-top:4px;font-size:10px;color:#555">Get a free key at <a href="https://www.pexels.com/api/" target="_blank" style="color:#3b6cff">pexels.com/api</a></div>
    </div>` : ''}
    <div style="display:flex;gap:8px;margin-bottom:16px">
      <input id="pexels-query" type="text" placeholder="Search for photos..." 
        style="flex:1;padding:10px 14px;border:1px solid rgba(255,255,255,0.1);border-radius:8px;
        background:#1a1a1e;color:#e0e0e6;font-size:14px;outline:none"
        onkeydown="if(event.key==='Enter')searchPexels()">
      <button onclick="searchPexels()" style="padding:10px 20px;border:none;border-radius:8px;
        background:linear-gradient(135deg,#3b6cff,#7a5cff);color:#fff;font-size:14px;font-weight:600;cursor:pointer">Search</button>
    </div>
    <div id="pexels-results" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;max-height:50vh;overflow-y:auto"></div>
    <div id="pexels-attribution" style="margin-top:12px;font-size:10px;color:#555;text-align:center"></div>
    <button onclick="closeModal()" style="width:100%;padding:10px;border:none;background:transparent;color:#555;font-size:13px;cursor:pointer;margin-top:8px">Close</button>
  `;
  modalOverlay.classList.add('show');

  // Focus search input
  setTimeout(function() {
    var q = document.getElementById('pexels-query');
    if (q) q.focus();
  }, 100);
}

function savePexelsKey() {
  var input = document.getElementById('pexels-key-input');
  if (!input || !input.value.trim()) {
    showToast('Please enter an API key', 'error');
    return;
  }
  PexelsClient.setApiKey(input.value.trim());
  showToast('API key saved!', 'success');
  showPexelsModal(); // Refresh modal
}

function searchPexels() {
  var query = document.getElementById('pexels-query');
  var results = document.getElementById('pexels-results');
  var attribution = document.getElementById('pexels-attribution');

  if (!query || !query.value.trim()) {
    results.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#555;padding:20px">Enter a search term</div>';
    return;
  }

  if (!PexelsClient.hasApiKey()) {
    results.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#e0445a;padding:20px">Set your Pexels API key first</div>';
    return;
  }

  results.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#555;padding:20px">Searching...</div>';
  attribution.textContent = '';

  PexelsClient.search(query.value.trim(), 8).then(function(photos) {
    _pexelsLastResults = photos;
    if (photos.length === 0) {
      results.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#555;padding:20px">No results found</div>';
      return;
    }

    results.innerHTML = photos.map(function(p) {
      return `<div onclick="insertPexelsImage('${p.id}')" style="cursor:pointer;border-radius:8px;overflow:hidden;
        border:1px solid rgba(255,255,255,0.06);background:#1a1a1e;transition:transform .15s"
        onmouseover="this.style.transform='scale(1.03)'" onmouseout="this.style.transform='scale(1)'">
        <img src="${p.small}" alt="${escapeHtml(p.alt)}" style="width:100%;height:100px;object-fit:cover;display:block" loading="lazy">
        <div style="padding:6px 8px;font-size:10px;color:#555;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
          ${escapeHtml(p.photographer)}
        </div>
      </div>`;
    }).join('');

    attribution.textContent = 'Photos provided by Pexels. Free to use with attribution.';
  }).catch(function(err) {
    results.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#e0445a;padding:20px">' + escapeHtml(err.message) + '</div>';
  });
}

// Store last search result for insert
var _pexelsLastResults = null;

function insertPexelsImage(photoId) {
  // Re-fetch from DOM since we lose reference after render
  // Instead, store results globally
  if (!_pexelsLastResults) return;
  
  var photo = _pexelsLastResults.find(function(p) { return p.id === photoId; });
  if (!photo) return;

  var alt = photo.alt || 'Photo';
  var md = '![' + alt + '](' + photo.large + ')\n*' + photo.attribution + '*';

  // Insert at cursor position in editor
  var textarea = document.getElementById('editor');
  if (textarea) {
    var start = textarea.selectionStart;
    var end = textarea.selectionEnd;
    var before = textarea.value.substring(0, start);
    var after = textarea.value.substring(end);
    textarea.value = before + md + after;
    textarea.selectionStart = textarea.selectionEnd = start + md.length;
    
    // Trigger input event for preview update
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  }

  closeModal();
  showToast('Image inserted!', 'success');
}

// ── Utilities ──────────────────────────────────────────────────
function countSlides(md) {
  // Count slide separators (--- on its own line, not front matter)
  const body = md.replace(/^---\n[\s\S]*?\n---\n/, '');
  const parts = body.split(/\n---\n?/);
  return parts.filter(p => p.trim()).length;
}

function getSlideTitle(md, idx) {
  const body = md.replace(/^---\n[\s\S]*?\n---\n/, '');
  const parts = body.split(/\n---\n?/);
  if (idx >= parts.length) return 'Slide ' + (idx + 1);
  const slide = parts[idx];
  const h1 = slide.match(/^#\s+(.+)$/m);
  const h2 = slide.match(/^##\s+(.+)$/m);
  if (h1) return h1[1];
  if (h2) return h2[1];
  const quote = slide.match(/^>\s*(.+)$/m);
  if (quote) return quote[1].substring(0, 40);
  return 'Slide ' + (idx + 1);
}

function extractTheme(md) {
  const m = md.match(/^theme:\s*(.+)$/m);
  return m ? m[1].trim() : null;
}

function goToSlide(idx) {
  // Send message to preview iframe to go to slide
  try {
    preview.contentWindow.postMessage({ type: 'preview-goto', idx: idx }, '*');
  } catch (e) {}
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function showToast(msg, type) {
  toast.textContent = msg;
  toast.className = 'toast show ' + (type || '');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

function goDashboard() {
  var user = PTMLClient.getUser();
  var target = user ? '../../public/dashboard.html' : '../../public/login.html';
  window.location.href = target;
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Expose for inline onclick ─────────────────────────────────
window.newDeck = newDeck;
window.loadDeck = loadDeck;
window.saveDeck = saveDeck;
window.setTheme = setTheme;
window.exportDeck = exportDeck;
window.copyShareLink = copyShareLink;
window.togglePlan = togglePlan;
window.showUpgradeModal = showUpgradeModal;
window.upgradeToPro = upgradeToPro;
window.closeModal = closeModal;
window.goToSlide = goToSlide;
window.switchView = switchView;
window.showPexelsModal = showPexelsModal;
window.savePexelsKey = savePexelsKey;
window.searchPexels = searchPexels;
window.insertPexelsImage = insertPexelsImage;

// ── Boot ───────────────────────────────────────────────────────
if (document.readyState !== 'loading') init();
else document.addEventListener('DOMContentLoaded', init);

})();
