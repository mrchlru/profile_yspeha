-- Привязка прохождений батареи скрининга (audit submit) к папке кандидата.
ALTER TABLE "audit_submission" ADD COLUMN "candidate_folder_key" TEXT;

CREATE INDEX "audit_submission_candidate_folder_idx" ON "audit_submission"("candidate_folder_key");
