/* PTML Template Chooser — shown on first visit / no decks */

(function () {
  'use strict';

  var TEMPLATES = [
    {
      id: 'blank',
      name: 'Blank Deck',
      desc: 'Start with an empty canvas',
      icon: '📄',
      content: '---\ntheme: minimal-white\ntitle: Untitled Deck\n---\n\n# Welcome to PTML\n\nStart writing your slides here.\n\n---\n\n## Second Slide\n\n- Point one\n- Point two\n'
    },
    {
      id: 'pitch',
      name: 'Pitch Deck',
      desc: 'Startup pitch — problem, solution, traction, team',
      icon: '🚀',
      file: 'templates/pitch-deck.md'
    },
    {
      id: 'tech',
      name: 'Tech Talk',
      desc: 'Engineering deep-dive — architecture, decisions, results',
      icon: '💻',
      file: 'templates/tech-talk.md'
    },
    {
      id: 'weekly',
      name: 'Weekly Report',
      desc: 'Team update — highlights, metrics, priorities, risks',
      icon: '📊',
      file: 'templates/weekly-report.md'
    }
  ];

  function show(callback) {
    var html = '<h2>New Presentation</h2><p>Choose a template or start from scratch.</p>';
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">';

    TEMPLATES.forEach(function (t) {
      html += '<div class="template-card" data-id="' + t.id + '" style="padding:20px;border:1px solid rgba(255,255,255,0.08);border-radius:12px;background:#1a1a1e;cursor:pointer;transition:all .15s" onmouseover="this.style.borderColor=\'rgba(59,108,255,0.4)\';this.style.background=\'rgba(59,108,255,0.05)\'" onmouseout="this.style.borderColor=\'rgba(255,255,255,0.08)\';this.style.background=\'#1a1a1e\'">';
      html += '<div style="font-size:28px;margin-bottom:8px">' + t.icon + '</div>';
      html += '<div style="font-weight:700;font-size:14px;margin-bottom:4px">' + t.name + '</div>';
      html += '<div style="font-size:11px;color:#555">' + t.desc + '</div>';
      html += '</div>';
    });

    html += '</div>';

    var content = document.getElementById('modal-content');
    content.innerHTML = html;

    // Wire click handlers
    content.querySelectorAll('.template-card').forEach(function (card) {
      card.addEventListener('click', function () {
        var id = this.getAttribute('data-id');
        pickTemplate(id, callback);
      });
    });

    document.getElementById('modal-overlay').classList.add('show');
  }

  function pickTemplate(id, callback) {
    var t = TEMPLATES.find(function (t) { return t.id === id; });
    if (!t) return;

    if (t.content) {
      // Inline content — pass immediately
      document.getElementById('modal-overlay').classList.remove('show');
      callback({ content: t.content, title: 'Untitled Deck' });
      return;
    }

    if (t.file) {
      // Load from file
      fetch(t.file)
        .then(function (r) { return r.text(); })
        .then(function (md) {
          document.getElementById('modal-overlay').classList.remove('show');
          callback({ content: md, title: t.name });
        })
        .catch(function () {
          document.getElementById('modal-overlay').classList.remove('show');
          callback({ content: TEMPLATES[0].content, title: 'Untitled Deck' });
        });
    }
  }

  function shouldShow() {
    return PTMLClient.getDecks().length === 0;
  }

  window.TemplateChooser = { show: show, shouldShow: shouldShow };
})();