-- CreateTable
CREATE TABLE IF NOT EXISTS "audit_submission" (
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
    "audit_report" JSONB,

    CONSTRAINT "audit_submission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "audit_submission_session_id_key"
    ON "audit_submission" ("session_id");

CREATE INDEX IF NOT EXISTS "audit_submission_assessee_idx"
    ON "audit_submission" ("assessee_key", "created_at");
