-- CreateTable
CREATE TABLE "attestation_submission" (
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
    "attestation_report" JSONB,
    "rosenzweig_coding" JSONB,
    "access_invite_code" TEXT,
    "candidate_folder_key" TEXT,

    CONSTRAINT "attestation_submission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "attestation_submission_session_id_key" ON "attestation_submission"("session_id");

-- CreateIndex
CREATE INDEX "attestation_submission_assessee_idx" ON "attestation_submission"("assessee_key", "created_at");

-- CreateIndex
CREATE INDEX "attestation_submission_candidate_folder_idx" ON "attestation_submission"("candidate_folder_key");
