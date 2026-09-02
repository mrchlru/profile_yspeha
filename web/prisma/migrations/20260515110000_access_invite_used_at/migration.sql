-- AlterTable
ALTER TABLE "access_invite" ADD COLUMN IF NOT EXISTS "used_at" TIMESTAMP(3);
