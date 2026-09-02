CREATE TABLE "commission_eval_save_failure_log" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "member_last_name" TEXT NOT NULL,
    "member_first_name" TEXT NOT NULL,
    "question_text" TEXT,
    "error_message" TEXT NOT NULL,
    "failure_kind" TEXT NOT NULL,
    "interview_folder_key" TEXT,
    "candidate_folder_key" TEXT,
    "member_id" TEXT,

    CONSTRAINT "commission_eval_save_failure_log_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "commission_eval_save_failure_log_created_idx" ON "commission_eval_save_failure_log"("created_at");
