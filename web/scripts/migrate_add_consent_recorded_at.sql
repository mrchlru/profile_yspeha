-- Устарело как отдельный ручной шаг: то же есть в create_tables.sql + prisma migrate deploy (setupDb.mjs).
-- Однократная миграция: время фиксации согласия с политикой (юридический учёт).

ALTER TABLE screening_submission
  ADD COLUMN IF NOT EXISTS consent_recorded_at TIMESTAMPTZ;

UPDATE screening_submission
SET consent_recorded_at = COALESCE(consent_recorded_at, created_at)
WHERE consent_recorded_at IS NULL;

ALTER TABLE screening_submission
  ALTER COLUMN consent_recorded_at SET NOT NULL;
