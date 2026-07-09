-- PTML Schema — Neon Postgres
-- Run this in your Neon SQL editor

-- ── Extensions ─────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Users ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT UNIQUE NOT NULL,
  name        TEXT,
  pass_hash   TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Decks ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS decks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL DEFAULT 'Untitled',
  content     TEXT NOT NULL DEFAULT '',
  thumbnail   TEXT,
  is_public   BOOLEAN NOT NULL DEFAULT false,
  share_slug  TEXT UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_decks_user_id ON decks(user_id);
CREATE INDEX IF NOT EXISTS idx_decks_share_slug ON decks(share_slug);

-- ── Updated_at trigger ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_decks_updated ON decks;
CREATE TRIGGER trg_decks_updated BEFORE UPDATE ON decks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Analytics ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS deck_views (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id     UUID NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  viewer_id   TEXT DEFAULT 'anonymous',
  slide       INT DEFAULT 1,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deck_views_deck_id ON deck_views(deck_id);
