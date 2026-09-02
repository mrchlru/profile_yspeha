-- Устарело как отдельный ручной шаг: то же есть в create_tables.sql + prisma migrate deploy (setupDb.mjs).
-- Миграция для уже существующей таблицы screening_submission без полей сессии.

ALTER TABLE screening_submission ADD COLUMN IF NOT EXISTS session_id TEXT;
ALTER TABLE screening_submission ADD COLUMN IF NOT EXISTS profile_name TEXT;
ALTER TABLE screening_submission ADD COLUMN IF NOT EXISTS personal_data_consent BOOLEAN;

UPDATE screening_submission
SET
  session_id = COALESCE(session_id, id),
  profile_name = COALESCE(profile_name, ''),
  personal_data_consent = COALESCE(personal_data_consent, false);

ALTER TABLE screening_submission ALTER COLUMN session_id SET NOT NULL;
ALTER TABLE screening_submission ALTER COLUMN profile_name SET NOT NULL;
ALTER TABLE screening_submission ALTER COLUMN personal_data_consent SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS screening_submission_session_id_key
  ON screening_submission (session_id);
