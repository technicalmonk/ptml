/* PTML — Markdown to Slide Parser
 *
 * Converts a PTML Markdown document into HTML slide sections.
 *
 * PTML Markdown Format:
 *
 *   ---slide separator is a horizontal rule (---) on its own line.
 *
 *   Optional front matter at the top of the file (YAML-style):
 *     ---
 *     theme: pitch-deck-vc
 *     title: My Presentation
 *     author: Pete
 *     ---
 *
 *   Within each slide, standard Markdown is supported:
 *     # H1 -> slide title (h1.title)
 *     ## H2 -> section heading (h2.title)
 *     ### H3 -> subheading (h3)
 *     > quote -> blockquote (big-quote style)
 *     - item -> bullet list
 *     1. item -> ordered list
 *     `code` -> inline code
 *     ```lang ... ``` -> code block
 *     ![alt](url) -> image
 *     [text](url) -> link
 *     **bold** / *italic* -> standard
 *
 *   Extended PTML directives (HTML comments that map to layouts):
 *     <!-- layout: cover -->          sets slide layout
 *     <!-- theme: dark -->            override theme per-slide
 *     <!-- anim: fade-up -->          set slide animation
 *     <!-- notes: speaker notes -->   speaker notes for this slide
 *
 *   If no layout directive is given, the parser infers it from content:
 *     - First slide with # H1 only -> cover
 *     - Slide with only a blockquote -> big-quote
 *     - Slide with a list -> bullets
 *     - Slide with code block -> code
 *     - Slide ending with link CTA -> cta
 *     - Default -> content (generic)
 */

(function (global) {
  'use strict';

  // ── Tiny Markdown tokenizer (no deps) ──────────────────────────
  // Supports: headings, bold, italic, inline code, links, images,
  // blockquotes, unordered lists, ordered lists, code blocks, hr, paragraphs.

  function escapeHTML(s) {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Inline formatting
  function parseInline(text) {
    // Images: ![alt](url)
    text = text.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt, url) => {
      return '<img src="' + url + '" alt="' + escapeHTML(alt) + '" />';
    });
    // Links: [text](url)
    text = text.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, url) => {
      return '<a href="' + url + '">' + parseInline(label) + '</a>';
    });
    // Bold: **text**
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Italic: *text*
    text = text.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
    // Inline code: `code`
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
    return text;
  }

  // Comparison layout: splits content on H3 headings into side-by-side columns
  // Each H3 becomes a column header, list items below it become the column body.
  function parseComparisonLayout(lines) {
    var columns = [];
    var current = null;

    lines.forEach(line => {
      var h3Match = line.match(/^###\s+(.+)$/);
      if (h3Match) {
        current = { heading: h3Match[1], items: [], paragraphs: [] };
        columns.push(current);
        return;
      }
      if (!current) {
        // Content before first H3 — treat as slide intro (eyebrow, H2, lede)
        // We'll prepend it
        return;
      }
      // Collect list items and paragraphs
      if (line.match(/^\s*[-*+]\s+/)) {
        current.items.push(parseInline(line.replace(/^\s*[-*+]\s+/, '')));
      } else if (line.match(/^\s*\d+\.\s+/)) {
        current.items.push(parseInline(line.replace(/^\s*\d+\.\s+/, '')));
      } else if (line.trim() === '') {
        // skip empty lines
      } else {
        current.paragraphs.push(parseInline(line));
      }
    });

    // Also collect any pre-H3 content (eyebrow, H2 title)
    var introHTML = '';
    lines.forEach(line => {
      var h3Match = line.match(/^###\s+(.+)$/);
      if (h3Match) return; // stop at first H3 — but this is a simple approach
      var eyebrowMatch = line.match(/^\[([^\]]+)\]$/);
      if (eyebrowMatch) { introHTML += '<span class="eyebrow">' + escapeHTML(eyebrowMatch[1]) + '</span>\n'; return; }
      var h2Match = line.match(/^##\s+(.+)$/);
      if (h2Match) { introHTML += '<h2 class="title h2">' + parseInline(h2Match[1]) + '</h2>\n'; return; }
      var h1Match = line.match(/^#\s+(.+)$/);
      if (h1Match) { introHTML += '<h1 class="title h1">' + parseInline(h1Match[1]) + '</h1>\n'; return; }
      if (line.trim() === '' || line.trim().startsWith('<!--')) return;
      // Don't add paragraphs to intro — they belong to columns
    });

    var colsHTML = columns.map(col => {
      var itemsHTML = col.items.map(item => '<li>' + item + '</li>').join('\n');
      var parasHTML = col.paragraphs.map(p => '<p class="dim">' + p + '</p>').join('\n');
      return '      <div style="flex:1;min-width:0">\n' +
             '        <h3 class="h3" style="margin-bottom:12px">' + parseInline(col.heading) + '</h3>\n' +
             (itemsHTML ? '        <ul class="stack" style="margin:0;padding-left:20px;list-style:disc;gap:8px">\n          ' + itemsHTML + '\n        </ul>\n' : '') +
             (parasHTML ? '        ' + parasHTML + '\n' : '') +
             '      </div>';
    }).join('\n      <div style="width:1px;background:var(--border);align-self:stretch;margin:0 24px"></div>\n');

    return introHTML +
      '    <div style="display:flex;gap:0;margin-top:24px;align-items:flex-start">\n' +
      colsHTML + '\n' +
      '    </div>\n';
  }

  // Parse a single slide's markdown into HTML using layout primitives
  function parseSlideContent(lines, layout) {
    // Comparison layout: split on H3 headings into side-by-side columns
    if (layout === 'comparison') {
      return parseComparisonLayout(lines);
    }

    var html = '';
    var i = 0;
    var inList = false;
    var listType = null; // 'ul' or 'ol'
    var inCodeBlock = false;
    var codeLang = '';
    var codeBuffer = [];
    var inQuote = false;
    var quoteBuffer = [];
    var paraBuffer = [];

    function flushPara() {
      if (paraBuffer.length > 0) {
        var text = paraBuffer.join(' ');
        if (text.trim()) {
          // Classify paragraph
          if (layout === 'cover' || (layout === 'auto' && lines.findIndex(l => l.trim().startsWith('# ')) === 0 && paraBuffer.length <= 2)) {
            html += '<p class="lede">' + parseInline(text) + '</p>\n';
          } else {
            html += '<p class="dim">' + parseInline(text) + '</p>\n';
          }
        }
        paraBuffer = [];
      }
    }

    function flushList() {
      if (inList) {
        var items = '';
        // Collect was done inline; we need to reconstruct
        inList = false;
        listType = null;
      }
    }

    // Simpler approach: process line by line, accumulate
    var listItems = [];

    function closeList() {
      if (listItems.length > 0) {
        var tag = listType || 'ul';
        // Use card grid for bullets if more than 2 items
        if (tag === 'ul' && listItems.length >= 3) {
          html += '<ul class="grid g1 anim-stagger-list" style="list-style:none;padding:0;margin:0;gap:14px" data-anim-target>\n';
          listItems.forEach(item => {
            html += '<li class="card card-accent">' + item + '</li>\n';
          });
        } else {
          html += '<' + tag + ' class="stack" style="margin:0;padding-left:20px;list-style:' + (tag === 'ol' ? 'decimal' : 'disc') + '">\n';
          listItems.forEach(item => {
            html += '<li>' + item + '</li>\n';
          });
        }
        html += '</' + tag + '>\n';
        listItems = [];
        listType = null;
      }
    }

    function closeQuote() {
      if (quoteBuffer.length > 0) {
        var text = quoteBuffer.join(' ');
        html += '<blockquote class="big-quote" style="font-size:32px;font-style:italic;color:var(--text-2);border-left:4px solid var(--accent);padding:16px 24px;margin:0;">' + parseInline(text) + '</blockquote>\n';
        quoteBuffer = [];
      }
    }

    function closeCode() {
      if (codeBuffer.length > 0) {
        var code = codeBuffer.join('\n');
        html += '<pre class="code" style="background:var(--surface-2);border-radius:var(--radius-sm);padding:20px;overflow:auto;font-size:14px;"><code data-lang="' + codeLang + '">' + escapeHTML(code) + '</code></pre>\n';
        codeBuffer = [];
        codeLang = '';
      }
    }

    for (i = 0; i < lines.length; i++) {
      var line = lines[i];

      // Code block fence
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          closeCode();
          inCodeBlock = false;
        } else {
          flushPara();
          closeList();
          closeQuote();
          inCodeBlock = true;
          codeLang = line.trim().replace(/^```/, '').trim();
        }
        continue;
      }

      if (inCodeBlock) {
        codeBuffer.push(line);
        continue;
      }

      // Blockquote
      if (line.trim().startsWith('>')) {
        flushPara();
        closeList();
        quoteBuffer.push(line.trim().replace(/^>\s?/, ''));
        continue;
      } else {
        closeQuote();
      }

      // Horizontal rule inside a slide -> ignore (slide separators are pre-split)
      if (line.trim() === '---' || line.trim() === '***') {
        continue;
      }

      // Headings
      var headingMatch = line.match(/^(#{1,4})\s+(.+)$/);
      if (headingMatch) {
        flushPara();
        closeList();
        var level = headingMatch[1].length;
        var text = headingMatch[2];
        var cls = '';
        if (level === 1) cls = 'title h1';
        else if (level === 2) cls = 'title h2';
        else if (level === 3) cls = 'h3';
        else if (level === 4) cls = 'h4';
        html += '<h' + level + ' class="' + cls + '">' + parseInline(text) + '</h' + level + '>\n';
        continue;
      }

      // Unordered list
      if (line.match(/^\s*[-*+]\s+/)) {
        flushPara();
        if (listType !== 'ul') { closeList(); listType = 'ul'; }
        listItems.push(parseInline(line.replace(/^\s*[-*+]\s+/, '')));
        continue;
      }

      // Ordered list
      if (line.match(/^\s*\d+\.\s+/)) {
        flushPara();
        if (listType !== 'ol') { closeList(); listType = 'ol'; }
        listItems.push(parseInline(line.replace(/^\s*\d+\.\s+/, '')));
        continue;
      } else {
        closeList();
      }

      // Eyebrow/kicker notation: a line that's just uppercase words in brackets
      // like [Why HTML] -> <span class="eyebrow">Why HTML</span>
      var eyebrowMatch = line.match(/^\[([^\]]+)\]$/);
      if (eyebrowMatch) {
        flushPara();
        html += '<span class="eyebrow">' + escapeHTML(eyebrowMatch[1]) + '</span>\n';
        continue;
      }

      // Kicker notation: a line starting with ^ like ^Agenda
      var kickerMatch = line.match(/^\^\s*(.+)$/);
      if (kickerMatch) {
        flushPara();
        html += '<span class="kicker">' + parseInline(kickerMatch[1]) + '</span>\n';
        continue;
      }

      // Empty line -> paragraph break
      if (line.trim() === '') {
        flushPara();
        continue;
      }

      // Default: accumulate into paragraph
      paraBuffer.push(line);
    }

    // Flush remaining
    flushPara();
    closeList();
    closeQuote();
    closeCode();

    return html;
  }

  // Infer layout from content if none specified
  function inferLayout(lines) {
    var hasH1 = lines.some(l => l.match(/^#\s+/));
    var hasH2 = lines.some(l => l.match(/^##\s+/));
    var hasList = lines.some(l => l.match(/^\s*[-*+]\s+/));
    var hasQuote = lines.some(l => l.trim().startsWith('>'));
    var hasCode = lines.some(l => l.trim().startsWith('```'));
    var hasImage = lines.some(l => l.match(/^!\[/));
    var isLast = false; // caller sets

    if (!hasH2 && !hasList && !hasQuote && !hasCode && !hasImage && hasH1) return 'cover';
    if (hasQuote && !hasH2) return 'big-quote';
    if (hasCode) return 'code';
    if (hasList && !hasH2) return 'bullets';
    if (hasImage) return 'image';
    return 'content';
  }

  // Extract PTML directives from HTML comments
  function extractDirectives(lines) {
    var directives = { layout: null, theme: null, anim: null, notes: null, title: null };
    var cleaned = [];

    lines.forEach(line => {
      var m = line.match(/<!--\s*(\w+):\s*(.+?)\s*-->/);
      if (m) {
        var key = m[1].toLowerCase();
        var val = m[2].trim();
        if (directives.hasOwnProperty(key)) {
          directives[key] = val;
        }
        // Skip the line (it's a directive, not content)
        return;
      }
      cleaned.push(line);
    });

    return { directives: directives, content: cleaned };
  }

  // Parse front matter (YAML-like block at top of file)
  function parseFrontMatter(text) {
    var fm = {};
    var match = text.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
    if (match) {
      var body = match[1];
      body.split('\n').forEach(line => {
        var m = line.match(/^(\w+):\s*(.+)$/);
        if (m) fm[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
      });
      return { frontMatter: fm, body: text.slice(match[0].length) };
    }
    return { frontMatter: fm, body: text };
  }

  // Main: parse full PTML markdown into HTML slides
  function parsePTML(markdown) {
    var parsed = parseFrontMatter(markdown);
    var fm = parsed.frontMatter;
    var body = parsed.body;

    // Split into slides on --- (horizontal rule on its own line)
    // But be careful: --- in front matter is already stripped.
    // Also avoid splitting on --- inside code blocks.
    var slides = splitSlides(body);

    var slideSections = [];
    var slideNum = 0;

    slides.forEach(slideText => {
      if (slideText.trim() === '') return;
      slideNum++;

      var lines = slideText.split('\n');
      var extracted = extractDirectives(lines);
      var contentLines = extracted.content;
      var dir = extracted.directives;

      var layout = dir.layout || 'auto';
      if (layout === 'auto') {
        layout = inferLayout(contentLines);
      }

      var contentHTML = parseSlideContent(contentLines, layout);

      var classes = 'slide';
      var dataAttrs = '';
      if (dir.anim) {
        classes += ' anim-' + dir.anim;
        dataAttrs += ' data-anim="' + dir.anim + '"';
      }
      if (dir.title) {
        dataAttrs += ' data-title="' + escapeHTML(dir.title) + '"';
      }
      if (slideNum === 1) classes += ' is-active';

      var notesHTML = '';
      if (dir.notes) {
        notesHTML = '<div class="notes">' + escapeHTML(dir.notes) + '</div>';
      }

      slideSections.push(
        '  <section class="' + classes + '"' + dataAttrs + ' data-layout="' + layout + '">\n' +
        '    ' + contentHTML.replace(/\n/g, '\n    ') + '\n' +
             notesHTML.replace(/\n/g, '\n    ') + '\n' +
        '  </section>'
      );
    });

    return {
      frontMatter: fm,
      slideCount: slideNum,
      slidesHTML: slideSections.join('\n\n')
    };
  }

  // Split markdown into slides on --- separator
  function splitSlides(text) {
    var lines = text.split('\n');
    var slides = [];
    var current = [];
    var inCode = false;

    lines.forEach(line => {
      if (line.trim().startsWith('```')) {
        inCode = !inCode;
        current.push(line);
        return;
      }
      if (!inCode && line.trim() === '---') {
        slides.push(current.join('\n'));
        current = [];
        return;
      }
      current.push(line);
    });

    if (current.join('\n').trim()) {
      slides.push(current.join('\n'));
    }

    return slides;
  }

  // Build full HTML document from parsed result
  function buildHTML(parsed, options) {
    options = options || {};
    var fm = parsed.frontMatter;
    var theme = fm.theme || options.theme || 'minimal-white';
    var title = fm.title || options.title || 'PTML Presentation';
    var basePath = options.basePath || '.';

    return [
      '<!DOCTYPE html>',
      '<html lang="en" data-theme="' + theme + '">',
      '<head>',
      '  <meta charset="utf-8">',
      '  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">',
      '  <title>' + escapeHTML(title) + '</title>',
      '  <link rel="stylesheet" href="' + basePath + '/fonts.css">',
      '  <link rel="stylesheet" href="' + basePath + '/base.css">',
      '  <link rel="stylesheet" id="theme-link" href="' + basePath + '/themes/' + theme + '.css">',
      '  <link rel="stylesheet" href="' + basePath + '/animations/animations.css">',
      '</head>',
      '<body data-themes="' + (fm.themeList || '') + '" data-theme-base="' + basePath + '/themes/">',
      '<div class="deck">',
      '',
                 parsed.slidesHTML,
      '',
      '</div>',
      '<script src="' + basePath + '/runtime.js"></script>',
      '<script src="' + basePath + '/animations/fx-runtime.js"></script>',
      '</body>',
      '</html>'
    ].join('\n');
  }

  // Export
  global.PTML = {
    parse: parsePTML,
    buildHTML: buildHTML,
    parseInline: parseInline,
    escapeHTML: escapeHTML
  };

})(typeof module !== 'undefined' ? module.exports : (typeof window !== 'undefined' ? window : this));
