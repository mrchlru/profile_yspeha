-- CreateTable
CREATE TABLE "prof_sb_education_submission" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "session_id" TEXT NOT NULL,
    "assessee_key" TEXT NOT NULL,
    "assessee_key_version" INTEGER NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "personal_data_consent" BOOLEAN NOT NULL,
    "consent_recorded_at" TIMESTAMP(3) NOT NULL,
    "answers" JSONB NOT NULL,
    "prof_report" JSONB,
    "access_invite_code" TEXT,
    "candidate_folder_key" TEXT,

    CONSTRAINT "prof_sb_education_submission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "prof_sb_education_submission_session_id_key" ON "prof_sb_education_submission"("session_id");

-- CreateIndex
CREATE INDEX "prof_sb_education_submission_assessee_idx" ON "prof_sb_education_submission"("assessee_key", "created_at");

-- CreateIndex
CREATE INDEX "prof_sb_education_submission_candidate_folder_idx" ON "prof_sb_education_submission"("candidate_folder_key");
