-- CreateTable
CREATE TABLE "survey" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Без названия',
    "mode" TEXT NOT NULL DEFAULT 'survey',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "created_by_email" TEXT,
    "current_version_id" TEXT,
    "draft_version_id" TEXT,

    CONSTRAINT "survey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_version" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "survey_id" TEXT NOT NULL,
    "version_number" INTEGER,
    "schema" JSONB NOT NULL,
    "settings" JSONB NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "published_at" TIMESTAMP(3),
    "published_by_email" TEXT,

    CONSTRAINT "survey_version_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_response" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "survey_version_id" TEXT NOT NULL,
    "survey_id" TEXT NOT NULL,
    "access_invite_code" TEXT,
    "employee_folder_key" TEXT,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "source" TEXT NOT NULL DEFAULT 'custom',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submitted_at" TIMESTAMP(3),
    "score" DOUBLE PRECISION,
    "max_score" DOUBLE PRECISION,
    "zone" TEXT,
    "scale_scores" JSONB,

    CONSTRAINT "survey_response_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_answer" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "response_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "is_correct" BOOLEAN,
    "points" DOUBLE PRECISION,
    "graded_by" TEXT,
    "comment" TEXT,

    CONSTRAINT "survey_answer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_file" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "answer_id" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,

    CONSTRAINT "survey_file_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "survey_current_version_id_key" ON "survey"("current_version_id");

-- CreateIndex
CREATE UNIQUE INDEX "survey_draft_version_id_key" ON "survey"("draft_version_id");

-- CreateIndex
CREATE INDEX "survey_status_updated_idx" ON "survey"("status", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "survey_version_survey_number_key" ON "survey_version"("survey_id", "version_number");

-- CreateIndex
CREATE INDEX "survey_version_survey_idx" ON "survey_version"("survey_id");

-- CreateIndex
CREATE INDEX "survey_response_survey_submitted_idx" ON "survey_response"("survey_id", "submitted_at");

-- CreateIndex
CREATE INDEX "survey_response_version_idx" ON "survey_response"("survey_version_id");

-- CreateIndex
CREATE INDEX "survey_answer_response_idx" ON "survey_answer"("response_id");

-- AddForeignKey
ALTER TABLE "survey" ADD CONSTRAINT "survey_current_version_id_fkey" FOREIGN KEY ("current_version_id") REFERENCES "survey_version"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey" ADD CONSTRAINT "survey_draft_version_id_fkey" FOREIGN KEY ("draft_version_id") REFERENCES "survey_version"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_version" ADD CONSTRAINT "survey_version_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_response" ADD CONSTRAINT "survey_response_survey_version_id_fkey" FOREIGN KEY ("survey_version_id") REFERENCES "survey_version"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_response" ADD CONSTRAINT "survey_response_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_answer" ADD CONSTRAINT "survey_answer_response_id_fkey" FOREIGN KEY ("response_id") REFERENCES "survey_response"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_file" ADD CONSTRAINT "survey_file_answer_id_fkey" FOREIGN KEY ("answer_id") REFERENCES "survey_answer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
