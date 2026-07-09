# PTML

HTML-based presentations for the post-PPTX era. Write decks in Markdown, render in any browser.

## Quick Start

```bash
# Clone
git clone https://github.com/technicalmonk/ptml.git
cd ptml

# Build a deck from Markdown
node src/parser/build.js examples/ptml-overview.md

# Open the built HTML file
open examples/ptml-overview.html

# Or use the live viewer (parses .md in-browser)
python3 -m http.server 8080
# Then visit http://localhost:8080/public/viewer.html
```

## How It Works

1. Write a presentation as a Markdown file (.md)
2. Run the build script to compile it into a standalone HTML file
3. Open the HTML file in any browser — no server required

Or use the viewer page to load .md files dynamically without building.

## PTML Markdown Format

A PTML deck is a standard Markdown file with three extensions:

### Front Matter (optional)

YAML-style block at the top, delimited by `---`:

```
---
theme: pitch-deck-vc
title: My Presentation
author: Jane Doe
themeList: minimal-white,pitch-deck-vc,dracula
---
```

- `theme` — which of the 36 themes to use
- `title` — document title (shows in browser tab)
- `author` — author metadata
- `themeList` — themes available for live switching (T key)

### Slide Separators

Slides are separated by a horizontal rule (`---`) on its own line:

```markdown
# Slide 1

Content here

---

# Slide 2

More content
```

### Directives (optional)

HTML comments that control per-slide behavior:

```
<!-- layout: cover -->
<!-- theme: dark -->
<!-- anim: fade-up -->
<!-- notes: Speaker notes for presenter mode -->
```

Available layouts: `cover`, `content`, `bullets`, `big-quote`, `code`, `image`, `cta`.

If no layout is specified, the parser infers it from content.

### Markdown Support

Standard Markdown is supported within slides:

- Headings: `#`, `##`, `###`, `####`
- **Bold** and *italic*
- `inline code`
- Code blocks with language: ` ```python `
- Links: `[text](url)`
- Images: `![alt](url)`
- Blockquotes: `>`
- Unordered lists: `-`, `*`, `+`
- Ordered lists: `1.`, `2.`, ...

### PTML Extensions

- `[Label]` on its own line becomes an eyebrow label
- `^Label` on its own line becomes a kicker

## Keyboard Controls

| Key | Action |
|-----|--------|
| Arrow Right / Space | Next slide |
| Arrow Left | Previous slide |
| Home / End | First / Last slide |
| F | Fullscreen |
| S | Presenter mode (speaker notes + timer) |
| N | Notes overlay |
| O | Overview grid |
| T | Cycle themes |
| A | Cycle animations |
| Esc | Close overlay |

## Build Options

```bash
# Basic build
node src/parser/build.js deck.md

# Specify output file
node src/parser/build.js deck.md output.html

# Override theme
node src/parser/build.js deck.md output.html --theme dracula

# Embed all CSS/JS into single self-contained file
node src/parser/build.js deck.md output.html --embed
```

The `--embed` flag produces a single HTML file with all CSS and JS inlined.
No external dependencies — share one file and it just works.

## Themes

36 themes are included. Press T during a presentation to cycle live.

Popular themes: `minimal-white`, `pitch-deck-vc`, `dracula`, `tokyo-night`,
`aurora`, `corporate-clean`, `swiss-grid`, `nord`, `solarized-light`,
`cyberpunk-neon`, `editorial-serif`, `glassmorphism`.

See all: `ls src/engine/themes/`

## Project Structure

```
ptml/
  src/
    engine/           Core runtime (CSS, JS, themes, animations)
      base.css         Design tokens + layout primitives
      fonts.css        Web font imports
      runtime.js       Deck engine (navigation, presenter, overview)
      themes/          36 theme CSS files
      animations/      CSS animations + canvas FX
    parser/           Markdown-to-HTML parser and build tools
      ptml-parser.js   PTML Markdown parser (browser + Node)
      ptml-loader.js   Client-side loader for dynamic .md loading
      build.js         Node.js build script (md -> html)
  public/
    viewer.html        Live viewer page
  examples/
    ptml-overview.md   Example deck (5 slides)
    code-showcase.md   Code-focused example (4 slides)
    minimal-deck.md    Minimal example (4 slides)
  vercel.json          Vercel deployment config
  package.json
```

## Deployment (Vercel + GitHub)

1. Push this repo to GitHub
2. In Vercel, import the repo
3. No build step needed — Vercel serves the static files directly
4. The viewer page is at `/public/viewer.html`
5. Decks can be loaded via URL: `?deck=path/to/deck.md`

The `vercel.json` includes a rewrite rule so `/deck/path/to/deck.md`
automatically opens the viewer with that deck loaded.

## License

MIT

