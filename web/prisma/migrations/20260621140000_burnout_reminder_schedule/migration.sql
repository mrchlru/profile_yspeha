-- CreateTable
CREATE TABLE "burnout_reminder_schedule" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "assessee_key" TEXT NOT NULL,
    "candidate_folder_key" TEXT,
    "person_name" TEXT NOT NULL,
    "due_at" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "trigger_kind" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "cancel_reason" TEXT,
    "related_invite_code" TEXT,
    "related_submission_session_id" TEXT,

    CONSTRAINT "burnout_reminder_schedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "burnout_reminder_status_due_idx" ON "burnout_reminder_schedule"("status", "due_at");

-- CreateIndex
CREATE INDEX "burnout_reminder_assessee_status_idx" ON "burnout_reminder_schedule"("assessee_key", "status");
