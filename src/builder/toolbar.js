/* PTML Toolbar — formatting + slide management toolbar
 *
 * Works in both Markdown mode (inserts syntax at cursor in textarea)
 * and Rich Text mode (uses document.execCommand on contentEditable).
 *
 * Exports: window.PTMLToolbar
 */

(function () {
  'use strict';

  var editor = null;        // textarea or contentEditable element
  var mode = 'markdown';    // 'markdown' | 'richtext'
  var onUpdate = null;      // callback when content changes
  var onModeChange = null;  // callback when mode toggles

  // ── Layout presets ────────────────────────────────────────────
  var LAYOUTS = ['cover', 'content', 'bullets', 'comparison', 'big-quote', 'code', 'image'];

  // ── Markdown helpers ──────────────────────────────────────────
  function getTextarea() {
    return editor && editor.tagName === 'TEXTAREA' ? editor : null;
  }

  function getContentEditable() {
    return editor && editor.getAttribute('contenteditable') === 'true' ? editor : null;
  }

  function insertAtCursor(text, wrapSelection) {
    var ta = getTextarea();
    if (!ta) return;

    var start = ta.selectionStart;
    var end = ta.selectionEnd;
    var selected = ta.value.substring(start, end);
    var before = ta.value.substring(0, start);
    var after = ta.value.substring(end);

    if (wrapSelection && selected) {
      // Wrap selected text: e.g., **selected**
      ta.value = before + wrapSelection + selected + wrapSelection + after;
      ta.selectionStart = start + wrapSelection.length + selected.length + wrapSelection.length;
      ta.selectionEnd = ta.selectionStart;
    } else {
      ta.value = before + text + after;
      ta.selectionStart = ta.selectionEnd = start + text.length;
    }

    ta.focus();
    if (onUpdate) onUpdate(ta.value);
  }

  function wrapSelection(before, after) {
    var ta = getTextarea();
    if (!ta) return;

    var start = ta.selectionStart;
    var end = ta.selectionEnd;
    var selected = ta.value.substring(start, end);
    var full = ta.value.substring(0, start) + before + selected + after + ta.value.substring(end);
    ta.value = full;

    if (selected) {
      ta.selectionStart = start + before.length;
      ta.selectionEnd = end + before.length;
    } else {
      ta.selectionStart = ta.selectionEnd = start + before.length;
    }
    ta.focus();
    if (onUpdate) onUpdate(ta.value);
  }

  // ── Toolbar actions (Markdown mode) ───────────────────────────
  function insertHeading(level) {
    var prefix = '#'.repeat(level) + ' ';
    insertLinePrefix(prefix);
  }

  function insertBold() {
    var ta = getTextarea();
    if (!ta) return;
    var start = ta.selectionStart, end = ta.selectionEnd;
    if (start === end) {
      insertAtCursor('**bold text**');
      // Select "bold text" for the user to type over
      ta.selectionStart = start + 2;
      ta.selectionEnd = start + 11;
    } else {
      wrapSelection('**', '**');
    }
  }

  function insertItalic() {
    var ta = getTextarea();
    if (!ta) return;
    var start = ta.selectionStart, end = ta.selectionEnd;
    if (start === end) {
      insertAtCursor('*italic text*');
      ta.selectionStart = start + 1;
      ta.selectionEnd = start + 12;
    } else {
      wrapSelection('*', '*');
    }
  }

  function insertLink() {
    insertAtCursor('[link text](url)');
  }

  function insertImage() {
    insertAtCursor('![alt text](url)');
  }

  function insertCode() {
    insertAtCursor('`code`');
  }

  function insertCodeBlock() {
    insertAtCursor('\n```\n\n```\n');
  }

  function insertBlockquote() {
    wrapSelection('\n> ', '');
  }

  function insertBulletList() {
    var ta = getTextarea();
    if (!ta) return;
    var start = ta.selectionStart, end = ta.selectionEnd;
    var selected = ta.value.substring(start, end);
    if (selected) {
      var lines = selected.split('\n');
      var bulleted = lines.map(function (l) { return '- ' + l; }).join('\n');
      var full = ta.value.substring(0, start) + bulleted + ta.value.substring(end);
      ta.value = full;
      ta.selectionStart = start;
      ta.selectionEnd = start + bulleted.length;
    } else {
      insertAtCursor('\n- ');
    }
    ta.focus();
    if (onUpdate) onUpdate(ta.value);
  }

  function insertNumberedList() {
    var ta = getTextarea();
    if (!ta) return;
    var start = ta.selectionStart, end = ta.selectionEnd;
    var selected = ta.value.substring(start, end);
    if (selected) {
      var lines = selected.split('\n');
      var numbered = lines.map(function (l, i) { return (i + 1) + '. ' + l; }).join('\n');
      var full = ta.value.substring(0, start) + numbered + ta.value.substring(end);
      ta.value = full;
      ta.selectionStart = start;
      ta.selectionEnd = start + numbered.length;
    } else {
      insertAtCursor('\n1. ');
    }
    ta.focus();
    if (onUpdate) onUpdate(ta.value);
  }

  function insertLinePrefix(prefix) {
    var ta = getTextarea();
    if (!ta) return;
    var start = ta.selectionStart;
    var lineStart = ta.value.lastIndexOf('\n', start - 1) + 1;
    var lineEnd = ta.value.indexOf('\n', start);
    if (lineEnd === -1) lineEnd = ta.value.length;
    var line = ta.value.substring(lineStart, lineEnd);

    // If line already starts with this prefix, toggle it off
    if (line.startsWith(prefix)) {
      var newLine = line.slice(prefix.length);
      ta.value = ta.value.substring(0, lineStart) + newLine + ta.value.substring(lineEnd);
      ta.selectionStart = start - prefix.length;
      ta.selectionEnd = ta.selectionStart;
    } else {
      ta.value = ta.value.substring(0, lineStart) + prefix + line + ta.value.substring(lineEnd);
      ta.selectionStart = start + prefix.length;
      ta.selectionEnd = ta.selectionStart;
    }
    ta.focus();
    if (onUpdate) onUpdate(ta.value);
  }

  // ── Slide management ──────────────────────────────────────────
  function addSlide(layout) {
    var ta = getTextarea();
    if (!ta) return;
    var text = '\n\n---\n\n';
    if (layout && layout !== 'content') {
      text += '<!-- layout: ' + layout + ' -->\n\n';
    }
    if (layout === 'cover') text += '# New Slide\n\n';
    else if (layout === 'bullets') text += '## New Slide\n\n- Point one\n- Point two\n';
    else if (layout === 'big-quote') text += '> Your quote here\n';
    else if (layout === 'code') text += '## Code\n\n```\n\n```\n';
    else if (layout === 'comparison') text += '## Comparison\n\n### Column A\n- Item 1\n\n### Column B\n- Item 1\n';
    else text += '## New Slide\n\n';
    insertAtCursor(text);
  }

  function deleteCurrentSlide() {
    var ta = getTextarea();
    if (!ta) return;
    var cursor = ta.selectionStart;
    var content = ta.value;

    // Find the slide boundaries around cursor
    // A slide starts after "---\n" (or at beginning of file) and ends at "\n---" (or EOF)
    var slideStart = content.lastIndexOf('\n---\n', cursor);
    if (slideStart === -1) slideStart = 0;
    else slideStart = slideStart + 5; // past the separator

    var slideEnd = content.indexOf('\n---\n', cursor);
    if (slideEnd === -1) slideEnd = content.length;

    // But also check for front matter
    var fmMatch = content.match(/^---\n[\s\S]*?\n---\n/);
    if (fmMatch && slideStart < fmMatch[0].length) {
      slideStart = fmMatch[0].length;
    }

    var newContent = content.substring(0, slideStart) + content.substring(slideEnd);
    ta.value = newContent.trim() + '\n';
    ta.selectionStart = ta.selectionEnd = Math.min(slideStart, newContent.length);
    ta.focus();
    if (onUpdate) onUpdate(ta.value);
  }

  function insertDirective(directive) {
    insertAtCursor('<!-- ' + directive + ' -->\n');
  }

  // ── DOM to Markdown converter (for Rich Text mode) ────────────
  function domToMarkdown(node) {
    var md = '';
    node.childNodes.forEach(function (child) {
      if (child.nodeType === 3) {
        md += child.textContent;
      } else if (child.nodeType === 1) {
        var tag = child.tagName.toLowerCase();
        var inner = domToMarkdown(child);

        if (tag === 'h1') md += '# ' + inner + '\n';
        else if (tag === 'h2') md += '## ' + inner + '\n';
        else if (tag === 'h3') md += '### ' + inner + '\n';
        else if (tag === 'h4') md += '#### ' + inner + '\n';
        else if (tag === 'p') md += inner + '\n';
        else if (tag === 'strong' || tag === 'b') md += '**' + inner + '**';
        else if (tag === 'em' || tag === 'i') md += '*' + inner + '*';
        else if (tag === 'code' && child.parentNode && child.parentNode.tagName.toLowerCase() === 'pre') {
          md += '```\n' + child.textContent + '\n```\n';
        } else if (tag === 'code') md += '`' + child.textContent + '`';
        else if (tag === 'pre') md += inner;
        else if (tag === 'blockquote') {
          inner.trim().split('\n').forEach(function (l) { if (l.trim()) md += '> ' + l.trim() + '\n'; });
        } else if (tag === 'ul') md += inner;
        else if (tag === 'ol') md += inner;
        else if (tag === 'li') md += '- ' + inner.trim() + '\n';
        else if (tag === 'a') md += '[' + inner + '](' + child.getAttribute('href') + ')';
        else if (tag === 'img') md += '![' + (child.getAttribute('alt') || '') + '](' + child.getAttribute('src') + ')';
        else if (tag === 'br') md += '\n';
        else if (tag === 'hr') md += '---\n';
        else if (tag === 'div' || tag === 'span' || tag === 'section') md += inner;
        else md += child.textContent || '';
      }
    });
    return md;
  }

  // ── Mode toggle ───────────────────────────────────────────────
  function getMode() { return mode; }

  function toggleMode() {
    if (mode === 'markdown') {
      switchToRichText();
    } else {
      switchToMarkdown();
    }
  }

  function switchToRichText() {
    var ta = getTextarea();
    if (!ta) return;

    // Convert markdown to HTML for contentEditable
    var md = ta.value;
    var html = convertMDtoHTML(md);

    // Create contentEditable replacement
    var ce = document.createElement('div');
    ce.contentEditable = 'true';
    ce.id = ta.id;
    ce.className = ta.className;
    ce.innerHTML = html;
    ce.setAttribute('spellcheck', 'false');

    // Copy styles
    var computed = window.getComputedStyle(ta);
    ce.style.cssText = 'flex:1;width:100%;border:none;outline:none;resize:none;' +
      'background:#0d0d10;color:#c8c8d0;padding:20px 24px;' +
      'font-family:\'JetBrains Mono\',\'IBM Plex Mono\',SFMono-Regular,Menlo,monospace;' +
      'font-size:13px;line-height:1.7;overflow-y:auto;white-space:pre-wrap;word-wrap:break-word;';

    // Handle content changes
    ce.addEventListener('input', function () {
      if (onUpdate) {
        var newMd = domToMarkdown(ce);
        onUpdate(newMd);
      }
    });

    ta.parentNode.replaceChild(ce, ta);
    editor = ce;
    mode = 'richtext';
    ce.focus();

    if (onModeChange) onModeChange('richtext');
  }

  function switchToMarkdown() {
    var ce = getContentEditable();
    if (!ce) return;

    // Convert to markdown
    var md = domToMarkdown(ce);

    // Create textarea replacement
    var ta = document.createElement('textarea');
    ta.id = ce.id;
    ta.className = ce.className;
    ta.value = md;
    ta.setAttribute('spellcheck', 'false');

    ta.style.cssText = 'flex:1;width:100%;border:none;outline:none;resize:none;' +
      'background:#0d0d10;color:#c8c8d0;padding:20px 24px;' +
      'font-family:\'JetBrains Mono\',\'IBM Plex Mono\',SFMono-Regular,Menlo,monospace;' +
      'font-size:13px;line-height:1.7;overflow-y:auto;';

    ta.addEventListener('input', function () {
      if (onUpdate) onUpdate(ta.value);
    });

    ce.parentNode.replaceChild(ta, ce);
    editor = ta;
    mode = 'markdown';
    ta.focus();

    if (onModeChange) onModeChange('markdown');
    if (onUpdate) onUpdate(md);
  }

  // ── Simple MD to HTML converter ───────────────────────────────
  function convertMDtoHTML(md) {
    // Basic conversion for rich text display
    var html = md
      // Headings
      .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      // Bold and italic
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Inline code
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Horizontal rules (slide separators)
      .replace(/^---$/gm, '<hr>')
      // Blockquotes
      .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
      // Paragraphs (double newlines)
      .replace(/\n\n/g, '</p><p>');

    // Wrap in paragraphs
    html = '<p>' + html + '</p>';

    // Fix empty paragraphs
    html = html.replace(/<p><\/p>/g, '<p><br></p>');
    html = html.replace(/<p><(h[1-4])/g, '<$1');
    html = html.replace(/<\/(h[1-4])><\/p>/g, '</$1>');
    html = html.replace(/<p><blockquote>/g, '<blockquote>');
    html = html.replace(/<\/blockquote><\/p>/g, '</blockquote>');
    html = html.replace(/<p><hr><\/p>/g, '<hr>');

    return html;
  }

  // ── Rich text formatting ──────────────────────────────────────
  function execFormat(command, value) {
    if (mode === 'richtext') {
      document.execCommand(command, false, value || null);
      if (onUpdate) {
        var ce = getContentEditable();
        if (ce) onUpdate(domToMarkdown(ce));
      }
    }
  }

  function richBold() { execFormat('bold'); }
  function richItalic() { execFormat('italic'); }
  function richHeading(level) { execFormat('formatBlock', 'h' + level); }
  function richBulletList() { execFormat('insertUnorderedList'); }
  function richNumberedList() { execFormat('insertOrderedList'); }
  function richBlockquote() { execFormat('formatBlock', 'blockquote'); }
  function richCode() { execFormat('formatBlock', 'pre'); }
  function richLink() {
    var url = prompt('Enter URL:', 'https://');
    if (url) execFormat('createLink', url);
  }
  function richImage() {
    var url = prompt('Enter image URL:', 'https://');
    if (url) execFormat('insertImage', url);
  }

  // ── Toolbar action dispatch ───────────────────────────────────
  function action(name, arg) {
    if (mode === 'richtext') {
      switch (name) {
        case 'bold': richBold(); break;
        case 'italic': richItalic(); break;
        case 'heading': richHeading(arg || 1); break;
        case 'bullet-list': richBulletList(); break;
        case 'numbered-list': richNumberedList(); break;
        case 'blockquote': richBlockquote(); break;
        case 'code': richCode(); break;
        case 'link': richLink(); break;
        case 'image': richImage(); break;
        case 'add-slide': addSlide(arg); break;
        case 'delete-slide': deleteCurrentSlide(); break;
      }
    } else {
      switch (name) {
        case 'bold': insertBold(); break;
        case 'italic': insertItalic(); break;
        case 'heading': insertHeading(arg || 1); break;
        case 'bullet-list': insertBulletList(); break;
        case 'numbered-list': insertNumberedList(); break;
        case 'blockquote': insertBlockquote(); break;
        case 'code': insertCode(); break;
        case 'code-block': insertCodeBlock(); break;
        case 'link': insertLink(); break;
        case 'image': insertImage(); break;
        case 'add-slide': addSlide(arg); break;
        case 'delete-slide': deleteCurrentSlide(); break;
        case 'directive': insertDirective(arg); break;
      }
    }
  }

  // ── Init ──────────────────────────────────────────────────────
  function init(targetEditor, callbacks) {
    editor = targetEditor;
    if (callbacks) {
      onUpdate = callbacks.onUpdate || null;
      onModeChange = callbacks.onModeChange || null;
    }
    mode = targetEditor.tagName === 'TEXTAREA' ? 'markdown' : 'richtext';
  }

  // ── Public API ────────────────────────────────────────────────
  window.PTMLToolbar = {
    init: init,
    action: action,
    getMode: getMode,
    toggleMode: toggleMode,
    switchToRichText: switchToRichText,
    switchToMarkdown: switchToMarkdown,
    addSlide: addSlide,
    deleteCurrentSlide: deleteCurrentSlide,
    LAYOUTS: LAYOUTS
  };

})();