# PTML Design and UI/UX Review

Date: July 10, 2026
Auditor: Hermes Agent (design review mode)
Live site: https://ptml-tan.vercel.app/

## Executive Summary

PTML has a solid foundation -- a clean design-system.css token set, a working
Neon-backed API, and a Markdown-first presentation engine with 36 themes. But
the product currently suffers from a split-personality visual system, emoji-
dependent iconography, misleading marketing copy, and several accessibility
gaps. This review identifies issues by priority and documents what was fixed.

## Slop Diagnostic (pre-fix)

Score: 5/10 (moderate slop)

Tells that fired:
1. Wrong surface -- landing page uses hero+feature-grid+pricing-card composition
   (correct for Decide/Learn), but the builder uses a completely different dark
   theme with gradient brand logo and emoji nav, creating visual whiplash
2. Default type -- system font stack with no deliberate font choice
3. Emoji as iconography -- throughout builder nav, dashboard, export panel,
   template chooser, empty states
4. Center stack -- landing page hero is centered (acceptable for Decide/Learn)
5. Content accuracy -- landing page advertises features that don't exist
   (HTML/embed/PDF export, enriched analytics, Pexels) and says "No signup
   required" while requiring login

## Issues Found and Fixed

### P0 -- Content Accuracy (Fixed)

**Landing page said "No signup required" but auth is required.**
- index.html line 59: "No signup required. All features free."
- Contradicts the entire auth flow (login.html -> dashboard.html -> builder)
- Fix: Changed to "Free forever. All features included."

**Landing page advertised non-existent features.**
- Listed "Export to HTML, embed, or PDF" but builder only offers Markdown export
- Listed "Enriched analytics (viewer tracking)" but analytics returns placeholder zeros
- Listed "Stock photo search (Pexels)" which is a niche feature, not a headline
- Fix: Replaced with actual features: Shareable links, Markdown export,
  Presenter mode, 47 animations

**Example deck still referenced freemium tiers.**
- examples/ptml-overview.md had "Free Tier" and "Pro Tier" slides with
  "PPTX Importation Agent", "Design Agent", "Content Review Agent"
- Fix: Replaced with "Free for everyone -- all features, no tiers"

### P0 -- Emoji Removal (Fixed)

Emoji was used throughout the product as iconography, violating the timeless
design constraint. Removed from:
- Builder sidebar nav (was: palette, abc, chart, floppy) -> text labels
- Dashboard inspiration cards (was: chart, laptop, page, rocket, wrench, graph)
- Dashboard empty state (was: page icon)
- Dashboard deck thumbnails (was: chart icon fallback)
- Export panel (was: link, page emojis)
- Share link modal (was: link emoji)
- Pexels modal (was: frame emoji)
- Template chooser (was: page, rocket, laptop, chart emojis)
- Landing page feature cards (was: globe, phone, link, pencil, palette, chart)

Builder sidebar widened from 56px to 96px to accommodate text labels.

### P1 -- Accessibility (Fixed)

**Login inputs had no visible focus state.**
- design-system.css sets `outline:none` on inputs but provides a border-color
  change and box-shadow on focus -- but login.html didn't include the
  .input:focus rule in its page-level styles
- Fix: Added .input:focus and .auth-footer a:focus rules to login.html

**Toggle links were not keyboard-accessible.**
- "Create one" and "Sign in" links used onclick on <a> with no href
- Tab key skipped them entirely
- Fix: Added href="javascript:void(0)" and onkeydown handlers, plus focus
  management (auto-focus name field on signup, email on signin)

### P1 -- Builder Visual System (Not Yet Fixed)

The builder (src/builder/builder.html) uses a completely separate visual system
from the public-facing pages (index, login, dashboard, viewer). This is the
largest remaining issue:

**Color mismatch:**
- Public pages: design-system.css tokens (#0066ff accent, #f8f9fa bg, #ffffff
  surfaces)
- Builder: hardcoded values (#0a0a0c bg, #3b6cff accent, #7a5cff gradient,
  #ff5c8a pink)
- The #3b6cff and #7a5cff are the OLD purple-gradient colors that Pete
  explicitly rejected

**Brand logo:**
- Builder uses gradient background: `linear-gradient(135deg,#3b6cff,#7a5cff
  55%,#ff5c8a)` -- the exact gradient Pete rejected
- Should be solid #0066ff or just text

**Recommendation:** Migrate builder.html to use design-system.css tokens
directly (import the file, replace all hardcoded colors with var() references).
This is a larger refactor that should be done as a dedicated pass.

### P2 -- Remaining Issues (Not Yet Fixed)

1. **No responsive behavior in builder.** Zero @media queries in
   builder.html. The split-pane editor/preview layout breaks below 768px.
   The formatting toolbar overflows on narrow screens.

2. **Dashboard has no loading skeleton.** Shows "Loading your decks..." as
   plain text instead of skeleton cards matching the final layout shape.

3. **Rename uses browser prompt().** dashboard.html line 257 uses
   window.prompt() for renaming -- functional but breaks the clean design
   language. Should be an inline edit or modal.

4. **Delete uses browser confirm().** Same pattern -- should be a styled
   confirmation modal.

5. **Analytics panel shows zeros with no explanation.** The viewer tracking
   API exists (/api/share records views) but getAnalyticsSummary returns
   hardcoded zeros. Either wire it to the API or show a "coming soon"
   message.

6. **No empty state for the builder editor.** When no deck is loaded, the
   editor textarea shows placeholder text but the preview pane shows
   "Preview will appear here" -- should have a more guided onboarding state.

7. **Theme panel has no search or filter.** 36 themes in a 2-column grid
   with no way to filter by name or category (light/dark/serif/mono).

8. **No keyboard shortcut documentation.** The runtime supports many
   shortcuts (S for presenter, O for overview, T for theme cycling, etc.)
   but these are not documented anywhere in the product UI.

9. **Viewer page has no "back" navigation.** Once a deck loads in the viewer,
   there's no way to get back to the landing page or dashboard without using
   the browser back button.

10. **Dashboard "Create from Existing" dropdown makes two async calls.**
    renderCloneMenu() calls PTMLClient.getDecks() separately from
    loadDecks(), causing redundant API calls.

## Surface Analysis

| Surface | Page | Archetype | Assessment |
|---------|------|-----------|------------|
| Decide/Learn | index.html | Hero + features + pricing | Correct composition, copy fixed |
| Configure | login.html | Centered auth card | Correct, accessibility fixed |
| Operate | dashboard.html | Grid of cards + actions | Correct, needs loading skeleton |
| Operate | builder.html | Split-pane editor + sidebar | Correct, needs visual alignment |
| Explore | viewer.html | Deck loader + examples | Correct, needs back nav |

## Design System Assessment

design-system.css is well-structured:
- Clean token set: 6 neutrals, 1 accent, 3 semantic colors
- Consistent radius scale (6/8/12px)
- Consistent shadow scale (sm/default/lg)
- Good utility classes (flex, grid, badges, modal, toast)
- Proper easing curve

Gaps:
- No dark mode tokens (builder hardcodes its own dark values)
- No type scale (font sizes are ad-hoc per page)
- No spacing scale (padding/margin are inline per component)
- Badge for "free" still exists (.badge-free) though no longer used

## Recommended Phase 2 Work

1. **Unify builder visual system** -- Import design-system.css into builder,
   replace all #0a0a0c/#3b6cff/#7a5cff with CSS variables. This is the
   single highest-impact visual change.

2. **Add responsive breakpoints** to builder.html -- at minimum, collapse
   the sidebar and stack editor above preview below 768px.

3. **Add loading skeletons** to dashboard -- skeleton cards that match the
   preso-card shape.

4. **Replace prompt()/confirm()** with styled modals on dashboard.

5. **Wire analytics** to the /api/share view-tracking data, or remove the
   analytics panel until it's functional.

6. **Add theme search/filter** to the builder theme panel.

7. **Document keyboard shortcuts** in the builder UI (a "?" overlay or a
   help panel).
