// PTML API — shared database utilities
// Used by all /api/* serverless functions

const { Pool } = require('pg');

let pool = null;

function getPool() {
  if (!pool) {
    if (!process.env.NEON_DATABASE_URL) {
      throw new Error('NEON_DATABASE_URL is not set');
    }
    pool = new Pool({
      connectionString: process.env.NEON_DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 3, // serverless: keep pool small
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }
  return pool;
}

// ── Password hashing (no external deps — use Node crypto) ──────
const crypto = require('crypto');

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return salt + ':' + hash;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const testHash = crypto.scryptSync(password, salt, 64).toString('hex');
  return hash === testHash;
}

// ── JWT (simple, no external deps) ──────────────────────────────
function signToken(payload) {
  const secret = process.env.JWT_SECRET || 'dev-secret-change-me';
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(header + '.' + body).digest('base64url');
  return header + '.' + body + '.' + sig;
}

function verifyToken(token) {
  if (!token) return null;
  const secret = process.env.JWT_SECRET || 'dev-secret-change-me';
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', secret).update(header + '.' + body).digest('base64url');
  if (sig !== expectedSig) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

// ── Express-like helpers for Vercel serverless functions ───────
function sendJSON(res, status, data) {
  res.status(status).json(data);
}

function getBody(req) {
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch (e) { return {}; }
  }
  return req.body || {};
}

function getAuthToken(req) {
  const auth = req.headers.authorization || req.headers.Authorization;
  if (auth && auth.startsWith('Bearer ')) {
    return auth.slice(7);
  }
  // Also check cookies
  const cookie = req.headers.cookie || '';
  const match = cookie.match(/ptml_token=([^;]+)/);
  if (match) return match[1];
  return null;
}

function requireAuth(req) {
  const token = getAuthToken(req);
  const payload = verifyToken(token);
  if (!payload) return null;
  return payload; // { userId, email, name }
}

// Generate a short share slug
function generateSlug() {
  return Math.random().toString(36).substring(2, 10);
}

module.exports = {
  getPool,
  hashPassword,
  verifyPassword,
  signToken,
  verifyToken,
  sendJSON,
  getBody,
  getAuthToken,
  requireAuth,
  generateSlug,
};
