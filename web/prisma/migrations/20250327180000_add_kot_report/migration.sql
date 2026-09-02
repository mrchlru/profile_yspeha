-- AlterTable
ALTER TABLE "screening_submission" ADD COLUMN IF NOT EXISTS "kot_report" JSONB;
