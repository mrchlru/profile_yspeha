-- Legacy БД: отсутствуют consent_recorded_at и/или step1_data…step4_data (см. web/scripts/migrate_add_consent_recorded_at.sql).

ALTER TABLE "screening_submission" ADD COLUMN IF NOT EXISTS "consent_recorded_at" TIMESTAMPTZ;
ALTER TABLE "screening_submission" ADD COLUMN IF NOT EXISTS "step1_data" JSONB;
ALTER TABLE "screening_submission" ADD COLUMN IF NOT EXISTS "step2_data" JSONB;
ALTER TABLE "screening_submission" ADD COLUMN IF NOT EXISTS "step3_data" JSONB;
ALTER TABLE "screening_submission" ADD COLUMN IF NOT EXISTS "step4_data" JSONB;

UPDATE "screening_submission"
SET
  "consent_recorded_at" = COALESCE("consent_recorded_at", "created_at"),
  "step1_data" = COALESCE("step1_data", '{}'::jsonb),
  "step2_data" = COALESCE("step2_data", '{}'::jsonb),
  "step3_data" = COALESCE("step3_data", '{}'::jsonb),
  "step4_data" = COALESCE("step4_data", '{}'::jsonb);

ALTER TABLE "screening_submission" ALTER COLUMN "consent_recorded_at" SET NOT NULL;
ALTER TABLE "screening_submission" ALTER COLUMN "step1_data" SET NOT NULL;
ALTER TABLE "screening_submission" ALTER COLUMN "step2_data" SET NOT NULL;
ALTER TABLE "screening_submission" ALTER COLUMN "step3_data" SET NOT NULL;
ALTER TABLE "screening_submission" ALTER COLUMN "step4_data" SET NOT NULL;
