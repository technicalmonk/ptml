/* PTML Builder — main app controller
 *
 * Manages: deck CRUD, live preview, theme picker, slide nav,
 * analytics dashboard, export, freemium gating.
 */

(function () {
'use strict';

// ── State ─────────────────────────────────────────────────────
let currentDeck = null;
let currentView = 'decks'; // decks | theme | analytics | export
let saveTimer = null;

// ── DOM refs ───────────────────────────────────────────────────
const editor = document.getElementById('editor');
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
    PTMLClient.setUser({ id: 'user_' + Date.now(), plan: 'free', name: 'Guest' });
  }
  updatePlanBadge();

  // Nav buttons
  document.getElementById('nav-decks').onclick = () => switchView('decks');
  document.getElementById('nav-theme').onclick = () => switchView('theme');
  document.getElementById('nav-analytics').onclick = () => switchView('analytics');
  document.getElementById('nav-export').onclick = () => switchView('export');
  document.getElementById('nav-upgrade').onclick = () => showUpgradeModal();

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
      document.getElementById('mode-toggle').textContent = newMode === 'markdown' ? 'M\u2193' : 'T\u2193';
      editor = document.getElementById('editor');
    }
  });

  deckTitle.addEventListener('input', () => {
    if (currentDeck) {
      currentDeck.title = deckTitle.value;
      scheduleAutosave();
    }
  });

  // Load most recent deck or show template chooser
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
  const navMap = { decks: 'nav-decks', theme: 'nav-theme', analytics: 'nav-analytics', export: 'nav-export' };
  if (navMap[view]) document.getElementById(navMap[view]).classList.add('active');

  if (view === 'decks') renderSlidesPanel();
  else if (view === 'theme') renderThemePanel();
  else if (view === 'analytics') renderAnalyticsPanel();
  else if (view === 'export') renderExportPanel();
}

// ── Slides Panel ───────────────────────────────────────────────
function renderSlidesPanel() {
  panelHeader.textContent = 'Slides';
  const decks = PTMLClient.getDecks();

  let html = '<div style="margin-bottom:16px">';
  decks.forEach(d => {
    const isActive = currentDeck && d.id === currentDeck.id;
    const slideCount = countSlides(d.content);
    html += `<div class="slide-thumb ${isActive ? 'active' : ''}" onclick="loadDeck('${d.id}')">
      <span class="slide-thumb-num">${slideCount}</span>
      <div class="slide-thumb-preview">${escapeHtml(d.title || 'Untitled')}</div>
    </div>`;
  });
  html += '</div>';
  html += `<button onclick="newDeck()" style="width:100%;padding:10px;border:1px dashed rgba(255,255,255,0.15);border-radius:8px;background:transparent;color:#666;font-size:12px;cursor:pointer">+ New Deck</button>`;

  // Show current deck slides
  if (currentDeck) {
    const slideCount = countSlides(currentDeck.content);
    html += `<div style="margin-top:20px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.06)"><div style="font-size:11px;color:#555;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px">Current Deck (${slideCount} slides)</div>`;
    for (let i = 0; i < slideCount; i++) {
      const title = getSlideTitle(currentDeck.content, i);
      html += `<div class="slide-thumb" onclick="goToSlide(${i})">
        <span class="slide-thumb-num">${i + 1}</span>
        <div class="slide-thumb-preview">${escapeHtml(title)}</div>
      </div>`;
    }
    html += '</div>';
  }

  panelBody.innerHTML = html;
}

function renderThemePanel() {
  panelHeader.textContent = 'Theme';
  const available = PTMLClient.getAvailableThemes();
  const all = PTMLClient.ALL_THEMES;
  const currentTheme = currentDeck ? extractTheme(currentDeck.content) : 'minimal-white';

  let html = '<div class="theme-grid">';
  all.forEach(theme => {
    const isAvailable = available.includes(theme);
    const isActive = theme === currentTheme;
    html += `<div class="theme-chip ${isActive ? 'active' : ''} ${!isAvailable ? 'locked' : ''}"
      onclick="${isAvailable ? `setTheme('${theme}')` : `showUpgradeModal()`}">
      ${theme.replace(/-/g, ' ')}
    </div>`;
  });
  html += '</div>';

  if (!PTMLClient.isPro()) {
    html += `<div class="upgrade-banner">
      <h3>🔒 ${all.length - available.length} themes locked</h3>
      <p>Upgrade to Pro for all 36 themes</p>
      <button onclick="showUpgradeModal()">Upgrade to Pro</button>
    </div>`;
  }

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
    html += `<div class="upgrade-banner">
      <h3>📊 Enriched Analytics</h3>
      <p>See viewer IDs, slide-level tracking, and trends with Pro</p>
      <button onclick="showUpgradeModal()">Upgrade to Pro</button>
    </div>`;
  }

  panelBody.innerHTML = html;
}

function renderExportPanel() {
  panelHeader.textContent = 'Export';
  if (!currentDeck) {
    panelBody.innerHTML = '<p style="color:#555;font-size:13px;padding:20px">No deck selected.</p>';
    return;
  }

  const limits = PTMLClient.getLimits();
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

  // PDF (Pro only)
  html += `<button onclick="${limits.canExportPDF ? `exportDeck('pdf')` : `showUpgradeModal()`}"
    style="padding:14px;border:1px solid rgba(255,255,255,0.08);border-radius:10px;background:#1a1a1e;color:${limits.canExportPDF ? '#e0e0e6' : '#555'};font-size:13px;cursor:pointer;text-align:left">
    <div style="font-weight:600;margin-bottom:2px">📄 Export as PDF ${limits.canExportPDF ? '' : '🔒'}</div>
    <div style="font-size:11px;color:#555">${limits.canExportPDF ? 'Print-ready PDF document' : 'Pro feature — upgrade to unlock'}</div>
  </button>`;

  // Share link
  html += `<button onclick="copyShareLink()" style="padding:14px;border:1px solid rgba(255,255,255,0.08);border-radius:10px;background:#1a1a1e;color:#e0e0e6;font-size:13px;cursor:pointer;text-align:left">
    <div style="font-weight:600;margin-bottom:2px">🔗 Copy Share Link</div>
    <div style="font-size:11px;color:#555">Share a link to the live viewer</div>
  </button>`;

  html += '</div>';

  if (!PTMLClient.isPro()) {
    html += `<div class="upgrade-banner">
      <h3>⭐ Pro Features</h3>
      <p>PPTX import, PDF export, enriched analytics, design agent</p>
      <button onclick="showUpgradeModal()">Upgrade to Pro</button>
    </div>`;
  }

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
}

function saveDeck() {
  if (!currentDeck) return;
  currentDeck.title = deckTitle.value;
  currentDeck.content = editor.value;

  // Check slide limit for free users
  const limits = PTMLClient.getLimits();
  const slideCount = countSlides(currentDeck.content);
  if (slideCount > limits.maxSlides) {
    showToast(`Free plan limit: ${limits.maxSlides} slides. You have ${slideCount}.`, 'error');
    return;
  }

  // Check deck count limit
  const decks = PTMLClient.getDecks();
  const isNewDeck = !decks.find(d => d.id === currentDeck.id);
  if (isNewDeck && decks.length >= limits.maxDecks) {
    showToast(`Free plan limit: ${limits.maxDecks} decks. Upgrade for unlimited.`, 'error');
    return;
  }

  PTMLClient.saveDeck(currentDeck);
  showToast('Saved', 'success');
  if (currentView === 'decks') renderSlidesPanel();
}

function scheduleAutosave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    if (currentDeck) {
      currentDeck.title = deckTitle.value;
      currentDeck.content = editor.value;
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

// ── Freemium ───────────────────────────────────────────────────
function togglePlan() {
  const user = PTMLClient.getUser();
  if (user.plan === 'free') {
    showUpgradeModal();
  } else {
    user.plan = 'free';
    PTMLClient.setUser(user);
    updatePlanBadge();
    showToast('Switched to Free plan', 'success');
    switchView(currentView);
  }
}

function showUpgradeModal() {
  modalContent.innerHTML = `
    <h2>⭐ Upgrade to PTML Pro</h2>
    <p>Unlock the full power of HTML presentations.</p>
    <div style="display:grid;gap:12px;margin-bottom:24px">
      <div style="display:flex;gap:12px;align-items:start">
        <span style="color:#3b6cff;font-size:18px">✓</span>
        <div><strong>All 36 themes</strong><br><span style="color:#555;font-size:12px">30 additional premium themes</span></div>
      </div>
      <div style="display:flex;gap:12px;align-items:start">
        <span style="color:#3b6cff;font-size:18px">✓</span>
        <div><strong>PPTX Import & Conversion</strong><br><span style="color:#555;font-size:12px">Upload .pptx files, auto-convert to PTML</span></div>
      </div>
      <div style="display:flex;gap:12px;align-items:start">
        <span style="color:#3b6cff;font-size:18px">✓</span>
        <div><strong>Design Agent</strong><br><span style="color:#555;font-size:12px">AI-powered slide design suggestions</span></div>
      </div>
      <div style="display:flex;gap:12px;align-items:start">
        <span style="color:#3b6cff;font-size:18px">✓</span>
        <div><strong>Content Review Agent</strong><br><span style="color:#555;font-size:12px">AI reviews your deck for clarity & impact</span></div>
      </div>
      <div style="display:flex;gap:12px;align-items:start">
        <span style="color:#3b6cff;font-size:18px">✓</span>
        <div><strong>Enriched Analytics</strong><br><span style="color:#555;font-size:12px">Viewer tracking, slide-level data, trends</span></div>
      </div>
      <div style="display:flex;gap:12px;align-items:start">
        <span style="color:#3b6cff;font-size:18px">✓</span>
        <div><strong>PDF Export</strong><br><span style="color:#555;font-size:12px">Print-ready PDF documents</span></div>
      </div>
      <div style="display:flex;gap:12px;align-items:start">
        <span style="color:#3b6cff;font-size:18px">✓</span>
        <div><strong>Unlimited decks & slides</strong><br><span style="color:#555;font-size:12px">No limits on creativity</span></div>
      </div>
    </div>
    <div style="text-align:center;padding:20px;background:rgba(59,108,255,0.08);border-radius:10px;margin-bottom:20px">
      <div style="font-size:28px;font-weight:800;color:#3b6cff">$9<span style="font-size:14px;color:#555">/month</span></div>
    </div>
    <button onclick="upgradeToPro()" style="width:100%;padding:14px;border:none;border-radius:10px;background:linear-gradient(135deg,#3b6cff,#7a5cff);color:#fff;font-size:15px;font-weight:700;cursor:pointer">
      Upgrade Now
    </button>
    <button onclick="closeModal()" style="width:100%;padding:10px;border:none;background:transparent;color:#555;font-size:13px;cursor:pointer;margin-top:8px">
      Maybe later
    </button>
  `;
  modalOverlay.classList.add('show');
}

function upgradeToPro() {
  const user = PTMLClient.getUser();
  user.plan = 'pro';
  PTMLClient.setUser(user);
  updatePlanBadge();
  closeModal();
  showToast('Welcome to Pro! 🎉', 'success');
  switchView(currentView);
}

function closeModal() {
  modalOverlay.classList.remove('show');
}

modalOverlay.onclick = (e) => { if (e.target === modalOverlay) closeModal(); };

function updatePlanBadge() {
  const plan = PTMLClient.getPlan();
  planBadge.textContent = plan.toUpperCase();
  if (plan === 'pro') {
    planBadge.style.background = 'rgba(255,92,138,0.15)';
    planBadge.style.color = '#ff5c8a';
  } else {
    planBadge.style.background = 'rgba(26,175,108,0.15)';
    planBadge.style.color = '#1aaf6c';
  }
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

// ── Boot ───────────────────────────────────────────────────────
if (document.readyState !== 'loading') init();
else document.addEventListener('DOMContentLoaded', init);

})();
