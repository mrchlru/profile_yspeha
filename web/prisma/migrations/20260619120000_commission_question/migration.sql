CREATE TABLE IF NOT EXISTS commission_question (
  id TEXT NOT NULL PRIMARY KEY,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  text TEXT NOT NULL,
  category TEXT NOT NULL,
  position_levels TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  specialties TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  ai_suggested BOOLEAN NOT NULL DEFAULT false,
  created_by TEXT
);

CREATE INDEX IF NOT EXISTS commission_question_category_idx
  ON commission_question (category);

CREATE INDEX IF NOT EXISTS commission_question_active_idx
  ON commission_question (active);
