-- Table user_programs
-- À exécuter dans Supabase → SQL Editor

CREATE TABLE IF NOT EXISTS user_programs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  program_id     TEXT NOT NULL,          -- ID du programme (ex: 'tractions-pavel')
  start_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  sessions_done  INTEGER NOT NULL DEFAULT 0,
  active         BOOLEAN NOT NULL DEFAULT TRUE,
  config         JSONB,                  -- Config perso (ex: {"pullup_max":5} ou {"squat":100,...})
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Migration si la table existe déjà : ajouter la colonne config
ALTER TABLE user_programs ADD COLUMN IF NOT EXISTS config JSONB;

-- Row Level Security
ALTER TABLE user_programs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own user_programs" ON user_programs;
CREATE POLICY "Users manage own user_programs"
  ON user_programs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
