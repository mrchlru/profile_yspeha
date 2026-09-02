CREATE TABLE IF NOT EXISTS "candidate_folder_record" (
  "folder_key" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lifecycle_status" TEXT NOT NULL,
  "last_name" TEXT NOT NULL,
  "first_name" TEXT NOT NULL,
  "middle_name" TEXT,
  "birth_date" DATE NOT NULL,
  "activated_at" TIMESTAMP(3),
  "archived_at" TIMESTAMP(3),
  "archive_reason" TEXT,
  CONSTRAINT "candidate_folder_record_pkey" PRIMARY KEY ("folder_key")
);

CREATE INDEX IF NOT EXISTS "candidate_folder_record_status_idx"
  ON "candidate_folder_record" ("lifecycle_status");

CREATE INDEX IF NOT EXISTS "candidate_folder_record_identity_idx"
  ON "candidate_folder_record" ("last_name", "first_name", "birth_date");
