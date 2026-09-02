-- Идемпотентный bootstrap для Postgres: вызывается из scripts/setupDb.mjs до prisma migrate deploy.
-- Должен соответствовать web/prisma/schema.prisma (модель ScreeningSubmission).
-- CREATE TABLE IF NOT EXISTS не добавляет колонки в уже существующую таблицу — ниже блоки ALTER … IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS screening_submission (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  session_id TEXT NOT NULL UNIQUE,
  profile_name TEXT NOT NULL,
  personal_data_consent BOOLEAN NOT NULL,
  consent_recorded_at TIMESTAMPTZ NOT NULL,

  step1_data JSONB NOT NULL,
  step2_data JSONB NOT NULL,
  step3_data JSONB NOT NULL,
  step4_data JSONB NOT NULL,
  kot_report JSONB
);

-- Уже существующие БД без столбца (старый скрипт без kot_report):
ALTER TABLE screening_submission ADD COLUMN IF NOT EXISTS kot_report JSONB;

-- Legacy: таблица создана старой версией без session_id / полей профиля (см. prisma migration 20260330120000).
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

-- Legacy: нет consent_recorded_at и/или JSON полей шагов (см. migrate_add_consent_recorded_at.sql).
ALTER TABLE screening_submission ADD COLUMN IF NOT EXISTS consent_recorded_at TIMESTAMPTZ;
ALTER TABLE screening_submission ADD COLUMN IF NOT EXISTS step1_data JSONB;
ALTER TABLE screening_submission ADD COLUMN IF NOT EXISTS step2_data JSONB;
ALTER TABLE screening_submission ADD COLUMN IF NOT EXISTS step3_data JSONB;
ALTER TABLE screening_submission ADD COLUMN IF NOT EXISTS step4_data JSONB;

UPDATE screening_submission
SET
  consent_recorded_at = COALESCE(consent_recorded_at, created_at),
  step1_data = COALESCE(step1_data, '{}'::jsonb),
  step2_data = COALESCE(step2_data, '{}'::jsonb),
  step3_data = COALESCE(step3_data, '{}'::jsonb),
  step4_data = COALESCE(step4_data, '{}'::jsonb);

ALTER TABLE screening_submission ALTER COLUMN consent_recorded_at SET NOT NULL;
ALTER TABLE screening_submission ALTER COLUMN step1_data SET NOT NULL;
ALTER TABLE screening_submission ALTER COLUMN step2_data SET NOT NULL;
ALTER TABLE screening_submission ALTER COLUMN step3_data SET NOT NULL;
ALTER TABLE screening_submission ALTER COLUMN step4_data SET NOT NULL;

-- Приглашения с кодом доступа к тестам (см. prisma AccessInvite).
CREATE TABLE IF NOT EXISTS access_invite (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  code TEXT NOT NULL UNIQUE,
  test_kind TEXT NOT NULL,
  revoked_at TIMESTAMPTZ
);

ALTER TABLE access_invite ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

UPDATE access_invite
SET expires_at = created_at + INTERVAL '3 days'
WHERE expires_at IS NULL;

ALTER TABLE access_invite ALTER COLUMN expires_at SET NOT NULL;

-- Колонка «код использован» (см. prisma 20260515110000_access_invite_used_at).
ALTER TABLE access_invite ADD COLUMN IF NOT EXISTS used_at TIMESTAMP(3);

-- Прохождения аудита состояния (см. prisma 20260516000000_add_audit_submission).
CREATE TABLE IF NOT EXISTS audit_submission (
  id TEXT NOT NULL PRIMARY KEY,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  session_id TEXT NOT NULL,
  assessee_key TEXT NOT NULL,
  assessee_key_version INTEGER NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  personal_data_consent BOOLEAN NOT NULL,
  consent_recorded_at TIMESTAMP(3) NOT NULL,
  answers JSONB NOT NULL,
  audit_report JSONB
);

CREATE UNIQUE INDEX IF NOT EXISTS audit_submission_session_id_key
  ON audit_submission (session_id);

CREATE INDEX IF NOT EXISTS audit_submission_assessee_idx
  ON audit_submission (assessee_key, created_at);
