-- Table custom_programs
-- Programmes créés manuellement par les utilisateurs

CREATE TABLE IF NOT EXISTS custom_programs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  emoji            TEXT NOT NULL DEFAULT '💪',
  description      TEXT,
  level            TEXT NOT NULL DEFAULT 'Intermédiaire',
  duration_weeks   INTEGER NOT NULL,
  sessions_per_week INTEGER NOT NULL,
  sessions         JSONB NOT NULL DEFAULT '[]',   -- CustomSession[]
  share_token      TEXT UNIQUE DEFAULT gen_random_uuid()::text,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE custom_programs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Author manages own programs" ON custom_programs;
CREATE POLICY "Author manages own programs"
  ON custom_programs FOR ALL
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

-- Lecture publique via share_token (pour le partage)
DROP POLICY IF EXISTS "Anyone can read by share_token" ON custom_programs;
CREATE POLICY "Anyone can read by share_token"
  ON custom_programs FOR SELECT
  USING (share_token IS NOT NULL);

-- Index pour les lookups
CREATE INDEX IF NOT EXISTS custom_programs_author_idx ON custom_programs(author_id);
CREATE INDEX IF NOT EXISTS custom_programs_token_idx  ON custom_programs(share_token);
