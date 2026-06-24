#!/usr/bin/env node
/*
 * PTML Build Script — compiles a .md deck into a standalone .html file.
 *
 * Usage:
 *   node build.js input.md [output.html] [--theme minimal-white] [--embed]
 *
 * --theme   Override theme (default: from front matter or minimal-white)
 * --embed   Inline all CSS/JS into a single self-contained HTML file
 *
 * Examples:
 *   node build.js deck.md                    # -> deck.html
 *   node build.js deck.md out.html --theme dracula
 *   node build.js deck.md out.html --embed   # single-file, no external deps
 */

const fs = require('fs');
const path = require('path');

// ── Argument parsing ────────────────────────────────────────────
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node build.js input.md [output.html] [--theme name] [--embed]');
  process.exit(1);
}

let inputPath = null;
let outputPath = null;
let themeOverride = null;
let embed = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--theme') { themeOverride = args[++i]; continue; }
  if (args[i] === '--embed') { embed = true; continue; }
  if (!inputPath) { inputPath = args[i]; continue; }
  if (!outputPath) { outputPath = args[i]; continue; }
}

if (!inputPath) {
  console.error('Error: No input file specified');
  process.exit(1);
}

// Derive output path
if (!outputPath) {
  outputPath = inputPath.replace(/\.md$/i, '.html');
}

// ── Resolve paths ───────────────────────────────────────────────
const ROOT = path.resolve(__dirname, '..', '..');
const ENGINE_DIR = path.join(ROOT, 'src', 'engine');
const PARSER_FILE = path.join(ROOT, 'src', 'parser', 'ptml-parser.js');
const THEMES_DIR = path.join(ROOT, 'themes');
const ANIMATIONS_DIR = path.join(ROOT, 'animations');

// ── Load parser ────────────────────────────────────────────────
// The parser is designed for browser, but we can require it in Node
const parserCode = fs.readFileSync(PARSER_FILE, 'utf8');
const moduleObj = { exports: {} };
// Execute parser code in a sandbox-like context
new Function('module', 'exports', parserCode)(moduleObj, moduleObj.exports);
const PTML = moduleObj.exports.PTML || moduleObj.exports;

if (!PTML || !PTML.parse) {
  console.error('Error: Failed to load PTML parser');
  process.exit(1);
}

// ── Read markdown ───────────────────────────────────────────────
const markdown = fs.readFileSync(inputPath, 'utf8');

// ── Parse ───────────────────────────────────────────────────────
const parsed = PTML.parse(markdown);

console.log(`[PTML] Parsed ${parsed.slideCount} slides from ${inputPath}`);

// ── Determine output directory and base path ────────────────────
const outputDir = path.dirname(path.resolve(outputPath));
// If embedding, base path doesn't matter (everything is inline)
const basePath = embed ? '.' : path.relative(outputDir, ENGINE_DIR).replace(/\\/g, '/');

// ── Build HTML ──────────────────────────────────────────────────
let html = PTML.buildHTML(parsed, {
  basePath: basePath,
  theme: themeOverride
});

// ── Embed mode: inline all assets ──────────────────────────────
if (embed) {
  console.log('[PTML] Embedding assets into single file...');

  // Inline CSS files
  html = html.replace(/<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g, (match, href) => {
    let cssPath;
    if (href.includes('fonts.css')) cssPath = path.join(ENGINE_DIR, 'fonts.css');
    else if (href.includes('base.css')) cssPath = path.join(ENGINE_DIR, 'base.css');
    else if (href.includes('animations.css')) cssPath = path.join(ANIMATIONS_DIR, 'animations.css');
    else if (href.includes('/themes/')) {
      const themeName = href.match(/\/themes\/(.+)\.css/);
      if (themeName) cssPath = path.join(THEMES_DIR, themeName[1] + '.css');
    }
    if (cssPath && fs.existsSync(cssPath)) {
      const css = fs.readFileSync(cssPath, 'utf8');
      return '<style>\n/* ' + path.basename(cssPath) + ' */\n' + css + '\n</style>';
    }
    return match; // Keep as-is if file not found
  });

  // Inline JS files
  html = html.replace(/<script src="([^"]+)"><\/script>/g, (match, src) => {
    let jsPath;
    if (src.includes('runtime.js')) jsPath = path.join(ENGINE_DIR, 'runtime.js');
    else if (src.includes('fx-runtime.js')) jsPath = path.join(ANIMATIONS_DIR, 'fx-runtime.js');
    if (jsPath && fs.existsSync(jsPath)) {
      const js = fs.readFileSync(jsPath, 'utf8');
      return '<script>\n' + js + '\n</script>';
    }
    return match;
  });

  console.log('[PTML] Embedded all CSS/JS into single file');
}

// ── Write output ────────────────────────────────────────────────
fs.writeFileSync(outputPath, html, 'utf8');
const sizeKB = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(1);
console.log(`[PTML] Wrote ${outputPath} (${sizeKB} KB)`);
