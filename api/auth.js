// /api/auth — signup, signin, session
const { getPool, hashPassword, verifyPassword, signToken, verifyToken,
        sendJSON, getBody, getAuthToken } = require('./_db');

module.exports = async (req, res) => {
  const body = getBody(req);
  const action = body.action || (req.query.action);

  // ── Session check ──────────────────────────────────────────
  if (req.method === 'GET' || action === 'session') {
    const token = getAuthToken(req);
    const payload = verifyToken(token);
    if (payload) {
      sendJSON(res, 200, { user: { id: payload.userId, email: payload.email, name: payload.name } });
    } else {
      sendJSON(res, 401, { error: 'Not authenticated' });
    }
    return;
  }

  if (req.method !== 'POST') {
    sendJSON(res, 405, { error: 'Method not allowed' });
    return;
  }

  const { email, password, name } = body;

  if (!email || !password) {
    sendJSON(res, 400, { error: 'Email and password are required' });
    return;
  }

  if (password.length < 6) {
    sendJSON(res, 400, { error: 'Password must be at least 6 characters' });
    return;
  }

  const pool = getPool();

  try {
    if (action === 'signup') {
      // Check if user exists
      const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
      if (existing.rows.length > 0) {
        sendJSON(res, 409, { error: 'An account with this email already exists' });
        return;
      }

      const passHash = hashPassword(password);
      const result = await pool.query(
        'INSERT INTO users (email, name, pass_hash) VALUES ($1, $2, $3) RETURNING id, email, name',
        [email.toLowerCase(), name || email.split('@')[0], passHash]
      );

      const user = result.rows[0];
      const token = signToken({ userId: user.id, email: user.email, name: user.name, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 });
      sendJSON(res, 201, { user, token });
      return;
    }

    if (action === 'signin') {
      const result = await pool.query('SELECT id, email, name, pass_hash FROM users WHERE email = $1', [email.toLowerCase()]);
      if (result.rows.length === 0) {
        sendJSON(res, 401, { error: 'Invalid email or password' });
        return;
      }

      const user = result.rows[0];
      if (!verifyPassword(password, user.pass_hash)) {
        sendJSON(res, 401, { error: 'Invalid email or password' });
        return;
      }

      const token = signToken({ userId: user.id, email: user.email, name: user.name, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 });
      sendJSON(res, 200, { user: { id: user.id, email: user.email, name: user.name }, token });
      return;
    }

    sendJSON(res, 400, { error: 'Unknown action. Use signup, signin, or session.' });
  } catch (err) {
    console.error('Auth error:', err);
    sendJSON(res, 500, { error: 'Server error' });
  }
};
