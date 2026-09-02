-- Синхронизация с Prisma: старые БД без session_id / части полей профиля
-- (см. web/scripts/migrate_add_session_columns.sql — тот же смысл, для prisma migrate deploy).

ALTER TABLE "screening_submission" ADD COLUMN IF NOT EXISTS "session_id" TEXT;
ALTER TABLE "screening_submission" ADD COLUMN IF NOT EXISTS "profile_name" TEXT;
ALTER TABLE "screening_submission" ADD COLUMN IF NOT EXISTS "personal_data_consent" BOOLEAN;

UPDATE "screening_submission"
SET
  "session_id" = COALESCE("session_id", "id"),
  "profile_name" = COALESCE("profile_name", ''),
  "personal_data_consent" = COALESCE("personal_data_consent", false);

ALTER TABLE "screening_submission" ALTER COLUMN "session_id" SET NOT NULL;
ALTER TABLE "screening_submission" ALTER COLUMN "profile_name" SET NOT NULL;
ALTER TABLE "screening_submission" ALTER COLUMN "personal_data_consent" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "screening_submission_session_id_key" ON "screening_submission" ("session_id");
