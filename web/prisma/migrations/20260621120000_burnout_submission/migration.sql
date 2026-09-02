-- CreateTable
CREATE TABLE "burnout_submission" (
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
    "burnout_report" JSONB,
    "access_invite_code" TEXT,
    "candidate_folder_key" TEXT,

    CONSTRAINT "burnout_submission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "burnout_submission_session_id_key" ON "burnout_submission"("session_id");

-- CreateIndex
CREATE INDEX "burnout_submission_assessee_idx" ON "burnout_submission"("assessee_key", "created_at");

-- CreateIndex
CREATE INDEX "burnout_submission_candidate_folder_idx" ON "burnout_submission"("candidate_folder_key");
