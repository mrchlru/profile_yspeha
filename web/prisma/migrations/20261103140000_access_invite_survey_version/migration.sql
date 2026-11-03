-- AlterTable
ALTER TABLE "access_invite" ADD COLUMN "survey_version_id" TEXT;

-- CreateIndex
CREATE INDEX "access_invite_survey_version_idx" ON "access_invite"("survey_version_id");

-- AddForeignKey
ALTER TABLE "access_invite" ADD CONSTRAINT "access_invite_survey_version_id_fkey" FOREIGN KEY ("survey_version_id") REFERENCES "survey_version"("id") ON DELETE SET NULL ON UPDATE CASCADE;
