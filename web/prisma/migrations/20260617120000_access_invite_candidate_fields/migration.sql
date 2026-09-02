-- AlterTable
ALTER TABLE "access_invite" ADD COLUMN IF NOT EXISTS "candidate_last_name" TEXT;
ALTER TABLE "access_invite" ADD COLUMN IF NOT EXISTS "candidate_first_name" TEXT;
ALTER TABLE "access_invite" ADD COLUMN IF NOT EXISTS "candidate_birth_date" DATE;
ALTER TABLE "access_invite" ADD COLUMN IF NOT EXISTS "candidate_position_level" TEXT;
ALTER TABLE "access_invite" ADD COLUMN IF NOT EXISTS "candidate_folder_key" TEXT;

CREATE INDEX IF NOT EXISTS "access_invite_candidate_folder_idx"
  ON "access_invite"("candidate_folder_key");

-- AlterTable
ALTER TABLE "screening_submission" ADD COLUMN IF NOT EXISTS "access_invite_code" TEXT;
ALTER TABLE "screening_submission" ADD COLUMN IF NOT EXISTS "candidate_folder_key" TEXT;

CREATE INDEX IF NOT EXISTS "screening_submission_candidate_folder_idx"
  ON "screening_submission"("candidate_folder_key");
