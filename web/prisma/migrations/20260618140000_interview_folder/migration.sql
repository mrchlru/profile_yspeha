CREATE TABLE IF NOT EXISTS "interview_folder" (
  "id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "folder_key" TEXT NOT NULL,
  "position_title" TEXT NOT NULL,
  "first_screening_at" DATE NOT NULL,
  "display_name" TEXT NOT NULL,
  CONSTRAINT "interview_folder_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "interview_folder_folder_key_key"
  ON "interview_folder" ("folder_key");

CREATE INDEX IF NOT EXISTS "interview_folder_first_screening_idx"
  ON "interview_folder" ("first_screening_at");

ALTER TABLE "access_invite"
  ADD COLUMN IF NOT EXISTS "interview_folder_key" TEXT;

CREATE INDEX IF NOT EXISTS "access_invite_interview_folder_idx"
  ON "access_invite" ("interview_folder_key");

ALTER TABLE "screening_submission"
  ADD COLUMN IF NOT EXISTS "interview_folder_key" TEXT;

CREATE INDEX IF NOT EXISTS "screening_submission_interview_folder_idx"
  ON "screening_submission" ("interview_folder_key");
