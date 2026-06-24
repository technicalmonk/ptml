# PTML — Stage 1: Framework Comparison Analysis

## Executive Summary

Three frameworks were evaluated for PTML: Reveal.js, WebSlides, and html-ppt-skill.
Identical 5-slide test decks were built for each. Below is the head-to-head analysis.

## Quick Comparison Table

| Feature               | Reveal.js v6.0.1            | WebSlides v1.5.0          | html-ppt-skill              |
|-----------------------|-----------------------------|---------------------------|-----------------------------|
| License               | MIT                         | MIT                       | MIT                         |
| JS Size (min)         | 116KB                       | 32KB (min) / 92KB (full)  | ~15KB runtime.js            |
| Dependencies          | None (standalone dist)      | None (standalone)          | Zero (pure static)          |
| Build Step Required   | No (use dist/)              | No (use static/)           | No                           |
| Themes                | 14 built-in                 | ~10 (CSS color classes)    | 36                           |
| Layouts               | DIY (HTML/CSS)              | 120+ demo slides           | 31 single-page layouts       |
| Animations            | Transitions + Auto-Animate  | CSS transitions            | 27 CSS + 20 Canvas FX = 47   |
| Presenter Mode        | Yes (plugin: notes)         | No                         | Yes (S key, 4 magnetic cards)|
| Speaker Notes         | Yes (plugin)                | No                         | Yes (aside.notes + overlay)  |
| Markdown Support      | Yes (plugin)                | No                         | No (manual HTML)             |
| PDF Export            | Yes (built-in)              | No                         | Via headless Chrome script   |
| Overview Mode         | Yes (Esc key)               | No                         | Yes (O key)                  |
| Theme Switching       | Manual (swap CSS)           | Manual                     | Runtime (T key cycles)       |
| Deep Linking          | Yes (#/slide)               | Yes (permalinks)           | Yes (#/N hash)               |
| Touch/Swipe Nav       | Yes                         | Yes                       | Yes (keyboard only in runtime)|
| LaTeX/Math            | Yes (plugin)                | No                         | No                           |
| Syntax Highlighting   | Yes (plugin)                | No                         | No                           |
| Nested Slides         | Yes                         | No                         | No                           |
| Agent/Skill Native    | No                          | No                         | Yes (designed as AgentSkill) |
| npm Install           | Yes                         | Yes                       | npx skills add               |
| Community/Stars       | ~67k GitHub stars           | ~6k GitHub stars           | ~6.4k GitHub stars           |
| Last Updated          | Active (2024)               | Stale (last release ~2019) | Active (2024)                |

## Detailed Analysis

### Reveal.js — The Industry Standard

**Strengths:**
- Most mature and widely adopted (67k stars, used by slides.com)
- Rich plugin ecosystem: Markdown, syntax highlighting, math/LaTeX, search, zoom, notes
- Nested slides (vertical + horizontal navigation)
- Auto-Animate (automatic transitions between similar elements)
- PDF export built directly into the framework
- Strong community support and documentation
- React wrapper available for integration into React apps

**Weaknesses:**
- Only 14 themes out of the box (all fairly generic)
- No built-in layout system — you write HTML/CSS from scratch
- Presenter mode is basic (speaker notes plugin, no dual-screen)
- Heavier JS bundle (116KB)
- Not designed for agent/AI-driven generation
- Customizing beyond themes requires significant CSS work

**Best for:** Developer-driven presentations where you want maximum control and don't mind writing HTML.

---

### WebSlides — The Simple Approach

**Strengths:**
- Cleanest, most semantic HTML (section-based, very readable)
- 120+ demo slides with real content to learn from
- CSS-first approach — minimal JS needed
- Smallest minified JS (32KB)
- Good keyboard + touch navigation
- Permalinks for deep linking

**Weaknesses:**
- Project appears abandoned (last meaningful release ~2019)
- No presenter mode or speaker notes
- No Markdown support
- No PDF export
- No animation system beyond basic CSS transitions
- Limited themes (mostly color variants, not distinct designs)
- Build tooling is outdated (webpack 3, babel 6)

**Best for:** Simple, no-frills presentations. But the stale maintenance is a red flag for building a product on top of.

---

### html-ppt-skill — The Agent-Native System

**Strengths:**
- Purpose-built for AI agents to generate presentations
- Most themes by far (36 distinct, well-designed themes)
- 31 pre-built layouts covering every common slide type
- 47 animations (27 CSS + 20 canvas FX) — most expressive
- Best presenter mode: 4 draggable, resizable magnetic cards with pixel-perfect iframe previews
- Zero dependencies, no build step, pure static HTML/CSS/JS
- Token-based design system (CSS custom properties) — easy to theme
- Runtime keyboard shortcuts (T for theme cycling, O for overview, S for presenter, A for animation demo)
- Headless Chrome render script for PNG export
- 15 full-deck templates for rapid scaffolding
- Active development (2024)

**Weaknesses:**
- No Markdown support (must write HTML)
- No LaTeX/math support
- No syntax highlighting plugin
- No nested slides
- Newer project, smaller community than Reveal.js
- Some Chinese-language conventions in docs (though all code is English)
- Canvas FX animations may be heavy on low-end devices

**Best for:** AI-driven presentation generation where an agent assembles slides from templates. The layout + theme system is ideal for programmatic deck creation.

---

## Recommendation

For PTML's use case — a product where AI agents build, design, and review presentations — **html-ppt-skill** is the strongest foundation:

1. **Agent-native design**: Built specifically for AI agents to generate decks. The layout/theme/animation taxonomy maps directly to structured generation.
2. **Most themes & layouts**: 36 themes + 31 layouts gives us the largest design vocabulary for the "Design Agent" (Pro tier).
3. **Zero dependencies**: No build pipeline to maintain, no npm audit vulnerabilities, no supply chain risk.
4. **Best presenter mode**: The 4-card magnetic presenter is production-grade.
5. **Token-based theming**: CSS custom properties make dynamic theming trivial — essential for a "Design Agent."
6. **Active development**: Recently updated, MIT licensed.

**However**, we should borrow concepts from Reveal.js:
- Add Markdown support (for content input)
- Add PDF export capability
- Consider syntax highlighting for code slides

## Hybrid Strategy

The recommended approach is to **fork html-ppt-skill as the base** and extend it:

1. Fork html-ppt-skill → PTML core engine
2. Add Markdown-to-HTML slide parser (from Reveal.js's approach)
3. Add PDF export via headless Chrome (html-ppt-skill already has render.sh)
4. Add syntax highlighting (Prism.js or highlight.js, lightweight)
5. Build the JSON/content schema on top of the layout system
6. Wrap in a backend API for the builder/viewer/analytics features

This gives us the best of all three worlds: agent-native design, rich theming, and the features business users expect.

## Test Decks

Open the comparison index to view all three side by side:
- Index: /home/pshimshock/Projects/PTML/tests/index.html
- Reveal.js: /home/pshimshock/Projects/PTML/tests/revealjs-deck.html
- WebSlides: /home/pshimshock/Projects/PTML/tests/webslides-deck.html
- html-ppt-skill: /home/pshimshock/Projects/PTML/tests/html-ppt-deck.html

To serve locally:
```bash
cd /home/pshimshock/Projects/PTML && python3 -m http.server 8080
```
Then open http://localhost:8080/tests/
