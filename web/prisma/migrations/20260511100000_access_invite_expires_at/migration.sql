-- AlterTable
ALTER TABLE "access_invite" ADD COLUMN "expires_at" TIMESTAMP(3);

UPDATE "access_invite" SET "expires_at" = "created_at" + INTERVAL '3 days' WHERE "expires_at" IS NULL;

ALTER TABLE "access_invite" ALTER COLUMN "expires_at" SET NOT NULL;
