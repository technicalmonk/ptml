// /api/decks — CRUD for user decks (auth required)
const { getPool, sendJSON, getBody, requireAuth, generateSlug } = require('./_db');

module.exports = async (req, res) => {
  const user = requireAuth(req);
  if (!user) {
    sendJSON(res, 401, { error: 'Not authenticated' });
    return;
  }

  const pool = getPool();

  // ── GET: list user's decks, or get a single deck by id ────────
  if (req.method === 'GET') {
    const deckId = req.query.id;
    try {
      if (deckId) {
        // Validate UUID to avoid Postgres errors
        if (!UUID_RE.test(deckId)) {
          sendJSON(res, 404, { error: 'Deck not found' });
        } else {
          // Get single deck with content
          const result = await pool.query(
            'SELECT id, title, content, thumbnail, is_public, share_slug, created_at, updated_at FROM decks WHERE id = $1 AND user_id = $2',
            [deckId, user.userId]
          );
          if (result.rows.length === 0) {
            sendJSON(res, 404, { error: 'Deck not found' });
          } else {
            sendJSON(res, 200, { deck: result.rows[0] });
          }
        }
      } else {
        // List all user's decks (without content for performance)
        const result = await pool.query(
          'SELECT id, title, thumbnail, is_public, share_slug, created_at, updated_at FROM decks WHERE user_id = $1 ORDER BY updated_at DESC',
          [user.userId]
        );
        sendJSON(res, 200, { decks: result.rows });
      }
    } catch (err) {
      console.error('Get decks error:', err);
      sendJSON(res, 500, { error: 'Server error' });
    }
    return;
  }

  // ── POST: create or update a deck ────────────────────────────
  if (req.method === 'POST') {
    const body = getBody(req);
    const { id, title, content, thumbnail } = body;

    // Check if id is a valid UUID before attempting UPDATE
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    try {
      // Try update first (only if id looks like a UUID)
      if (id && UUID_RE.test(id)) {
        const result = await pool.query(
          'UPDATE decks SET title = $1, content = $2, thumbnail = $3 WHERE id = $4 AND user_id = $5 RETURNING id, title, thumbnail, is_public, share_slug, created_at, updated_at',
          [title || 'Untitled', content || '', thumbnail || null, id, user.userId]
        );
        if (result.rows.length > 0) {
          sendJSON(res, 200, { deck: result.rows[0] });
          return;
        }
        // No rows matched — fall through to create
      }

      // Create new deck (database generates the UUID)
      const result = await pool.query(
        'INSERT INTO decks (user_id, title, content, thumbnail) VALUES ($1, $2, $3, $4) RETURNING id, title, thumbnail, is_public, share_slug, created_at, updated_at',
        [user.userId, title || 'Untitled', content || '', thumbnail || null]
      );
      sendJSON(res, 201, { deck: result.rows[0] });
    } catch (err) {
      console.error('Save deck error:', err);
      sendJSON(res, 500, { error: 'Server error' });
    }
    return;
  }

  // ── DELETE: remove a deck ────────────────────────────────────
  if (req.method === 'DELETE') {
    const deckId = req.query.id;
    if (!deckId) {
      sendJSON(res, 400, { error: 'Deck id is required' });
      return;
    }

    // Validate UUID to avoid Postgres errors
    if (!UUID_RE.test(deckId)) {
      sendJSON(res, 404, { error: 'Deck not found' });
      return;
    }

    try {
      const result = await pool.query(
        'DELETE FROM decks WHERE id = $1 AND user_id = $2 RETURNING id',
        [deckId, user.userId]
      );
      if (result.rows.length === 0) {
        sendJSON(res, 404, { error: 'Deck not found or not owned by you' });
        return;
      }
      sendJSON(res, 200, { deleted: true });
    } catch (err) {
      console.error('Delete deck error:', err);
      sendJSON(res, 500, { error: 'Server error' });
    }
    return;
  }

  sendJSON(res, 405, { error: 'Method not allowed' });
};
