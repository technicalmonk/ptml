// /api/share — create and resolve share links
const { getPool, sendJSON, getBody, requireAuth, generateSlug } = require('./_db');

module.exports = async (req, res) => {
  const pool = getPool();

  // ── GET: resolve a share slug to deck content ──────────────
  if (req.method === 'GET') {
    const slug = req.query.slug;
    if (!slug) {
      sendJSON(res, 400, { error: 'Slug is required' });
      return;
    }

    try {
      const result = await pool.query(
        'SELECT d.id, d.title, d.content, d.thumbnail FROM decks d WHERE d.share_slug = $1 AND d.is_public = true',
        [slug]
      );
      if (result.rows.length === 0) {
        sendJSON(res, 404, { error: 'Deck not found or not shared' });
        return;
      }

      const deck = result.rows[0];

      // Record a view
      await pool.query(
        'INSERT INTO deck_views (deck_id, viewer_id, slide) VALUES ($1, $2, 1)',
        [deck.id, req.headers['x-forwarded-for'] || 'anonymous']
      );

      sendJSON(res, 200, { deck });
    } catch (err) {
      console.error('Resolve share error:', err);
      sendJSON(res, 500, { error: 'Server error' });
    }
    return;
  }

  // ── POST: create a share link for a deck (auth required) ────
  if (req.method === 'POST') {
    const user = requireAuth(req);
    if (!user) {
      sendJSON(res, 401, { error: 'Not authenticated' });
      return;
    }

    const body = getBody(req);
    const { deckId } = body;
    if (!deckId) {
      sendJSON(res, 400, { error: 'Deck id is required' });
      return;
    }

    try {
      // Check if deck already has a share slug
      const existing = await pool.query(
        'SELECT share_slug FROM decks WHERE id = $1 AND user_id = $2',
        [deckId, user.userId]
      );
      if (existing.rows.length === 0) {
        sendJSON(res, 404, { error: 'Deck not found or not owned by you' });
        return;
      }

      let slug = existing.rows[0].share_slug;
      if (slug) {
        // Already shared — make sure is_public is true
        await pool.query('UPDATE decks SET is_public = true WHERE id = $1', [deckId]);
        sendJSON(res, 200, { slug, url: '/viewer.html?share=' + slug });
        return;
      }

      // Generate a new slug
      slug = generateSlug();
      await pool.query(
        'UPDATE decks SET is_public = true, share_slug = $1 WHERE id = $2',
        [slug, deckId]
      );
      sendJSON(res, 200, { slug, url: '/viewer.html?share=' + slug });
    } catch (err) {
      console.error('Create share error:', err);
      sendJSON(res, 500, { error: 'Server error' });
    }
    return;
  }

  sendJSON(res, 405, { error: 'Method not allowed' });
};
